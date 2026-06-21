const SkinService = require('../../../database/services/SkinService');
// Endpointed Checked on V1.2.0

module.exports = {
    route: '/expapi/internal/addskin',
    description: "Roll a skin",
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { userId, skinId } = req.body;

        if (!userId || !skinId) {
            return res.status(400).send('Missing parameters');
        }

        try {
             userInventory = await SkinService.addSkinToInventory(userId, skinId);
             
            return res.status(200).send(userInventory);
        } catch (error) {
            console.error('Error adding skin:', error);
            res.status(500).send('Error adding skin');
        }
    }
};