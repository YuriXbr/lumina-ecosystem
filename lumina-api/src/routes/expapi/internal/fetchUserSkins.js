const SkinsService = require('../../../database/services/SkinService');
// Endpointed Checked on V1.2.0

module.exports = {
    route: '/expapi/internal/fetchuserskins',
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
            return res.status(400).json({ error: 'Missing parameters' });
        }

        // Sanitização básica do userId para prevenir injection
        userId = userId.toString().replace(/[^0-9]/g, '');
        
        if (!userId || userId.length === 0) {
            return res.status(400).json({ error: 'Invalid userId format' });
        }

        try {
            const inventory = await SkinsService.fetchUserSkins(userId);
            return res.status(200).json(inventory || []);
        } catch (error) {
            console.error('Error fetching inventory:', error);
            return res.status(500).json({ error: 'Error fetching inventory' });
        }
    }
};