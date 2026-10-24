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
            const result=await GuildService.upsertMetadata({guildId,ownerId,guildName,memberCount:req.body.memberCount});
            return res.status(200).json(result);
        } catch (error) {
            if(error.status===400)return res.status(400).json({code:error.code,error:error.message});
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
