const InventoryService = require('../../../database/services/UserInventoryService');
const { routeError } = require('../../../logger/logger');
const { ipRateLimiter } = require('../../../utils/ipRateLimiter');

const ROUTE = 'GET|POST /expapi/internal/fetchinventory';

module.exports = {
    route: '/expapi/internal/fetchinventory',
    description: "Fetch user inventory",
    apiKeyNeeded: false,
    // Rota INTENCIONALMENTE pública (inventário consultável publicamente)
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'both',
    // Rate limit: 120 req/min por IP — pública mas protegida contra scraping
    rateLimiter: ipRateLimiter({ max: 120, windowMs: 60_000 }),

    async execute(req, res) {
        const userId = req.query.userId || req.body.userId;
        if (!userId) {
            return res.status(400).json({ error: 'Parámetro userId é obrigatório.', code: 'MISSING_USER_ID' });
        }
        try {
            const inventory = await InventoryService.getInventory(userId);
            if (!inventory) {
                return res.status(404).json({ error: 'Inventário não encontrado.', code: 'INVENTORY_NOT_FOUND' });
            }
            return res.status(200).json(inventory);
        } catch (error) {
            return routeError({
                res, error,
                route: ROUTE,
                errorCode: 'FETCH_INVENTORY_ERROR',
                userMsg: 'Erro ao buscar inventário.',
                extra: { userId },
            });
        }
    }
};
