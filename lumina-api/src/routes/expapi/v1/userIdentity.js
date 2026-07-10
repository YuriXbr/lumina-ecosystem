const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { routeError, addLog }    = require('../../../logger/logger');
const {
    canChangeUsername, canChangeDisplayName,
    validateUsername, validateDisplayName,
} = require('../../../utils/identityValidation');

const ROUTE = 'PATCH /expapi/v1/user/identity';

/**
 * Atualiza username (cooldown 30d) e/ou displayName (cooldown 24h).
 * Aceita campos opcionais — só os presentes no body são atualizados.
 */
module.exports = {
    route: '/expapi/v1/user/identity',
    description: 'Atualiza username e/ou displayName do usuário logado',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'put', // PUT — idempotente para definir identidade

    async execute(req, res) {
        const { verifyRequestAuthWithAccountCheck } = require('../../../utils/authHelpers');
        const { user: decoded, account, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            // banned/blocked já tratado por verifyRequestAuthWithAccountCheck, mas
            // mantemos a checagem explícita para clareza de fluxo.
            if (account.banned)
                return res.status(403).json({ error: 'Conta banida.', code: 'ACCOUNT_BANNED' });
            if (account.blocked)
                return res.status(403).json({ error: 'Conta bloqueada.', code: 'ACCOUNT_BLOCKED' });

            const body = req.body || {};
            const updates = {};
            const warnings = [];

            // ─── Username ────────────────────────────────────────────────────
            if (body.username !== undefined) {
                const newUsername = String(body.username || '').trim();

                // Validação de sintaxe + blacklist
                const v = validateUsername(newUsername);
                if (!v.valid) {
                    return res.status(400).json({ error: v.error, code: 'INVALID_USERNAME' });
                }

                // Cooldown (só aplica se já tinha username antes)
                if (account.username && account.usernameChangedAt) {
                    const c = canChangeUsername(account.usernameChangedAt);
                    if (!c.canChange) {
                        return res.status(429).json({
                            error: `Você poderá alterar seu username novamente em ${new Date(c.nextChangeAt).toLocaleDateString('pt-BR')}.`,
                            code: 'USERNAME_COOLDOWN',
                            nextChangeAt: c.nextChangeAt,
                            msRemaining: c.msRemaining,
                        });
                    }
                }

                // Unicidade
                const available = await DashboardAccountService.isUsernameAvailable(newUsername, account.accountId);
                if (!available) {
                    return res.status(409).json({ error: 'Este username já está em uso.', code: 'USERNAME_TAKEN' });
                }

                updates.username = newUsername;
                updates.usernameLower = newUsername.toLowerCase();
                updates.usernameChangedAt = new Date();
            }

            // ─── DisplayName ────────────────────────────────────────────────
            if (body.displayName !== undefined) {
                const newDisplayName = String(body.displayName || '').trim();

                const v = validateDisplayName(newDisplayName);
                if (!v.valid) {
                    return res.status(400).json({ error: v.error, code: 'INVALID_DISPLAY_NAME' });
                }

                // Audit #3: armazena a versão sanitizada (sem zero-width chars)
                if (account.displayName && account.displayNameChangedAt) {
                    const c = canChangeDisplayName(account.displayNameChangedAt);
                    if (!c.canChange) {
                        return res.status(429).json({
                            error: `Você poderá alterar seu display name novamente em ${new Date(c.nextChangeAt).toLocaleString('pt-BR')}.`,
                            code: 'DISPLAY_NAME_COOLDOWN',
                            nextChangeAt: c.nextChangeAt,
                            msRemaining: c.msRemaining,
                        });
                    }
                }

                updates.displayName = v.sanitized.trim();
                updates.displayNameChangedAt = new Date();
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({
                    error: 'Nenhum campo para atualizar. Envie username e/ou displayName.',
                    code: 'NO_FIELDS',
                });
            }

            const updated = await DashboardAccountService.update({ accountId: account.accountId }, { $set: updates });

            addLog('API', 'user.identity.update', `Identidade atualizada: ${Object.keys(updates).join(', ')}`, {
                userEmail: decoded.email,
                extra: { fields: Object.keys(updates) },
            });

            return res.status(200).json({
                account: {
                    accountId: updated.accountId,
                    username: updated.username || '',
                    displayName: updated.displayName || '',
                    usernameChangedAt: updated.usernameChangedAt || null,
                    displayNameChangedAt: updated.displayNameChangedAt || null,
                },
                warnings,
            });
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'UPDATE_IDENTITY_ERROR',
                userMsg: 'Erro ao atualizar identidade.',
                extra: { email: decoded?.email },
            });
        }
    }
};
