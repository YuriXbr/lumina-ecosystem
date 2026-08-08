/**
 * Middleware CSRF baseado no padrão double-submit cookie.
 *
 * Substitui o pacote deprecated `csurf` (arquivado desde 2021).
 *
 * Como funciona:
 *   1. GET /expapi/v1/csrf-token → seta um cookie `csrf_token` (não-httpOnly,
 *      para o JS poder ler) E retorna o token no JSON.
 *   2. Em requisições state-changing (POST/PUT/DELETE), o middleware verifica
 *      que o header `X-CSRF-Token` corresponde ao cookie `csrf_token`.
 *   3. Se não corresponderem (ou um dos dois estiver faltando), retorna 403.
 *
 * O token é gerado com crypto.randomBytes (32 bytes → base64url), renovado
 * a cada hora, e scoped por sessão (não por usuário).
 *
 * Segurança:
 *   - O cookie é `sameSite: 'lax'` → bloqueia CSRF cross-site
 *   - O token tem entropia suficiente (192 bits) → não é brute-forceable
 *   - Double-submit: atacante não consegue ler o cookie (cross-origin) nem
 *     adivinhar o token para incluir no header
 */

'use strict';

const crypto = require('crypto');

const COOKIE_NAME = 'csrf_token';
const HEADER_NAME = 'x-csrf-token';
const TOKEN_MAX_AGE_MS = 60 * 60 * 1000; // 1 hora

/**
 * Gera um token CSRF seguro (32 bytes aleatórios, base64url).
 */
function generateCsrfToken() {
    return crypto.randomBytes(32).toString('base64url');
}

/**
 * Middleware que valida o token CSRF para requisições state-changing.
 * Deve ser aplicado APENAS em rotas que precisam de CSRF (não em GET).
 */
function csrfProtection(req, res, next) {
    // GET/HEAD/OPTIONS não precisam de CSRF
    const method = req.method?.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        // Para GET, gera/regenera o token se necessário
        return ensureCsrfToken(req, res, next);
    }

    // Para POST/PUT/DELETE, valida o token
    const cookieToken = req.cookies?.[COOKIE_NAME];
    const headerToken = req.headers?.[HEADER_NAME];

    if (!cookieToken || !headerToken) {
        const err = new Error('Token CSRF ausente.');
        err.code = 'EBADCSRFTOKEN';
        return next(err);
    }

    // Comparação timing-safe
    const a = Buffer.from(String(cookieToken));
    const b = Buffer.from(String(headerToken));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        const err = new Error('Token CSRF inválido.');
        err.code = 'EBADCSRFTOKEN';
        return next(err);
    }

    next();
}

/**
 * Garante que o cookie CSRF existe. Se não existir, cria um novo.
 * Anexa `req.csrfToken()` que retorna o token atual.
 */
function ensureCsrfToken(req, res, next) {
    let token = req.cookies?.[COOKIE_NAME];
    if (!token) {
        token = generateCsrfToken();
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie(COOKIE_NAME, token, {
            httpOnly: false, // JS precisa ler para incluir no header
            secure: isProduction,
            sameSite: 'lax',
            maxAge: TOKEN_MAX_AGE_MS,
            path: '/',
        });
    }
    req.csrfToken = () => token;
    if (next) next();
}

module.exports = {
    csrfProtection,
    generateCsrfToken,
    ensureCsrfToken,
    COOKIE_NAME,
    HEADER_NAME,
};
