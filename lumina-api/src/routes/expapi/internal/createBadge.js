const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const BadgeService              = require('../../../database/services/BadgeService');
const { routeError, addLog }    = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/createbadge';
const ACCESS_LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,
    support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };

const VALID_RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'];

/**
 * Rota interna para o bot criar badges.
 *
 * O bot passa o Discord ID do admin que executou /createbadge.
 * A API procura a conta vinculada a esse Discord ID, verifica se
 * o accessType é admin+ (level 7+), e cria a badge.
 *
 * Body:
 *   discordUserId  — Discord ID do admin (para validação de permissão)
 *   code, name, description, imageUrl, rarity, highlightColor,
 *   availableFrom, expiresAt, maxRedemptions, minAccessLevel
 */
module.exports = {
    route: '/expapi/internal/createbadge',
    description: 'Cria uma badge via bot (internal, admin+)',
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { discordUserId, code, name, description, imageUrl, rarity,
                highlightColor, availableFrom, expiresAt, maxRedemptions, minAccessLevel } = req.body || {};

        if (!discordUserId)
            return res.status(400).json({ error: 'discordUserId é obrigatório.', code: 'MISSING_PARAMS' });
        if (!code || typeof code !== 'string' || code.trim().length < 3)
            return res.status(400).json({ error: 'Código deve ter pelo menos 3 caracteres.', code: 'INVALID_CODE' });
        if (!name || typeof name !== 'string')
            return res.status(400).json({ error: 'Nome é obrigatório.', code: 'MISSING_NAME' });
        if (rarity && !VALID_RARITIES.includes(rarity))
            return res.status(400).json({ error: 'Raridade inválida.', code: 'INVALID_RARITY' });

        try {
            // Busca a conta pelo Discord ID
            const account = await DashboardAccountService.getOne({ discordOauth2Id: String(discordUserId) });
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada para este Discord ID.', code: 'ACCOUNT_NOT_FOUND' });

            if (account.banned || account.blocked)
                return res.status(403).json({ error: 'Conta suspensa.', code: 'ACCOUNT_SUSPENDED' });

            const adminLevel = ACCESS_LEVELS[account.accessType] || 0;
            if (adminLevel < 7)
                return res.status(403).json({ error: 'Permissão insuficiente. Apenas admin+ pode criar badges.', code: 'INSUFFICIENT_PERMISSION' });

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
                createdBy: account.email,
                createdAt: new Date(),
                updatedAt: new Date(),
                active: true,
            });

            addLog('API', 'admin.badge.create.bot', `Badge ${normalizedCode} criada por ${account.email} via bot`);

            return res.status(201).json({
                message: 'Badge criada com sucesso.',
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
            return routeError({ res, error, route: ROUTE, errorCode: 'CREATE_BADGE_BOT_ERROR',
                userMsg: 'Erro ao criar badge.', extra: { discordUserId } });
        }
    }
};
