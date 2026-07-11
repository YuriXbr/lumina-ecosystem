const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const BadgeService              = require('../../../../database/services/BadgeService');
const { routeError, addLog }    = require('../../../../logger/logger');

const ROUTE = 'DELETE /expapi/v1/admin/badges/:code';
const ACCESS_LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,
    support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };

/**
 * Deleta uma badge pelo código (admin+).
 * Não deleta os registros de userBadges — eles ficam órfãos mas o
 * getMyBadges/getUserBadges já filtram null quando a badge não existe mais.
 */
module.exports = {
    route: '/expapi/v1/admin/badges/:code',
    description: 'Deleta uma badge (admin+)',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'delete',

    async execute(req, res) {
        const { verifyRequestAuthWithAccountCheck } = require('../../../../utils/authHelpers');
        const { user: decoded, account: adminAccount, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            if (!adminAccount)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            const adminLevel = ACCESS_LEVELS[adminAccount.accessType] || 0;
            if (adminLevel < 7)
                return res.status(403).json({ error: 'Permissão insuficiente.', code: 'INSUFFICIENT_PERMISSION' });

            const { code } = req.params;
            if (!code)
                return res.status(400).json({ error: 'Código é obrigatório.', code: 'MISSING_CODE' });

            const normalizedCode = code.trim().toUpperCase();
            const existing = await BadgeService.getByCode(normalizedCode);
            if (!existing)
                return res.status(404).json({ error: 'Badge não encontrada.', code: 'BADGE_NOT_FOUND' });

            await BadgeService.deleteByCode(normalizedCode);

            addLog('API', 'admin.badge.delete', `Badge ${normalizedCode} deletada por ${decoded.email}`);

            return res.status(200).json({ message: 'Badge deletada com sucesso.' });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'DELETE_BADGE_ERROR',
                userMsg: 'Erro ao deletar badge.', extra: { email: decoded?.email, code: req.params?.code } });
        }
    }
};
