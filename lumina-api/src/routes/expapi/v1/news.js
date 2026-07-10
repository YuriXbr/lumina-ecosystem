const NewsService = require('../../../database/services/NewsService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'GET /expapi/v1/news';

/**
 * Lista notícias do feed público.
 * Não exige autenticação — qualquer um pode ver (incluso usuários anônimos
 * na Área de Membros antes de logar).
 */
module.exports = {
    route: '/expapi/v1/news',
    description: 'Lista posts do feed de novidades (público)',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        try {
            const limit  = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
            const offset = Math.max(parseInt(req.query.offset) || 0, 0);

            const posts = await NewsService.listPublished({ limit, offset });

            return res.status(200).json({
                posts: posts.map(p => ({
                    id: p._id,
                    title: p.title,
                    body: p.body,
                    excerpt: p.excerpt,
                    imageUrl: p.imageUrl,
                    tag: p.tag,
                    pinned: p.pinned,
                    publishedAt: p.publishedAt,
                    authorName: p.authorName,
                })),
                pagination: { limit, offset, count: posts.length },
            });
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'FETCH_NEWS_ERROR',
                userMsg: 'Erro ao buscar novidades.',
            });
        }
    }
};
