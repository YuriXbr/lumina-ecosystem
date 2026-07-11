const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const BadgeService              = require('../../../../database/services/BadgeService');
const UserBadgeService          = require('../../../../database/services/UserBadgeService');
const { routeError }            = require('../../../../logger/logger');

const ROUTE = 'GET /expapi/v1/admin/badges';
const ACCESS_LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,
    support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };

/**
 * Lista todas as badges (admin+) com contagem de resgates.
 */
module.exports = {
    route: '/expapi/v1/admin/badges',
    description: 'Lista todas as badges (admin+)',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        const { verifyRequestAuthWithAccountCheck } = require('../../../../utils/authHelpers');
        const { user: decoded, account: adminAccount, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            if (!adminAccount)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });
            if (adminAccount.banned || adminAccount.blocked)
                return res.status(403).json({ error: 'Conta suspensa.', code: 'ACCOUNT_SUSPENDED' });

            const adminLevel = ACCESS_LEVELS[adminAccount.accessType] || 0;
            if (adminLevel < 7)
                return res.status(403).json({ error: 'Permissão insuficiente.', code: 'INSUFFICIENT_PERMISSION' });

            const badges = await BadgeService.getAll();

            // Adiciona contagem de resgates para cada badge
            const badgesWithCount = await Promise.all(
                (badges || []).map(async (badge) => {
                    const redemptionCount = await UserBadgeService.countByBadge(badge.code);
                    return {
                        code: badge.code,
                        name: badge.name,
                        description: badge.description,
                        imageUrl: badge.imageUrl,
                        rarity: badge.rarity,
                        highlightColor: badge.highlightColor,
                        availableFrom: badge.availableFrom,
                        expiresAt: badge.expiresAt,
                        maxRedemptions: badge.maxRedemptions,
                        minAccessLevel: badge.minAccessLevel,
                        active: badge.active,
                        createdBy: badge.createdBy,
                        createdAt: badge.createdAt,
                        redemptionCount,
                    };
                })
            );

            // Ordena: mais recentes primeiro
            badgesWithCount.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return res.status(200).json({ badges: badgesWithCount });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_BADGES_ERROR',
                userMsg: 'Erro ao buscar badges.', extra: { email: decoded?.email } });
        }
    }
};
