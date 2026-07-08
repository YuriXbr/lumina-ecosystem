const SkinsService   = require('../../../database/services/SkinService');
const { routeError } = require('../../../logger/logger');
const { ipRateLimiter } = require('../../../utils/ipRateLimiter');

const ROUTE = 'GET|POST /expapi/internal/fetchuserskins';

module.exports = {
    route: '/expapi/internal/fetchuserskins',
    description: "Fetch user skins",
    apiKeyNeeded: false,
    // Rota INTENCIONALMENTE pública (skins dos usuários são consultáveis publicamente)
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
        let userId = req.query.userId || req.body.userId;
        if (!userId)
            return res.status(400).json({ error: 'Parámetro userId é obrigatório.', code: 'MISSING_USER_ID' });

        userId = userId.toString().replace(/[^0-9]/g, '');
        if (!userId)
            return res.status(400).json({ error: 'Formato de userId inválido.', code: 'INVALID_USER_ID' });

        try {
            const skins = await SkinsService.fetchUserSkins(userId);
            return res.status(200).json(skins || []);
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_USER_SKINS_ERROR',
                userMsg: 'Erro ao buscar skins do usuário.', extra: { userId } });
        }
    }
};
