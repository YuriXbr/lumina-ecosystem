const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const BadgeService              = require('../../../database/services/BadgeService');
const UserBadgeService          = require('../../../database/services/UserBadgeService');
const { routeError, addLog }    = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/redeembadge';
const ACCESS_LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,
    support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };

/**
 * Rota interna para o bot resgatar badges.
 *
 * O bot chama esta rota quando um usuário usa /redeem no Discord.
 * O bot passa o Discord ID do usuário — a API procura a conta vinculada
 * a esse Discord ID e registra a redenção.
 *
 * Body: { discordUserId, code }
 */
module.exports = {
    route: '/expapi/internal/redeembadge',
    description: 'Resgata uma badge via bot (internal)',
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { discordUserId, code } = req.body || {};

        if (!discordUserId || !code)
            return res.status(400).json({ error: 'discordUserId e code são obrigatórios.', code: 'MISSING_PARAMS' });

        try {
            const normalizedCode = String(code).trim().toUpperCase();

            // Busca a conta pelo Discord ID vinculado
            const account = await DashboardAccountService.getOne({ discordOauth2Id: discordUserId });
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada para este Discord ID.', code: 'ACCOUNT_NOT_FOUND' });

            if (account.banned || account.blocked)
                return res.status(403).json({ error: 'Conta suspensa.', code: 'ACCOUNT_SUSPENDED' });

            const badge = await BadgeService.getByCode(normalizedCode);
            if (!badge)
                return res.status(404).json({ error: 'Código de badge inválido.', code: 'BADGE_NOT_FOUND' });

            if (!badge.active)
                return res.status(403).json({ error: 'Esta badge não está mais disponível.', code: 'BADGE_INACTIVE' });

            const now = new Date();

            if (badge.availableFrom && new Date(badge.availableFrom) > now)
                return res.status(403).json({ error: 'Esta badge ainda não está disponível.', code: 'BADGE_NOT_YET_AVAILABLE' });

            if (badge.expiresAt && new Date(badge.expiresAt) < now)
                return res.status(403).json({ error: 'Esta badge expirou.', code: 'BADGE_EXPIRED' });

            const alreadyRedeemed = await UserBadgeService.hasRedeemed(account.email, normalizedCode);
            if (alreadyRedeemed)
                return res.status(409).json({ error: 'Você já resgatou esta badge.', code: 'BADGE_ALREADY_REDEEMED' });

            const userLevel = ACCESS_LEVELS[account.accessType] || 0;
            const requiredLevel = ACCESS_LEVELS[badge.minAccessLevel] || 0;
            if (userLevel < requiredLevel)
                return res.status(403).json({ error: 'Nível de acesso insuficiente.', code: 'INSUFFICIENT_ACCESS_LEVEL' });

            if (badge.maxRedemptions > 0) {
                const currentCount = await UserBadgeService.countByBadge(normalizedCode);
                if (currentCount >= badge.maxRedemptions)
                    return res.status(403).json({ error: 'Limite de resgates atingido.', code: 'BADGE_LIMIT_REACHED' });
            }

            await UserBadgeService.redeem(account.email, normalizedCode, 'bot');

            addLog('API', 'badge.redeem.bot', `Badge ${normalizedCode} resgatada por ${account.email} via bot`);

            return res.status(200).json({
                message: 'Badge resgatada com sucesso!',
                badge: {
                    code: badge.code,
                    name: badge.name,
                    description: badge.description,
                    imageUrl: badge.imageUrl,
                    rarity: badge.rarity,
                    highlightColor: badge.highlightColor,
                },
            });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'REDEEM_BADGE_BOT_ERROR',
                userMsg: 'Erro ao resgatar badge.', extra: { discordUserId } });
        }
    }
};
