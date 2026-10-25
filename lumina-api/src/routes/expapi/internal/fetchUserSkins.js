const SkinsService   = require('../../../database/services/SkinService');
const { routeError } = require('../../../logger/logger');
const { ipRateLimiter } = require('../../../utils/ipRateLimiter');

const ROUTE = 'GET|POST /expapi/internal/fetchuserskins';

module.exports = {
    route: '/expapi/internal/fetchuserskins',
    description: "Fetch user skins",
    apiKeyNeeded: false,
    // Public collections are visible; private collections require their owner session.
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
        let userId = req.query.userId || req.body?.userId;
        if (!userId)
            return res.status(400).json({ error: 'Parámetro userId é obrigatório.', code: 'MISSING_USER_ID' });

        if (typeof userId !== 'string' || !/^\d{16,20}$/.test(userId))
            return res.status(400).json({ error: 'Formato de userId inválido.', code: 'INVALID_USER_ID' });

        try {
            const accounts = require('../../../database/services/DashboardAccountService');
            const owner = await accounts.getOne({ $or:[{discordOauth2Id:userId},{'authProviders.discord.providerId':userId}] },{accountId:1,publicProfile:1,banned:1,blocked:1});
            if (owner?.banned || owner?.blocked) return res.status(404).json({error:'Coleção não disponível.',code:'COLLECTION_NOT_FOUND'});
            if (owner && !owner.publicProfile) {
                const auth = await require('../../../utils/authHelpers').verifyRequestAuthWithAccountCheck(req);
                if (auth.error?.status === 503) return res.status(503).json({error:'Consulta temporariamente indisponível.',code:'COLLECTION_UNAVAILABLE'});
                if (auth.account?.accountId !== owner.accountId) return res.status(404).json({error:'Coleção não disponível.',code:'COLLECTION_NOT_FOUND'});
            }
            const skins = await SkinsService.fetchUserSkins(userId);
            return res.status(200).json(skins || []);
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_USER_SKINS_ERROR',
                userMsg: 'Erro ao buscar skins do usuário.', extra: { userId } });
        }
    }
};
