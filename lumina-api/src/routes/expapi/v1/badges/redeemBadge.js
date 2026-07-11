const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const BadgeService              = require('../../../../database/services/BadgeService');
const UserBadgeService          = require('../../../../database/services/UserBadgeService');
const { routeError, addLog }    = require('../../../../logger/logger');

const ROUTE = 'POST /expapi/v1/badges/redeem';
const ACCESS_LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,
    support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };

/**
 * Resgata uma badge via código.
 *
 * Validações (em ordem):
 *   1. Código existe e está ativo
 *   2. Badge está dentro da janela de resgate (availableFrom ≤ now < expiresAt)
 *   3. Usuário ainda não resgatou esta badge
 *   4. Usuário tem o accessLevel mínimo exigido
 *   5. Limite de resgates ainda não foi atingido
 *
 * Body: { code: "BETA2025" }
 */
module.exports = {
    route: '/expapi/v1/badges/redeem',
    description: 'Resgata uma badge via código',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { verifyRequestAuthWithAccountCheck } = require('../../../../utils/authHelpers');
        const { user: decoded, account, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });
            if (account.banned || account.blocked)
                return res.status(403).json({ error: 'Conta suspensa.', code: 'ACCOUNT_SUSPENDED' });

            const { code } = req.body;
            if (!code || typeof code !== 'string')
                return res.status(400).json({ error: 'Código é obrigatório.', code: 'MISSING_CODE' });

            const normalizedCode = code.trim().toUpperCase();
            const badge = await BadgeService.getByCode(normalizedCode);

            if (!badge)
                return res.status(404).json({ error: 'Código de badge inválido.', code: 'BADGE_NOT_FOUND' });

            if (!badge.active)
                return res.status(403).json({ error: 'Esta badge não está mais disponível.', code: 'BADGE_INACTIVE' });

            const now = new Date();

            // 2. Janela de resgate
            if (badge.availableFrom && new Date(badge.availableFrom) > now)
                return res.status(403).json({ error: 'Esta badge ainda não está disponível para resgate.', code: 'BADGE_NOT_YET_AVAILABLE' });

            if (badge.expiresAt && new Date(badge.expiresAt) < now)
                return res.status(403).json({ error: 'Esta badge expirou.', code: 'BADGE_EXPIRED' });

            // 3. Já resgatou?
            // Race condition fix: rely on unique compound index (userEmail+badgeCode)
            // instead of check-then-insert. Try insert directly and catch duplicate.

            // 4. Access level mínimo
            const userLevel = ACCESS_LEVELS[account.accessType] || 0;
            const requiredLevel = ACCESS_LEVELS[badge.minAccessLevel] || 0;
            if (userLevel < requiredLevel)
                return res.status(403).json({ error: 'Você não tem o nível de acesso necessário para esta badge.', code: 'INSUFFICIENT_ACCESS_LEVEL' });

            // 5. Limite de resgates
            if (badge.maxRedemptions > 0) {
                const currentCount = await UserBadgeService.countByBadge(normalizedCode);
                if (currentCount >= badge.maxRedemptions)
                    return res.status(403).json({ error: 'Limite de resgates desta badge atingido.', code: 'BADGE_LIMIT_REACHED' });
            }

            // Tudo OK — registra a redenção
            try {
                await UserBadgeService.redeem(decoded.email, normalizedCode, 'dashboard');
            } catch (redeemErr) {
                if (redeemErr.code === 11000) {
                    return res.status(409).json({ error: 'Você já resgatou esta badge.', code: 'BADGE_ALREADY_REDEEMED' });
                }
                throw redeemErr;
            }

            addLog('API', 'badge.redeem', `Badge ${normalizedCode} resgatada por ${decoded.email}`);

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
            return routeError({ res, error, route: ROUTE, errorCode: 'REDEEM_BADGE_ERROR',
                userMsg: 'Erro ao resgatar badge.', extra: { email: decoded?.email } });
        }
    }
};
