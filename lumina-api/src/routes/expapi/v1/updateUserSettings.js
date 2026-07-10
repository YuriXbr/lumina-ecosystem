const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { routeError }            = require('../../../logger/logger');

const ROUTE = 'PUT /expapi/v1/user/profile';

const ALLOWED_LANGUAGES = ['pt-BR','en-US','es-ES'];
const ALLOWED_TIMEZONES = ['America/Sao_Paulo','America/New_York','Europe/London','Asia/Tokyo'];

module.exports = {
    // Frontend chama PUT /expapi/v1/user/profile. Mantemos o route path
    // correspondente ao que o frontend espera. (Alias legado: /user/settings
    // continua funcionando graças ao arquivo legado — ver index.js loadRoutes.)
    route: '/expapi/v1/user/profile',
    description: "Atualiza as configurações do usuário autenticado (PUT /user/profile)",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'put',

    async execute(req, res) {
        const { verifyRequestAuthWithAccountCheck } = require('../../../utils/authHelpers');
        const { user: decoded, account, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        const { emailNotifications, discordNotifications, botActivityAlerts,
                publicProfile, showOnlineStatus, language, timezone } = req.body;

        if (language && !ALLOWED_LANGUAGES.includes(language))
            return res.status(400).json({ error: 'Idioma inválido.', code: 'INVALID_LANGUAGE' });
        if (timezone && !ALLOWED_TIMEZONES.includes(timezone))
            return res.status(400).json({ error: 'Fuso horário inválido.', code: 'INVALID_TIMEZONE' });

        try {
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            const updateData = {};
            if (typeof emailNotifications   === 'boolean') updateData.emailNotifications   = emailNotifications;
            if (typeof discordNotifications === 'boolean') updateData.discordNotifications = discordNotifications;
            if (typeof botActivityAlerts    === 'boolean') updateData.botActivityAlerts    = botActivityAlerts;
            if (typeof publicProfile        === 'boolean') updateData.publicProfile        = publicProfile;
            if (typeof showOnlineStatus     === 'boolean') updateData.showOnlineStatus     = showOnlineStatus;
            if (language)  updateData.language = language;
            if (timezone)  updateData.timezone = timezone;

            await DashboardAccountService.update({ email: decoded.email }, { $set: updateData });
            return res.status(200).json({ message: 'Configurações atualizadas com sucesso.' });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'UPDATE_SETTINGS_ERROR',
                userMsg: 'Erro ao atualizar configurações.', extra: { email: decoded?.email } });
        }
    }
};
