const DashboardAccountService = require('../../../../database/services/DashboardAccountService');
const LogService = require('../../../../database/services/LogService');
const { routeError } = require('../../../../logger/logger');

const ROUTE = 'GET /expapi/v1/admin/logs';
const ACCESS_LEVELS = {
    user: 0, vipUser: 1, enterpriseUser: 2, contentCreator: 3, tester: 4,
    support: 5, moderator: 6, admin: 7, headadmin: 8, developer: 9, coowner: 10, owner: 11
};

/**
 * Consulta o histórico completo de logs armazenados no MongoDB.
 * Suporta filtros por: level, type, route, requestId, startDate, endDate.
 * Paginado (limit máx 100, padrão 50).
 * Acesso restrito a admin (level 7+).
 */
module.exports = {
    route: '/expapi/v1/admin/logs',
    description: 'Consulta logs da API com filtros (admin)',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        const { verifyRequestAuthWithAccountCheck } = require('../../../../utils/authHelpers');
        const { user: decoded, account: adminAccount, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });
            if (!adminAccount) return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });
            if (adminAccount.banned || adminAccount.blocked) return res.status(403).json({ error: 'Conta suspensa.', code: 'ACCOUNT_SUSPENDED' });

        try {
            const adminAccount = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!adminAccount) return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });
            if ((ACCESS_LEVELS[adminAccount.accessType] || 0) < 7) {
                return res.status(403).json({ error: 'Permissão insuficiente.', code: 'INSUFFICIENT_PERMISSION' });
            }

            const result = await LogService.queryLogs({
                level:     req.query.level,
                type:      req.query.type,
                route:     req.query.route,
                requestId: req.query.requestId,
                startDate: req.query.startDate,
                endDate:   req.query.endDate,
                limit:     req.query.limit,
                page:      req.query.page,
            });

            return res.status(200).json(result);
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'FETCH_LOGS_ERROR',
                userMsg: 'Erro ao buscar logs.',
                extra: { email: decoded?.email },
            });
        }
    }
};
