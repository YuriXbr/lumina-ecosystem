const InventoryService = require('../../../database/services/UserInventoryService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/claimdaily';

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
            return res.status(400).json({ error: 'Parâmetro userId é obrigatório.', code: 'MISSING_USER_ID' });
        }

        try {
            const result = await InventoryService.claimDaily(userId);

            if (!result.claimed) {
                return res.status(429).json({
                    claimed: false,
                    nextDailyReward: result.nextDailyReward,
                    streak: result.streak,
                    error: 'Recompensa diária já resgatada.',
                    code: 'DAILY_ALREADY_CLAIMED',
                });
            }

            return res.status(200).json(result);
        } catch (error) {
            return routeError({
                res, error,
                route: ROUTE,
                errorCode: 'CLAIM_DAILY_ERROR',
                userMsg: 'Erro ao resgatar recompensa diária.',
                extra: { userId },
            });
        }
    }
};
