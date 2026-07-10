const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { validateUsername }      = require('../../../utils/identityValidation');
const { routeError }            = require('../../../logger/logger');
const ROUTE = 'GET /expapi/v1/user/check-username';

/**
 * Verifica se um username está disponível para uso.
 * Requer auth (não deixar enumerar usernames sem login).
 */
module.exports = {
    route: '/expapi/v1/user/check-username',
    description: 'Verifica disponibilidade de username',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        const { verifyRequestAuth } = require('../../../utils/authHelpers');
        const { user: decoded, error: authError } = verifyRequestAuth(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            const username = String(req.query.username || '').trim();
            if (!username)
                return res.status(400).json({ error: 'Parâmetro username é obrigatório.', code: 'MISSING_USERNAME' });

            // Validação de sintaxe + blacklist primeiro (mais rápido que ir no banco)
            const v = validateUsername(username);
            if (!v.valid) {
                return res.status(200).json({
                    available: false,
                    reason: 'invalid',
                    message: v.error,
                });
            }

            const account = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            const excludeAccountId = account?.accountId || null;

            const available = await DashboardAccountService.isUsernameAvailable(username, excludeAccountId);

            return res.status(200).json({
                available,
                reason: available ? 'ok' : 'taken',
                message: available ? 'Username disponível!' : 'Este username já está em uso.',
            });
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'CHECK_USERNAME_ERROR',
                userMsg: 'Erro ao verificar username.',
                extra: { email: decoded?.email },
            });
        }
    }
};
