const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { routeError }            = require('../../../logger/logger');

const ROUTE = 'GET /expapi/v1/user/profile';

module.exports = {
    route: '/expapi/v1/user/profile',
    description: "Busca informações do perfil do usuário autenticado",
    apiKeyNeeded: false, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'get',

    async execute(req, res) {
        const { verifyRequestAuthWithAccountCheck } = require('../../../utils/authHelpers');
        const { user: decoded, account, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            return res.status(200).json({
                accountId: account.accountId, firstName: account.firstName, lastName: account.lastName,
                email: account.email, accessType: account.accessType || 'user',
                emailVerified: account.emailVerified || false,
                discordOauth2Id: account.discordOauth2Id || '',
                hasPassword: !!account.password,
                authProviders: Object.keys(account.authProviders || {}),
                id: account.discordOauth2Id || '', avatar: account.discordAvatar || '',
                registrationDate: account.registrationDate, lastLogin: account.lastLogin,
                blocked: account.blocked || false, banned: account.banned || false,
                emailNotifications: account.emailNotifications ?? true,
                discordNotifications: account.discordNotifications ?? true,
                botActivityAlerts: account.botActivityAlerts || false,
                publicProfile: account.publicProfile || false,
                showOnlineStatus: account.showOnlineStatus ?? true,
                language: account.language || 'en-US',
                timezone: account.timezone || 'America/Sao_Paulo',
                // Identidade publica (redesign)
                username: account.username || '',
                displayName: account.displayName || '',
                usernameChangedAt: account.usernameChangedAt || null,
                displayNameChangedAt: account.displayNameChangedAt || null,
                deletionRequestedAt: account.deletionRequestedAt || null,
                deletionScheduledFor: account.deletionScheduledFor || null,
            });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_PROFILE_ERROR',
                userMsg: 'Erro ao buscar perfil do usuário.', extra: { email: decoded?.email } });
        }
    }
};
