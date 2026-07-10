const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { validateUsername }      = require('../../../utils/identityValidation');
const { verifyRequestAuth }     = require('../../../utils/authHelpers');
const { routeError }            = require('../../../logger/logger');
const ROUTE = 'GET /expapi/v1/user/check-username';

/**
 * Verifica se um username está disponível para uso.
 *
 * Auth OPCIONAL — funciona tanto para usuários logados (mudando username
 * nas settings) quanto para usuários não logados (durante o cadastro).
 * Se o usuário estiver logado, exclui seu próprio username da checagem.
 */
module.exports = {
    route: '/expapi/v1/user/check-username',
    description: 'Verifica disponibilidade de username (auth opcional)',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        // Auth opcional — não bloqueia se não tiver token (cadastro)
        const { user: decoded } = verifyRequestAuth(req);

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

            // Se logado, exclui seu próprio username da checagem
            const excludeAccountId = decoded?.accountId || null;

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
