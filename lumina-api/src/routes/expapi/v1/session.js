const DashboardAccountService = require('../../../database/services/DashboardAccountService');
const { verifyRequestAuth, verifyRequestAuthWithAccountCheck } = require('../../../utils/authHelpers');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'GET /expapi/v1/session';

/**
 * Retorna o estado da sessão atual baseado no cookie httpOnly (ou header Bearer legado).
 *
 * Usado pelo frontend para saber se está logado e quem é o usuário,
 * SEM precisar ler o JWT do localStorage (que seria vulnerável a XSS).
 *
 * Resposta:
 *   200 { authenticated: true, user: {...} }  — logado
 *   200 { authenticated: false }              — não logado (não usa 401 para
 *                                                o frontend não disparar fetch error)
 */
module.exports = {
    route: '/expapi/v1/session',
    description: 'Retorna estado da sessão atual (cookie-based)',
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
            // Sempre retorna 200 — o frontend decide o que fazer com authenticated.
            // Não usamos verifyRequestAuthWithAccountCheck diretamente porque
            // ele retornaria erro 401 quando não há token; session.js precisa
            // devolver 200 { authenticated: false } nesse caso.
            const { error } = verifyRequestAuth(req);
            if (error || !verifyRequestAuth(req).user) {
                return res.status(200).json({ authenticated: false });
            }

            // Usa a versão com checagem de conta para validar banned/blocked
            // e já receber o account populado.
            const { account, error: authError } = await verifyRequestAuthWithAccountCheck(req);

            // Token inválido/expirado → não autenticado (sem 401)
            if (authError && authError.status === 401) {
                return res.status(200).json({ authenticated: false });
            }
            // Conta banida/bloqueada → authenticated:false com reason
            if (authError && (authError.code === 'ACCOUNT_BANNED' || authError.code === 'ACCOUNT_BLOCKED')) {
                return res.status(200).json({
                    authenticated: false,
                    reason: authError.code,
                });
            }
            if (authError || !account) {
                return res.status(authError?.status || 503).json({ error: 'Não foi possível verificar a sessão.', code: authError?.code || 'SESSION_UNAVAILABLE' });
            }

            return res.status(200).json({
                authenticated: true,
                user: require('../../../utils/accountDto').accountDto(account),
            });
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'SESSION_CHECK_ERROR',
                userMsg: 'Erro ao verificar sessão.',
            });
        }
    }
};
