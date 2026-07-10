const DashboardAccountService = require('../../../database/services/DashboardAccountService');
const { verifyRequestAuth } = require('../../../utils/authHelpers');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'GET /expapi/v1/session';

/**
 * Retorna o estado da sessão atual baseado no cookie httpOnly (ou header Bearer legado).
 *
 * Usado pelo frontend para saber se está logado e quem é o usuário,
 * SEM precisar ler o JWT do localStorage (que seria vulnerável a XSS).
 *
 * Resposta:
 *   200 { authenticated: true, user: {...} }  — logado
 *   200 { authenticated: false }              — não logado (não usa 401 para
 *                                                o frontend não disparar fetch error)
 */
module.exports = {
    route: '/expapi/v1/session',
    description: 'Retorna estado da sessão atual (cookie-based)',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        try {
            const { user: decoded, error } = verifyRequestAuth(req);

            // Sempre retorna 200 — o frontend decide o que fazer com authenticated
            if (error || !decoded) {
                return res.status(200).json({ authenticated: false });
            }

            // Busca a conta completa para retornar dados atualizados
            const account = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!account) {
                // Conta foi deletada ou email mudou — sessão inválida
                return res.status(200).json({ authenticated: false });
            }

            if (account.banned || account.blocked) {
                return res.status(200).json({
                    authenticated: false,
                    reason: account.banned ? 'ACCOUNT_BANNED' : 'ACCOUNT_BLOCKED',
                });
            }

            return res.status(200).json({
                authenticated: true,
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
                    blocked: account.blocked || false,
                    banned: account.banned || false,
                    emailNotifications: account.emailNotifications ?? true,
                    discordNotifications: account.discordNotifications ?? true,
                    botActivityAlerts: account.botActivityAlerts || false,
                    publicProfile: account.publicProfile || false,
                    showOnlineStatus: account.showOnlineStatus ?? true,
                    language: account.language || 'pt-BR',
                    timezone: account.timezone || 'America/Sao_Paulo',
                    // Identidade pública
                    username: account.username || '',
                    displayName: account.displayName || '',
                    usernameChangedAt: account.usernameChangedAt || null,
                    displayNameChangedAt: account.displayNameChangedAt || null,
                    // Account closure
                    deletionRequestedAt: account.deletionRequestedAt || null,
                    deletionScheduledFor: account.deletionScheduledFor || null,
                    // Discord OAuth scope (para detectar escopo antigo no frontend)
                    discordOauth2TokenScope: account.discordOauth2TokenScope || '',
                },
            });
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'SESSION_CHECK_ERROR',
                userMsg: 'Erro ao verificar sessão.',
            });
        }
    }
};
