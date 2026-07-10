const InventoryService            = require('../../../database/services/UserInventoryService');
const { resolveDiscordAccount }   = require('../../../utils/resolveDiscordAccount');
const { routeError }              = require('../../../logger/logger');

const ROUTE = 'GET /expapi/v1/myinventory';

module.exports = {
    route: '/expapi/v1/myinventory',
    description: "Retorna chaves e baús do usuário logado (dashboard)",
    apiKeyNeeded: false, 
    internalKeyNeeded: false, 
    jwtNeeded: true,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'get',

    async execute(req, res) {
        const email = req.user?.email;
        if (!email) {
            return res.status(401).json({ error: 'Token não fornece email válido.', code: 'INVALID_TOKEN' });
        }

        let discordId;
        try {
            const resolved = await resolveDiscordAccount(email);
            discordId = resolved.discordId;
        } catch (err) {
            return res.status(err.status || 400).json({
                error: err.message || 'Erro ao resolver conta Discord.',
                code: err.code || 'RESOLVE_DISCORD_ERROR',
            });
        }

        try {
            let inv = await InventoryService.getInventory(discordId);
            if (!inv) inv = await InventoryService.create({ userId: discordId });

            const nextDailyReward = inv.nextDailyReward || null;
            return res.status(200).json({
                keys: inv.keys || 0,
                masterWorkChests: inv.masterWorkChests || 0,
                hextechChests: inv.hextechChests || 0,
                dailyRewardAvailable: !nextDailyReward || new Date() >= new Date(nextDailyReward),
                nextDailyReward,
                dailyRewardStreak: inv.dailyRewardStreak || 0,
            });
        } catch (error) {
            return routeError({ 
                res, 
                error, 
                route: ROUTE, 
                errorCode: 'FETCH_INVENTORY_ERROR',
                userMsg: 'Erro ao buscar inventário.', 
                extra: { email, discordId } 
            });
        }
    }
};
