const crypto = require('crypto');

/**
 * Allow-list de origins permitidos para o parâmetro `origin` do fluxo OAuth2.
 * ANTES: qualquer origin era aceito e usado direto em res.redirect() — open redirect.
 * Mantenha esta lista em sincronia com `allowedOrigins` do index.js.
 */
const ALLOWED_ORIGINS = [
    'https://api.bot.luminasink.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://lumina-api-tau.vercel.app',
    'https://bot.luminasink.com'
];

function isAllowedOrigin(origin) {
    return typeof origin === 'string' && ALLOWED_ORIGINS.includes(origin);
}

function getStateSecret() {
    // Usa um segredo dedicado se existir; senão reaproveita o JWT_SECRET.
    return process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET;
}

/**
 * Assina o payload do state com HMAC-SHA256, impedindo que um atacante forje
 * um state com dados arbitrários (ex: accountId de outra pessoa) — o problema
 * original do fluxo /expapi/oauth2/discord/redirect.
 */
function signState(payload) {
    const base = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const hmac = crypto.createHmac('sha256', getStateSecret()).update(base).digest('base64url');
    return `${base}.${hmac}`;
}

function verifyState(state) {
    if (!state || typeof state !== 'string' || !state.includes('.')) return null;

    const [base, hmac] = state.split('.');
    if (!base || !hmac) return null;

    const expected = crypto.createHmac('sha256', getStateSecret()).update(base).digest('base64url');

    const a = Buffer.from(hmac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    try {
        return JSON.parse(Buffer.from(base, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
}

module.exports = { isAllowedOrigin, signState, verifyState, ALLOWED_ORIGINS };
