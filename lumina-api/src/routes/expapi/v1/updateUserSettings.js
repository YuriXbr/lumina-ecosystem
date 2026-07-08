const jwt                       = require('jsonwebtoken');
const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { routeError }            = require('../../../logger/logger');

const ROUTE = 'PUT /expapi/v1/user/settings';

const ALLOWED_LANGUAGES = ['pt-BR','en-US','es-ES'];
const ALLOWED_TIMEZONES = ['America/Sao_Paulo','America/New_York','Europe/London','Asia/Tokyo'];

module.exports = {
    route: '/expapi/v1/user/settings',
    description: "Atualiza as configurações do usuário autenticado",
    apiKeyNeeded: false, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: true,
    checkAuthNeeded: false, 
    method: 'put',

    async execute(req, res) {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ error: 'Token não fornecido.', code: 'MISSING_TOKEN' });

        let decoded;
        try {
            decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ error: 'Token inválido ou expirado.', code: 'INVALID_TOKEN' });
        }

        const { emailNotifications, discordNotifications, botActivityAlerts,
                publicProfile, showOnlineStatus, language, timezone } = req.body;

        if (language && !ALLOWED_LANGUAGES.includes(language))
            return res.status(400).json({ error: 'Idioma inválido.', code: 'INVALID_LANGUAGE' });
        if (timezone && !ALLOWED_TIMEZONES.includes(timezone))
            return res.status(400).json({ error: 'Fuso horário inválido.', code: 'INVALID_TIMEZONE' });

        try {
            const account = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
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
