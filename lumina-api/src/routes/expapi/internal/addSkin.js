const SkinService    = require('../../../database/services/SkinService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/addskin';

module.exports = {
    route: '/expapi/internal/addskin',
    description: "Add a skin to user inventory",
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
        if (!userId || !skinId)
            return res.status(400).json({ error: 'Parámetros userId e skinId são obrigatórios.', code: 'MISSING_PARAMS' });

        try {
            const result = await SkinService.addSkinToInventory(userId, skinId);
            return res.status(200).json(result);
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'ADD_SKIN_ERROR',
                userMsg: 'Erro ao adicionar skin.', extra: { userId, skinId } });
        }
    }
};
