const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const BadgeService              = require('../../../../database/services/BadgeService');
const UserBadgeService          = require('../../../../database/services/UserBadgeService');
const { routeError }            = require('../../../../logger/logger');

const ROUTE = 'GET /expapi/v1/badges/my';

/**
 * Retorna todas as badges resgatadas pelo usuário autenticado.
 * Usado pelo dashboard para exibir as badges no perfil.
 */
module.exports = {
    route: '/expapi/v1/badges/my',
    description: 'Lista as badges do usuário autenticado',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        const { verifyRequestAuthWithAccountCheck } = require('../../../../utils/authHelpers');
        const { user: decoded, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            // Busca todos os registros de redenção do usuário
            const userBadgeRecords = await UserBadgeService.getByUser(decoded.email);
            if (!userBadgeRecords || userBadgeRecords.length === 0)
                return res.status(200).json({ badges: [] });

            // Para cada redenção, busca os detalhes da badge
            const badges = await Promise.all(
                userBadgeRecords.map(async (record) => {
                    const badge = await BadgeService.getByCode(record.badgeCode);
                    if (!badge) return null; // badge foi deletada
                    return {
                        code: badge.code,
                        name: badge.name,
                        description: badge.description,
                        imageUrl: badge.imageUrl,
                        rarity: badge.rarity,
                        highlightColor: badge.highlightColor,
                        redeemedAt: record.redeemedAt,
                        redeemedVia: record.redeemedVia,
                    };
                })
            );

            // Remove badges deletadas (null) e ordena: mais raras primeiro, depois mais recentes
            const RARITY_ORDER = { mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4 };
            const validBadges = badges.filter(Boolean).sort((a, b) => {
                const rarityDiff = (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5);
                if (rarityDiff !== 0) return rarityDiff;
                return new Date(b.redeemedAt) - new Date(a.redeemedAt);
            });

            return res.status(200).json({ badges: validBadges });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_USER_BADGES_ERROR',
                userMsg: 'Erro ao buscar suas badges.', extra: { email: decoded?.email } });
        }
    }
};
