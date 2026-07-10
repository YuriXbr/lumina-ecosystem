const DashboardAccountService = require('../../../database/services/DashboardAccountService');
const { verifyRequestAuth, verifyRequestAuthWithAccountCheck } = require('../../../utils/authHelpers');
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
            // Sempre retorna 200 — o frontend decide o que fazer com authenticated.
            // Não usamos verifyRequestAuthWithAccountCheck diretamente porque
            // ele retornaria erro 401 quando não há token; session.js precisa
            // devolver 200 { authenticated: false } nesse caso.
            const { error } = verifyRequestAuth(req);
            if (error || !verifyRequestAuth(req).user) {
                return res.status(200).json({ authenticated: false });
            }

            // Usa a versão com checagem de conta para validar banned/blocked
            // e já receber o account populado.
            const { account, error: authError } = await verifyRequestAuthWithAccountCheck(req);

            // Token inválido/expirado → não autenticado (sem 401)
            if (authError && authError.status === 401) {
                return res.status(200).json({ authenticated: false });
            }
            // Conta banida/bloqueada → authenticated:false com reason
            if (authError && (authError.code === 'ACCOUNT_BANNED' || authError.code === 'ACCOUNT_BLOCKED')) {
                return res.status(200).json({
                    authenticated: false,
                    reason: authError.code,
                });
            }
            if (authError || !account) {
                return res.status(200).json({ authenticated: false });
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
