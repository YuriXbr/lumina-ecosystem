const GuildService = require('../../../database/services/GuildService');

// Rota para puxar os dados de uma guilda

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
        try {
            const { guildId } = req.body;
            if (!guildId) {
                return res.status(400).json({ error: 'Parâmetro ausente: guildId é obrigatório.' });
            }

            const guildData = await GuildService.getGuildData(guildId);
            if (!guildData) {
                return res.status(404).json({ error: 'Dados da guilda não encontrados.' });
            }
            
            return res.status(200).json(guildData);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};