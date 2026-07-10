const GuildService = require('../../../database/services/GuildService');
const { routeError, addLog } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/newguild';

module.exports = {
    route: '/expapi/internal/newguild',
    description: "Create a new guild (idempotent: upsert if bot was re-added)",
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
            // Upsert: se a guilda já existe (bot re-adicionado a um servidor onde
            // já esteve), atualiza os dados ao invés de retornar 409. Retorna 200
            // em ambos os casos (criação nova OU re-adição).
            const existing = await GuildService.getGuildData(guildId);
            if (existing) {
                await GuildService.updateGuildData(guildId, {
                    guildOwnerId: ownerId,
                    guildReferenceName: guildName,
                });
                addLog('API', 'guild.upsert.readded', `Bot re-adicionado à guilda existente ${guildId} (${guildName})`);
                return res.status(200).json({
                    ...existing,
                    guildOwnerId: ownerId,
                    guildReferenceName: guildName,
                    _upserted: true,
                });
            }
            const result = await GuildService.createGuildData({ guildId, guildOwnerId: ownerId, guildReferenceName: guildName });
            addLog('API', 'guild.create', `Nova guilda registrada ${guildId} (${guildName})`);
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
