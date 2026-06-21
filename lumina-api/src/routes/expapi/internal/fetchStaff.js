const BotService = require('../../../database/services/BotService');

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
        // Will receive registers from bot table and send to the client

        let bot = await BotService.getBot();
        if (!bot) {
            return res.status(500).send('Error fetching bot');
        }
        owners = bot.owners || [];
        admins = bot.admins || [];
        moderators = bot.moderators || [];

        return res.status(200).json({
            owners,
            admins,
            moderators
        });
    }
};