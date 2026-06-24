const InventoryService = require('../../../database/services/UserInventoryService');
const { resolveDiscordAccount } = require('../../../utils/resolveDiscordAccount');

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
            let userInventory = await InventoryService.getInventory(discordId);

            if (!userInventory) {
                // Nota: corrigido para passar um objeto ({ userId }) em vez da
                // string crua — InventoryService.create() delega pro
                // mongoose .create(), que espera um documento.
                userInventory = await InventoryService.create({ userId: discordId });
            }

            const nextDailyReward = userInventory.nextDailyReward || null;
            const dailyRewardAvailable = !nextDailyReward || new Date() >= new Date(nextDailyReward);

            return res.status(200).json({
                keys: userInventory.keys || 0,
                masterWorkChests: userInventory.masterWorkChests || 0,
                hextechChests: userInventory.hextechChests || 0,
                dailyRewardAvailable,
                nextDailyReward,
                dailyRewardStreak: userInventory.dailyRewardStreak || 0,
            });
        } catch (error) {
            console.error('Error fetching inventory:', error);
            return res.status(500).send('Error fetching inventory');
        }
    }
}
