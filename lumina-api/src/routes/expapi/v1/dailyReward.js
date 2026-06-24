const InventoryService = require('../../../database/services/UserInventoryService');
const { resolveDiscordAccount } = require('../../../utils/resolveDiscordAccount');

module.exports = {
    route: '/expapi/v1/dailyreward',
    description: "Resgata a recompensa diária do usuário logado via Discord (dashboard)",
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: true,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const email = req.user.email;

        let discordId;
        try {
            const resolved = await resolveDiscordAccount(email);
            discordId = resolved.discordId;
        } catch (err) {
            const status = err.status || 500;
            const message = err.message || 'Erro ao resolver conta Discord';
            return res.status(status).json({ error: message });
        }

        try {
            const result = await InventoryService.claimDaily(discordId);

            if (!result.claimed) {
                return res.status(429).json({
                    error: 'Você já resgatou sua diária. Tente novamente mais tarde.',
                    nextDailyReward: result.nextDailyReward,
                    streak: result.streak,
                });
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            return res.status(500).json({ error: 'Erro ao resgatar a diária' });
        }
    }
};
