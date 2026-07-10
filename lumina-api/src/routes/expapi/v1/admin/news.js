const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const NewsService               = require('../../../../database/services/NewsService');
const { routeError }            = require('../../../../logger/logger');

const ROUTE = 'POST|DELETE /expapi/v1/admin/news';
const ACCESS_LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,
    support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };

/**
 * CRUD de posts do feed de novidades — apenas admin (level 7+).
 * Suporta POST (criar) e DELETE (remover por id via query ?id=).
 */
module.exports = {
    route: '/expapi/v1/admin/news',
    description: 'Cria ou remove posts do feed de novidades (admin)',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'both_delete', // POST e DELETE

    async execute(req, res) {
        // Auth manual (JWT no header Authorization)
        const { verifyRequestAuth } = require('../../../../utils/authHelpers');
        const { user: decoded, error: authError } = verifyRequestAuth(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            const account = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!account) return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            if ((ACCESS_LEVELS[account.accessType] || 0) < 7)
                return res.status(403).json({ error: 'Permissão insuficiente.', code: 'INSUFFICIENT_PERMISSION' });

            // POST = criar
            if (req.method === 'POST') {
                const { title, body, excerpt, imageUrl, tag, pinned } = req.body || {};
                if (!title || !body)
                    return res.status(400).json({ error: 'title e body são obrigatórios.', code: 'MISSING_FIELDS' });

                const post = await NewsService.createPost({
                    title, body, excerpt, imageUrl, tag, pinned,
                    authorEmail: account.email,
                    authorName: `${account.firstName} ${account.lastName}`.trim(),
                });
                return res.status(201).json({ post });
            }

            // DELETE = remover
            if (req.method === 'DELETE') {
                const id = req.query.id || (req.body && req.body.id);
                if (!id)
                    return res.status(400).json({ error: 'id é obrigatório (query ou body).', code: 'MISSING_ID' });
                const result = await NewsService.deletePost(id);
                if (result.deletedCount === 0)
                    return res.status(404).json({ error: 'Post não encontrado.', code: 'POST_NOT_FOUND' });
                return res.status(200).json({ ok: true });
            }

            return res.status(405).json({ error: 'Método não suportado.', code: 'METHOD_NOT_ALLOWED' });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'ADMIN_NEWS_ERROR',
                userMsg: 'Erro ao manipular post de novidades.', extra: { email: decoded?.email } });
        }
    }
};
