const GuildService = require('../../../database/services/GuildService');

// filepath: /C:/Users/claud/OneDrive/Desktop/[ COISAS ]/[ DEV ]/lumina/lumina-api/src/routes/expapi/internal/updateGuildData.js

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
        try {
            const { guildId, ...data } = req.body;
            if (!guildId) {
                return res.status(400).json({ error: 'Parâmetro ausente: guildId é obrigatório.' });
            }

            const updatedGuild = await GuildService.updateGuildData(guildId, data);
            return res.status(200).json({ message: 'Dados da guilda atualizados com sucesso.', updatedGuild });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
};