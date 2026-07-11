const crypto = require('crypto');
const { isAllowedOrigin: isAllowedOriginShared, ALLOWED_ORIGINS } = require('../config/allowedOrigins');

// Reexporta a função compartilhada para manter compatibilidade com quem
// já importa de state.js. A lista agora vive em um único lugar
// (src/config/allowedOrigins.js) para evitar dessincronização.
const isAllowedOrigin = isAllowedOriginShared;

function getStateSecret() {
    // Usa um segredo dedicado se existir; senão reaproveita o JWT_SECRET.
    const secret = process.env.OAUTH_STATE_SECRET;
    if (!secret) throw new Error('OAUTH_STATE_SECRET must be set — do not reuse JWT_SECRET');
    return secret;
}

/**
 * Assina o payload do state com HMAC-SHA256, impedindo que um atacante forje
 * um state com dados arbitrários (ex: accountId de outra pessoa).
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
