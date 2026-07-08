const { rollSkin } = require('../../../utils/gachaService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/rollskin';

module.exports = {
    route: '/expapi/internal/rollskin',
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
        const { userId, chestType } = req.body;

        if (!userId || !chestType) {
            return res.status(400).json({ error: 'Parâmetros userId e chestType são obrigatórios.', code: 'MISSING_PARAMS' });
        }

        if (chestType !== 'masterWorkChests' && chestType !== 'hextechChests') {
            return res.status(400).json({ error: 'Tipo de baú inválido.', code: 'INVALID_CHEST_TYPE' });
        }

        try {
            const skin = await rollSkin(userId, chestType);
            if (!skin) {
                return res.status(400).json({ error: 'Sem chaves ou baús suficientes.', code: 'INSUFFICIENT_RESOURCES' });
            }
            return res.status(200).json(skin);
        } catch (error) {
            return routeError({
                res, error,
                route: ROUTE,
                errorCode: 'ROLL_SKIN_ERROR',
                userMsg: 'Erro ao sortear skin.',
                extra: { userId, chestType },
            });
        }
    }
};
