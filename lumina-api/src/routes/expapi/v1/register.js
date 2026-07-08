const DashboardAccountService = require('../../../database/services/DashboardAccountService.js');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/v1/register';
// Endpointed Checked on V1.2.0
// ALTERADO: respostas sempre em JSON ({ error, code }); limite máximo de senha
// (evita DoS leve via bcrypt em senhas gigantes); sanitização mais robusta de nome/sobrenome.

module.exports = {
    route: '/expapi/v1/register',
    description: 'Dashboard register route',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: true,
    csrfProtectionNeeded: true,
    method: 'post',

    async execute(req, res) {
        const { email, password, firstName, lastName } = req.body;
        const registrationIp = req.ip;
        const registrationUserAgent = req.headers['user-agent'];
        const registrationLocation = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const registrationCountry = req.headers['cf-ipcountry'] || '';
        const registrationCity = '';

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.', code: 'MISSING_FIELDS' });
        }

        if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
            return res.status(400).json({ error: 'A senha deve ter entre 8 e 128 caracteres.', code: 'WEAK_PASSWORD' });
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            return res.status(400).json({ error: 'A senha deve conter maiúscula, minúscula e número.', code: 'WEAK_PASSWORD' });
        }

        const sanitizedEmail = String(email).trim().toLowerCase();
        const sanitizedFirstName = String(firstName).trim().replace(/[<>]/g, '').slice(0, 60);
        const sanitizedLastName = String(lastName).trim().replace(/[<>]/g, '').slice(0, 60);

        if (!sanitizedFirstName || !sanitizedLastName) {
            return res.status(400).json({ error: 'Nome e sobrenome inválidos.', code: 'INVALID_NAME' });
        }

        let account;
        try {
            account = await DashboardAccountService.getDashboardAccountByEmail(sanitizedEmail);
        } catch {
            return res.status(400).json({ error: 'Email inválido.', code: 'INVALID_EMAIL' });
        }

        if (account) {
            // Mensagem genérica para evitar enumeração de contas
            return res.status(400).json({
                error: 'Não foi possível concluir o cadastro. Verifique os dados informados.',
                code: 'REGISTRATION_FAILED'
            });
        }

        try {
            const newAccount = await DashboardAccountService.registerNewDashboardAccount(
                sanitizedEmail, password, sanitizedFirstName, sanitizedLastName,
                registrationIp, registrationUserAgent, registrationLocation,
                registrationCountry, registrationCity
            );
            if (!newAccount) {
                return res.status(500).json({ error: 'Erro ao criar conta.', code: 'SERVER_ERROR' });
            }
            return res.status(200).json({ message: 'Conta criada com sucesso.' });
        } catch (error) {
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
