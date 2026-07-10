const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { routeError, addLog }    = require('../../../logger/logger');

const ROUTE = 'POST /expapi/v1/user/cancel-close-account';

/**
 * Cancela o fechamento agendado da conta.
 */
module.exports = {
    route: '/expapi/v1/user/cancel-close-account',
    description: 'Cancela exclusão agendada da conta',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { verifyRequestAuthWithAccountCheck } = require('../../../utils/authHelpers');
        const { user: decoded, account, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            if (!account.deletionRequestedAt) {
                return res.status(400).json({
                    error: 'Não há fechamento agendado para cancelar.',
                    code: 'NO_CLOSURE_SCHEDULED',
                });
            }

            await DashboardAccountService.cancelAccountClosure(account.accountId);

            addLog('API', 'account.close.cancelled', 'Fechamento cancelado pelo usuário', {
                userEmail: decoded.email,
            });

            return res.status(200).json({
                ok: true,
                message: 'Fechamento da conta cancelado. Seu perfil continua ativo.',
            });
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'CANCEL_CLOSE_ACCOUNT_ERROR',
                userMsg: 'Erro ao cancelar fechamento.',
                extra: { email: decoded?.email },
            });
        }
    }
};
