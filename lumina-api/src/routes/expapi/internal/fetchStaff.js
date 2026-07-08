const BotService     = require('../../../database/services/BotService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'GET /expapi/internal/staff';

module.exports = {
    route: '/expapi/internal/staff',
    description: "Fetch bot staff data",
    apiKeyNeeded: true, 
    internalKeyNeeded: false, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'get',

    async execute(req, res) {
        try {
            const bot = await BotService.getBot();
            if (!bot)
                return res.status(404).json({ error: 'Dados do bot não encontrados.', code: 'BOT_NOT_FOUND' });
            return res.status(200).json({
                owners:     bot.owners     || [],
                admins:     bot.admins     || [],
                moderators: bot.moderators || [],
            });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_STAFF_ERROR',
                userMsg: 'Erro ao buscar dados do staff.' });
        }
    }
};
