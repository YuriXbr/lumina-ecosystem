const { getProvider } = require('../../../oauthProviders');
const { isAllowedOrigin, signState } = require('../../../oauthProviders/state');
const { addLog, routeError } = require('../../../logger/logger');

/**
 * Inicia o fluxo OAuth2. Suporta três intents:
 *   - login    (padrão) — entra ou cria conta automaticamente
 *   - register — cria conta; erro se o email já existir
 *   - link     — vincula o provider à conta do usuário já logado
 *
 * Audit #7: o fluxo legado de `?linkToken=<JWT>` na URL foi removido —
 * JWTs em URL ficam registrados em logs de servidor/proxy e em referrers,
 * constituindo vazamento de credencial. O único caminho de autenticação
 * para o intent=link agora é o cookie httpOnly (lumina_token).
 *
 * Audit #16: o campo `nonce` do state era gerado mas nunca checado em
 * authCallback (dead code que só inflava o JWT do state). Removido.
 */
module.exports = {
    route: '/expapi/oauth2/:provider/auth/start',
    description: 'Inicia login/cadastro/vinculação via OAuth2',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: true,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        const origin = req.query.origin || 'https://bot.luminasink.com';
        const rawIntent = req.query.intent;
        const intent = ['login', 'register', 'link'].includes(rawIntent) ? rawIntent : 'login';

        if (!isAllowedOrigin(origin)) {
            return res.status(400).json({ error: 'Origin não permitida.', code: 'INVALID_ORIGIN' });
        }

        let provider;
        try {
            provider = getProvider(req.params.provider);
        } catch {
            return res.status(404).json({ error: 'Provedor OAuth2 não suportado.', code: 'UNKNOWN_PROVIDER' });
        }

        // Fluxo de vinculação: precisa de um JWT válido (no cookie httpOnly)
        // para saber a qual conta vincular. Audit #7: linkToken via query foi
        // removido — o cookie é a única forma de autenticar o link flow.
        let linkAccountId = null;
        if (intent === 'link') {
            const { verifyRequestAuth } = require('../../../utils/authHelpers');
            const { user, error } = verifyRequestAuth(req);
            if (error || !user) {
                addLog('API', 'oauth.start.nolinkcookie', `Intent link sem cookie válido (${req.params.provider})`);
                return res.redirect(`${origin}/oauth/complete?oauthError=link_no_account`);
            }
            linkAccountId = user.accountId || null;
            if (!linkAccountId) {
                addLog('API', 'oauth.start.error', `Intent link sem accountId válido (${req.params.provider})`);
                return res.redirect(`${origin}/oauth/complete?oauthError=link_no_account`);
            }
        }

        // Audit #16: nonce removido do state — era dead code (nunca checado
        // no callback). State ainda é assinado com HMAC-SHA256, impedindo
        // que um atacante forje state com linkAccountId arbitrário.
        const state = signState({
            origin,
            issuedAt: Date.now(),
            intent,
            ...(linkAccountId ? { linkAccountId } : {})
        });

        addLog('API', 'oauth.start', `Iniciando ${intent} via ${req.params.provider}`);
        try {
            return res.redirect(provider.getAuthorizationUrl(state));
        } catch (redirectErr) {
            addLog('API', 'oauth.start.redirectfail', 'Falha ao redirecionar: ' + redirectErr.message);
            return res.status(500).json({ error: 'Erro ao iniciar autenticação.', code: 'OAUTH_REDIRECT_ERROR' });
        }
    }
};
