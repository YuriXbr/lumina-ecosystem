const DashboardAccountService = require('../../../database/services/DashboardAccountService.js');
const { routeError, addLog }  = require('../../../logger/logger');
const {
    validateUsername, validateDisplayName, normalizeUsername
} = require('../../../utils/identityValidation');

const ROUTE = 'POST /expapi/v1/register';

module.exports = {
    route: '/expapi/v1/register',
    description: 'Dashboard register route (com username + displayName)',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: true,
    csrfProtectionNeeded: true,
    method: 'post',

    async execute(req, res) {
        const { email, password, firstName, lastName, username, displayName } = req.body || {};
        const registrationIp = req.ip;
        const registrationUserAgent = req.headers['user-agent'];
        const registrationLocation = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const registrationCountry = req.headers['cf-ipcountry'] || '';
        const registrationCity = '';

        // ─── Campos obrigatórios básicos ────────────────────────────────────
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                error: 'Email, senha, nome e sobrenome são obrigatórios.',
                code: 'MISSING_FIELDS'
            });
        }

        // ─── Validação de senha ─────────────────────────────────────────────
        if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
            return res.status(400).json({ error: 'A senha deve ter entre 8 e 128 caracteres.', code: 'WEAK_PASSWORD' });
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
            return res.status(400).json({ error: 'A senha deve conter maiúscula, minúscula e número.', code: 'WEAK_PASSWORD' });
        }

        // ─── Sanitização de nome/sobrenome ──────────────────────────────────
        const sanitizedEmail = String(email).trim().toLowerCase();
        const sanitizedFirstName = String(firstName).trim().replace(/[<>]/g, '').slice(0, 60);
        const sanitizedLastName = String(lastName).trim().replace(/[<>]/g, '').slice(0, 60);
        if (!sanitizedFirstName || !sanitizedLastName) {
            return res.status(400).json({ error: 'Nome e sobrenome inválidos.', code: 'INVALID_NAME' });
        }

        // ─── Validação de username (obrigatório no novo fluxo) ──────────────
        if (!username || typeof username !== 'string') {
            return res.status(400).json({
                error: 'Username é obrigatório. Escolha um handle único (4-16 caracteres, letras, números e _).',
                code: 'MISSING_USERNAME'
            });
        }
        const usernameV = validateUsername(username);
        if (!usernameV.valid) {
            return res.status(400).json({ error: usernameV.error, code: 'INVALID_USERNAME' });
        }

        // ─── Validação de displayName (opcional — default = firstName) ──────
        // Audit #3: usamos a versão sanitized retornada por validateDisplayName
        // para garantir que zero-width chars nunca cheguem ao banco.
        const rawDisplayName = (displayName && String(displayName).trim()) || sanitizedFirstName;
        const displayV = validateDisplayName(rawDisplayName);
        if (!displayV.valid) {
            return res.status(400).json({ error: displayV.error, code: 'INVALID_DISPLAY_NAME' });
        }
        const sanitizedDisplayName = displayV.sanitized.trim();

        // ─── Verifica se email já existe (catch trata DB errors como erro genérico) ───
        let account;
        try {
            account = await DashboardAccountService.getDashboardAccountByEmail(sanitizedEmail);
        } catch (dbErr) {
            // Diferencia erro de sintaxe de email de erro de DB
            if (dbErr.message === 'Invalid email syntax') {
                return res.status(400).json({ error: 'Email inválido.', code: 'INVALID_EMAIL' });
            }
            return routeError({
                res, error: dbErr, route: ROUTE,
                errorCode: 'REGISTRATION_DB_ERROR',
                userMsg: 'Erro interno ao verificar email. Tente novamente.',
                extra: { email: sanitizedEmail },
            });
        }

        if (account) {
            // Mensagem genérica para evitar enumeração de contas
            return res.status(400).json({
                error: 'Não foi possível concluir o cadastro. Verifique os dados informados.',
                code: 'REGISTRATION_FAILED'
            });
        }

        // ─── Verifica disponibilidade do username ───────────────────────────
        const usernameAvailable = await DashboardAccountService.isUsernameAvailable(username, null);
        if (!usernameAvailable) {
            return res.status(409).json({
                error: 'Este username já está em uso. Escolha outro.',
                code: 'USERNAME_TAKEN'
            });
        }

        // ─── Cria a conta com username + displayName ATÔMICOS ───────────────
        // Audit #5: antes o fluxo era create → update (duas chamadas), o que
        // abria uma race condition onde dois registros simultâneos podiam
        // passar pela checagem de username disponível e depois um falhava ao
        // tentar gravar o username duplicado. Agora username/displayName vão
        // direto no create, e o índice unique sparse em usernameLower ainda
        // protege contra duplicatas — caso aconteça, o erro 11000 do Mongo
        // é capturado abaixo e retornado como USERNAME_TAKEN.
        try {
            const newAccount = await DashboardAccountService.registerNewDashboardAccount(
                sanitizedEmail, password, sanitizedFirstName, sanitizedLastName,
                registrationIp, registrationUserAgent, registrationLocation,
                registrationCountry, registrationCity,
                {
                    username,
                    usernameLower: normalizeUsername(username),
                    displayName: sanitizedDisplayName,
                }
            );
            if (!newAccount) {
                return res.status(500).json({ error: 'Erro ao criar conta.', code: 'SERVER_ERROR' });
            }

            addLog('API', 'register.success', `Conta criada: ${sanitizedEmail}`, {
                userEmail: sanitizedEmail,
                extra: { username },
            });

            return res.status(200).json({
                message: 'Conta criada com sucesso.',
                username,
                displayName: sanitizedDisplayName,
            });
        } catch (error) {
            // Audit #5: trata race condition de username duplicado via índice
            // unique do Mongo — retorna 409 USERNAME_TAKEN em vez de 500.
            if (error && (error.code === 11000 || error.codeName === 'DuplicateKey') && /username/i.test(error.message || '')) {
                return res.status(409).json({
                    error: 'Este username já está em uso. Escolha outro.',
                    code: 'USERNAME_TAKEN',
                });
            }
            if (error.code === 'WEAK_PASSWORD') {
                return res.status(400).json({ error: 'Senha fraca.', code: 'WEAK_PASSWORD' });
            }
            return routeError({
                res, error,
                route: ROUTE,
                errorCode: 'REGISTRATION_ERROR',
                userMsg: 'Não foi possível concluir o cadastro. Verifique os dados informados.',
                extra: { email: sanitizedEmail },
            });
        }
    }
};
