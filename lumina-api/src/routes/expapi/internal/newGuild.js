const GuildService = require('../../../database/services/GuildService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/newguild';

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
        if (!guildId || !ownerId || !guildName) {
            return res.status(400).json({ error: 'Parámetros guildId, ownerId e guildName são obrigatórios.', code: 'MISSING_PARAMS' });

        }
        try {
            const existing = await GuildService.getGuildData(guildId);
            if (existing) {
                return res.status(409).json({ error: 'Guilda já existe.', code: 'GUILD_ALREADY_EXISTS' });
            }
            const result = await GuildService.createGuildData({ guildId, guildOwnerId: ownerId, guildReferenceName: guildName });
            return res.status(200).json(result);
        } catch (error) {
            return routeError({
                res, error,
                route: ROUTE,
                errorCode: 'CREATE_GUILD_ERROR',
                userMsg: 'Erro ao criar guild.',
                extra: { guildId, ownerId, guildName },
            });
        }
    },
};
