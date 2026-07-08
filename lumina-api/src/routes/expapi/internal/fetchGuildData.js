const GuildService   = require('../../../database/services/GuildService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/fetchguilddata';

module.exports = {
    route: '/expapi/internal/fetchguilddata',
    description: "Retrieve guild data",
    apiKeyNeeded: false, 
    internalKeyNeeded: true, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'post',

    async execute(req, res) {
        const { guildId } = req.body;
        if (!guildId)
            return res.status(400).json({ error: 'Parámetro guildId é obrigatório.', code: 'MISSING_GUILD_ID' });

        try {
            const guildData = await GuildService.getGuildData(guildId);
            if (!guildData)
                return res.status(404).json({ error: 'Dados da guilda não encontrados.', code: 'GUILD_NOT_FOUND' });
            return res.status(200).json(guildData);
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_GUILD_ERROR',
                userMsg: 'Erro ao buscar dados da guilda.', extra: { guildId } });
        }
    }
};
