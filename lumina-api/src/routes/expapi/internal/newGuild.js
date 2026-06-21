const GuildService = require('../../../database/services/GuildService');

module.exports = {
    route: '/expapi/internal/newguild',
    description: "Create a new guild",
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { guildId, ownerId, guildName } = req.body;
        const guildData = { guildId, guildOwnerId: ownerId, guildReferenceName: guildName };
        try {
            const result = await GuildService.createGuildData(guildData);
            return res.status(200).json(result);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
    },
};