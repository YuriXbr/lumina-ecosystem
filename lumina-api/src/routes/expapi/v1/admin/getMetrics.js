const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../../database/services/DashboardAccountService');
const metrics = require('../../../../logger/metrics');
const { routeError } = require('../../../../logger/logger');

const ROUTE = 'GET /expapi/v1/admin/metrics';
const ACCESS_LEVELS = {
    user: 0, vipUser: 1, enterpriseUser: 2, contentCreator: 3, tester: 4,
    support: 5, moderator: 6, admin: 7, headadmin: 8, developer: 9, coowner: 10, owner: 11
};

/**
 * Expõe estatísticas de uso das rotas (contagem, status codes, tempo médio de
 * resposta, taxa de erro) e os últimos erros registrados — para diagnóstico e
 * observabilidade. Restrito a contas com accessType 'admin' ou superior, pelo
 * mesmo padrão de autorização usado em admin/getUsers.js e admin/getGuilds.js.
 */
module.exports = {
    route: '/expapi/v1/admin/metrics',
    description: 'Estatísticas de uso, performance e erros das rotas da API (admin)',
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Token não fornecido.', code: 'MISSING_TOKEN' });

        let decoded;
        try {
            decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ error: 'Token inválido.', code: 'INVALID_TOKEN' });
        }

        try {
            const adminAccount = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!adminAccount) return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            if ((ACCESS_LEVELS[adminAccount.accessType] || 0) < 7) {
                return res.status(403).json({ error: 'Permissão insuficiente.', code: 'INSUFFICIENT_PERMISSION' });
            }

            return res.status(200).json(metrics.getSnapshot());
        } catch (error) {
            return routeError({
                res, error, route: ROUTE, errorCode: 'FETCH_METRICS_ERROR',
                userMsg: 'Erro ao buscar métricas.', extra: { email: decoded?.email },
            });
        }
    }
};
