const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const BadgeService              = require('../../../../database/services/BadgeService');
const UserBadgeService          = require('../../../../database/services/UserBadgeService');
const { routeError }            = require('../../../../logger/logger');

const ROUTE = 'GET /expapi/v1/badges/user/:identifier';

/**
 * Retorna as badges públicas de um usuário (para exibição no perfil público).
 *
 * O identifier pode ser: accountId, username, ou Discord ID.
 * Só retorna badges se o usuário tiver publicProfile = true.
 */
module.exports = {
    route: '/expapi/v1/badges/user/:identifier',
    description: 'Lista as badges públicas de um usuário',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        const { identifier } = req.params;
        if (!identifier)
            return res.status(400).json({ error: 'Identificador é obrigatório.', code: 'MISSING_IDENTIFIER' });

        try {
            // Busca a conta por username, accountId, ou discordOauth2Id
            let account = null;
            if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
                // MongoDB ObjectId — busca por accountId
                account = await DashboardAccountService.getOne({ accountId: identifier });
            }
            if (!account) {
                // Tenta por username
                account = await DashboardAccountService.getOne({ username: identifier.toLowerCase() });
            }
            if (!account) {
                // Tenta por Discord ID
                account = await DashboardAccountService.getOne({ discordOauth2Id: identifier });
            }

            if (!account)
                return res.status(404).json({ error: 'Usuário não encontrado.', code: 'USER_NOT_FOUND' });

            // Só mostra badges se o perfil for público
            if (account.publicProfile === false)
                return res.status(403).json({ error: 'Perfil privado.', code: 'PROFILE_PRIVATE' });

            // Busca as badges do usuário
            const userBadgeRecords = await UserBadgeService.getByUser(account.email);
            if (!userBadgeRecords || userBadgeRecords.length === 0)
                return res.status(200).json({ badges: [], username: account.username, displayName: account.displayName });

            const badges = await Promise.all(
                userBadgeRecords.map(async (record) => {
                    const badge = await BadgeService.getByCode(record.badgeCode);
                    if (!badge || !badge.active) return null;
                    return {
                        code: badge.code,
                        name: badge.name,
                        description: badge.description,
                        imageUrl: badge.imageUrl,
                        rarity: badge.rarity,
                        highlightColor: badge.highlightColor,
                        redeemedAt: record.redeemedAt,
                    };
                })
            );

            const RARITY_ORDER = { mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4 };
            const validBadges = badges.filter(Boolean).sort((a, b) => {
                const rarityDiff = (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5);
                if (rarityDiff !== 0) return rarityDiff;
                return new Date(b.redeemedAt) - new Date(a.redeemedAt);
            });

            return res.status(200).json({
                badges: validBadges,
                username: account.username,
                displayName: account.displayName,
            });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_PUBLIC_BADGES_ERROR',
                userMsg: 'Erro ao buscar badges do usuário.', extra: { identifier } });
        }
    }
};
