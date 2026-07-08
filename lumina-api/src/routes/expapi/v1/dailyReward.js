const InventoryService            = require('../../../database/services/UserInventoryService');
const { resolveDiscordAccount }   = require('../../../utils/resolveDiscordAccount');
const { routeError }              = require('../../../logger/logger');

const ROUTE = 'POST /expapi/v1/dailyreward';

module.exports = {
    route: '/expapi/v1/dailyreward',
    description: "Resgata a recompensa diária do usuário logado via dashboard",
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
            return routeError({ 
                res, 
                error: err,
                route: ROUTE,
                errorCode: err.code || 'RESOLVE_DISCORD_ERROR',
                userMsg: err.message || 'Erro ao resolver conta Discord.',
                status: err.status || 400, 
                extra: { email } 
            });
        }

        try {
            const result = await InventoryService.claimDaily(discordId);
            if (!result.claimed) {
                return res.status(429).json({
                    error: 'Você já resgatou sua diária. Tente novamente mais tarde.',
                    code: 'DAILY_ALREADY_CLAIMED',
                    nextDailyReward: result.nextDailyReward,
                    streak: result.streak,
                });
            }
            return res.status(200).json(result);
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'CLAIM_DAILY_ERROR',
                userMsg: 'Erro ao resgatar a diária.', extra: { email, discordId } });
        }
    }
};
