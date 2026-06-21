const InventoryService = require('../../../database/services/UserInventoryService');
// Endpointed Checked on V1.2.0

module.exports = {
    route: '/expapi/internal/fetchinventory',
    description: "Fetch user inventory",
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'both',

    async execute(req, res) {
        let userId = req.query.userId || req.body.userId;

        if (!userId) {
            return res.status(400).send('Missing parameters');
        }

        try {
            const inventory = await InventoryService.getInventory(userId);
            return res.status(200).send(inventory);
        } catch (error) {
            console.error('Error fetching inventory:', error);
            return res.status(500).send('Error fetching inventory');
        }
    }
};