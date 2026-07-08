const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { getProvider } = require('../../../oauthProviders');
const { isAllowedOrigin, signState } = require('../../../oauthProviders/state');
const { addLog } = require('../../../logger/logger');

/**
 * Inicia o fluxo OAuth2. Suporta três intents:
 *   - login    (padrão) — entra ou cria conta automaticamente
 *   - register — cria conta; erro se o email já existir
 *   - link     — vincula o provider à conta do usuário já logado (exige linkToken)
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

        // Fluxo de vinculação: precisa de um JWT válido para saber a qual conta vincular
        let linkAccountId = null;
        if (intent === 'link') {
            const linkToken = req.query.linkToken;
            if (linkToken) {
                try {
                    const decoded = jwt.verify(linkToken, process.env.JWT_SECRET);
                    linkAccountId = decoded.accountId || null;
                } catch {
                    // Token inválido ou expirado — rejeita
                }
            }
            if (!linkAccountId) {
                addLog('API', 'oauth.start.error', `Intent link sem accountId válido (${req.params.provider})`);
                return res.redirect(`${origin}/oauth/complete?oauthError=link_no_account`);
            }
        }

        const state = signState({
            origin,
            nonce: crypto.randomUUID(),
            issuedAt: Date.now(),
            intent,
            ...(linkAccountId ? { linkAccountId } : {})
        });

        addLog('API', 'oauth.start', `Iniciando ${intent} via ${req.params.provider}`);
        return res.redirect(provider.getAuthorizationUrl(state));
    }
};
