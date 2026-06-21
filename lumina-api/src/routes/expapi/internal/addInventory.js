const InventoryService = require('../../../database/services/UserInventoryService');
// Endpointed Checked on V1.2.0

module.exports = {
    route: '/expapi/internal/addinventory',
    description: "Add item to user inventory",
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { userId, item, amount } = req.body;

        if ( !userId || !item || !amount ) {
            return res.status(400).send('Missing parameters');
        }

        try {
            await InventoryService.addInventory(userId, item, amount);
            res.status(200).send('Inventory updated');
        } catch (error) {
            console.error('Error updating inventory:', error);
            res.status(500).send('Error updating inventory');
        }
    
    }
};