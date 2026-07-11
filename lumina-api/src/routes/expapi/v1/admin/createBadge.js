const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const BadgeService              = require('../../../../database/services/BadgeService');
const UserBadgeService          = require('../../../../database/services/UserBadgeService');
const { routeError, addLog }    = require('../../../../logger/logger');

const ROUTE = 'POST /expapi/v1/admin/badges';
const ACCESS_LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,
    support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };

const VALID_RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'];

/**
 * Cria uma nova badge (apenas admin+).
 *
 * Body:
 *   code           — código único de resgate (ex: "BETA2025")
 *   name           — nome da badge
 *   description    — descrição
 *   imageUrl       — URL da imagem
 *   rarity         — common|rare|epic|legendary|mythic
 *   highlightColor — cor hex (ex: "#8B5CF6")
 *   availableFrom  — ISO date (quando o código fica ativo)
 *   expiresAt      — ISO date ou null (null = não expira)
 *   maxRedemptions — 0 = ilimitado
 *   minAccessLevel — accessType mínimo para resgatar
 */
module.exports = {
    route: '/expapi/v1/admin/badges',
    description: 'Cria uma nova badge (admin+)',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'post',

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

            const { code, name, description, imageUrl, rarity, highlightColor,
                    availableFrom, expiresAt, maxRedemptions, minAccessLevel } = req.body;

            // Validações
            if (!code || typeof code !== 'string' || code.trim().length < 3)
                return res.status(400).json({ error: 'Código deve ter pelo menos 3 caracteres.', code: 'INVALID_CODE' });
            if (!name || typeof name !== 'string')
                return res.status(400).json({ error: 'Nome é obrigatório.', code: 'MISSING_NAME' });
            if (rarity && !VALID_RARITIES.includes(rarity))
                return res.status(400).json({ error: 'Raridade inválida.', code: 'INVALID_RARITY' });
            if (minAccessLevel && !(minAccessLevel in ACCESS_LEVELS))
                return res.status(400).json({ error: 'Nível de acesso mínimo inválido.', code: 'INVALID_ACCESS_LEVEL' });

            // Normaliza código (uppercase, sem espaços)
            const normalizedCode = code.trim().toUpperCase();

            // Verifica se já existe
            const existing = await BadgeService.getByCode(normalizedCode);
            if (existing)
                return res.status(409).json({ error: 'Código de badge já existe.', code: 'BADGE_CODE_EXISTS' });

            const badge = await BadgeService.createBadge({
                code: normalizedCode,
                name: name.trim(),
                description: description || '',
                imageUrl: imageUrl || '',
                rarity: rarity || 'common',
                highlightColor: highlightColor || '#8B5CF6',
                availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                maxRedemptions: typeof maxRedemptions === 'number' ? maxRedemptions : 0,
                minAccessLevel: minAccessLevel || 'user',
                createdBy: decoded.email,
                createdAt: new Date(),
                updatedAt: new Date(),
                active: true,
            });

            addLog('API', 'admin.badge.create', `Badge ${normalizedCode} criada por ${decoded.email}`);

            return res.status(201).json({
                message: 'Badge criada com sucesso.',
                badge: {
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
                },
            });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'CREATE_BADGE_ERROR',
                userMsg: 'Erro ao criar badge.', extra: { email: decoded?.email } });
        }
    }
};
