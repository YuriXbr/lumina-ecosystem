const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { routeError, addLog }    = require('../../../logger/logger');

const ROUTE = 'POST /expapi/v1/user/close-account';

/**
 * Agenda o fechamento da conta para daqui a 30 dias.
 * Login subsequente cancela automaticamente.
 */
module.exports = {
    route: '/expapi/v1/user/close-account',
    description: 'Agenda exclusão da conta em 30 dias',
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

            // Confirmação — body deve trazer { confirm: true, reason?: string }
            const body = req.body || {};
            if (body.confirm !== true) {
                return res.status(400).json({
                    error: 'Confirmação necessária. Envie { confirm: true } no corpo da requisição.',
                    code: 'CONFIRMATION_REQUIRED',
                });
            }

            // Não permite contas admin sem verificação extra (futuro: 2FA)
            const ACCESS_LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,
                support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };
            if ((ACCESS_LEVELS[account.accessType] || 0) >= 7) {
                addLog('API', 'account.close.blocked', `Tentativa de auto-fechamento de conta admin: ${decoded.email}`);
                return res.status(403).json({
                    error: 'Contas administrativas não podem ser fechadas via painel. Contate o suporte.',
                    code: 'ADMIN_CANNOT_CLOSE',
                });
            }

            await DashboardAccountService.requestAccountClosure(account.accountId);

            const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            addLog('API', 'account.close.requested', `Fechamento agendado para ${scheduledFor.toISOString()}`, {
                userEmail: decoded.email,
                extra: { scheduledFor: scheduledFor.toISOString(), reason: body.reason || '' },
            });

            return res.status(200).json({
                ok: true,
                scheduledFor,
                message: `Sua conta será excluída em ${scheduledFor.toLocaleDateString('pt-BR')}. Se você entrar novamente antes dessa data, a exclusão será cancelada.`,
            });
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'CLOSE_ACCOUNT_ERROR',
                userMsg: 'Erro ao agendar fechamento da conta.',
                extra: { email: decoded?.email },
            });
        }
    }
};
