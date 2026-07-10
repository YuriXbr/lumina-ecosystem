const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../database/services/DashboardAccountService');
const { setAuthCookie, verifyRequestAuth } = require('../../../utils/authHelpers');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/v1/exchange-token';

/**
 * Recebe um JWT no body e seta o cookie httpOnly.
 *
 * Resolve o problema do OAuth callback em desenvolvimento:
 * - O callback OAuth roda em localhost:3000 (domínio da API)
 * - O dashboard roda em localhost:5173 (com proxy Vite)
 * - O cookie setado pelo callback em localhost:3000 não é acessível
 *   pelas requisições feitas via proxy em localhost:5173
 *
 * Com este endpoint, o frontend recebe o token da URL fragment e
 * faz um POST (através do proxy, same-origin) para setar o cookie
 * no domínio correto.
 */
module.exports = {
    route: '/expapi/v1/exchange-token',
    description: 'Troca um JWT por um cookie httpOnly (resolve cross-origin em dev)',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { token } = req.body || {};

        if (!token) {
            return res.status(400).json({ error: 'Token é obrigatório.', code: 'MISSING_TOKEN' });
        }

        try {
            // Verifica o JWT
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } catch {
                return res.status(401).json({ error: 'Token inválido ou expirado.', code: 'INVALID_TOKEN' });
            }

            // Busca a conta para retornar dados atualizados
            const account = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!account) {
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });
            }

            if (account.banned) {
                return res.status(403).json({ error: 'Esta conta foi banida.', code: 'ACCOUNT_BANNED' });
            }
            if (account.blocked) {
                return res.status(403).json({ error: 'Esta conta está bloqueada.', code: 'ACCOUNT_BLOCKED' });
            }

            // Seta o cookie httpOnly — agora no domínio correto (same-origin via proxy)
            setAuthCookie(res, token);

            // Retorna o user object para o frontend não precisar chamar /session
            return res.status(200).json({
                ok: true,
                user: {
                    accountId: account.accountId,
                    firstName: account.firstName,
                    lastName: account.lastName,
                    email: account.email,
                    accessType: account.accessType || 'user',
                    emailVerified: account.emailVerified || false,
                    discordOauth2Id: account.discordOauth2Id || '',
                    hasPassword: !!account.password,
                    authProviders: Object.keys(account.authProviders || {}),
                    id: account.discordOauth2Id || '',
                    avatar: account.discordAvatar || '',
                    registrationDate: account.registrationDate,
                    lastLogin: account.lastLogin,
                    blocked: false,
                    banned: false,
                    emailNotifications: account.emailNotifications ?? true,
                    discordNotifications: account.discordNotifications ?? true,
                    botActivityAlerts: account.botActivityAlerts || false,
                    publicProfile: account.publicProfile || false,
                    showOnlineStatus: account.showOnlineStatus ?? true,
                    language: account.language || 'pt-BR',
                    timezone: account.timezone || 'America/Sao_Paulo',
                    username: account.username || '',
                    displayName: account.displayName || '',
                    usernameChangedAt: account.usernameChangedAt || null,
                    displayNameChangedAt: account.displayNameChangedAt || null,
                    deletionRequestedAt: account.deletionRequestedAt || null,
                    deletionScheduledFor: account.deletionScheduledFor || null,
                    discordOauth2TokenScope: account.discordOauth2TokenScope || '',
                },
            });
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'EXCHANGE_TOKEN_ERROR',
                userMsg: 'Erro ao trocar token por cookie.',
            });
        }
    }
};
