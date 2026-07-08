const GuildService   = require('../../../database/services/GuildService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/updateguilddata';

module.exports = {
    route: '/expapi/internal/updateguilddata',
    description: "Atualiza os dados da guilda",
    apiKeyNeeded: false, 
    internalKeyNeeded: true, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'post',

    async execute(req, res) {
        const { guildId, ...data } = req.body;
        if (!guildId)
            return res.status(400).json({ error: 'Parámetro guildId é obrigatório.', code: 'MISSING_GUILD_ID' });

        try {
            const updatedGuild = await GuildService.updateGuildData(guildId, data);
            return res.status(200).json({ message: 'Dados da guilda atualizados com sucesso.', updatedGuild });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'UPDATE_GUILD_ERROR',
                userMsg: 'Erro ao atualizar dados da guilda.', extra: { guildId } });
        }
    },
};
