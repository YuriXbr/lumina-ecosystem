const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { routeError }            = require('../../../logger/logger');

const ROUTE = 'GET /expapi/v1/user/settings';

module.exports = {
    route: '/expapi/v1/user/settings',
    description: "Busca as configurações do usuário autenticado",
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
                emailNotifications:   account.emailNotifications   ?? true,
                discordNotifications: account.discordNotifications  ?? true,
                botActivityAlerts:    account.botActivityAlerts     || false,
                publicProfile:        account.publicProfile         || false,
                showOnlineStatus:     account.showOnlineStatus      ?? true,
                language:             account.language              || 'pt-BR',
                timezone:             account.timezone              || 'America/Sao_Paulo',
            });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_SETTINGS_ERROR',
                userMsg: 'Erro ao buscar configurações do usuário.', extra: { email: decoded?.email } });
        }
    }
};
