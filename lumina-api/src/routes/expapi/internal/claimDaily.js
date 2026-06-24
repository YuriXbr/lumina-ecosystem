const InventoryService = require('../../../database/services/UserInventoryService');

module.exports = {
    route: '/expapi/internal/claimdaily',
    description: "Resgata a recompensa diária do usuário (chamado pelo bot via /daily)",
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).send('Missing parameters');
        }

        try {
            const result = await InventoryService.claimDaily(userId);

            if (!result.claimed) {
                return res.status(429).json({
                    claimed: false,
                    nextDailyReward: result.nextDailyReward,
                    streak: result.streak,
                });
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            return res.status(500).send('Error claiming daily reward');
        }
    }
};
