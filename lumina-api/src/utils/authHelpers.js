'use strict';

/**
 * Helpers de autenticação centralizados.
 *
 * Estratégia dupla (compatibilidade + segurança):
 *   1. Cookie httpOnly (preferencial) — setado por login/OAuth, enviado automaticamente
 *      pelo browser. Imune a XSS (JavaScript não consegue ler).
 *   2. Header Authorization: Bearer (legado) — mantido para clients não-browser
 *      (CLI, scripts, testes) que não gerenciam cookies.
 *
 * Cookie flags:
 *   - Produção (HTTPS, mesmo domínio ou subdomínio): sameSite='lax', secure=true
 *   - Desenvolvimento (HTTP, cross-origin localhost:5173 → localhost:3000):
 *     sameSite='none', secure=false (necessário para cross-origin em HTTP local)
 *
 * O fluxo de cookie é protegido contra CSRF pelo middleware de double-submit
 * cookie (src/utils/csrfMiddleware.js). SameSite=Lax em produção bloqueia
 * a maioria dos ataques CSRF cross-site.
 */

const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'lumina_token';

/**
 * Resolve o JWT a partir do cookie OU do header Authorization.
 * @returns {string|null}
 */
function extractToken(req) {
    // 1. Cookie httpOnly (preferencial)
    if (req.cookies && req.cookies[COOKIE_NAME]) {
        return req.cookies[COOKIE_NAME];
    }
    // 2. Header Authorization: Bearer <token> (legado / não-browser)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    return null;
}

/**
 * Verifica o JWT (do cookie ou header) e popula req.user.
 * Não lança — retorna { user, error }.
 */
function verifyRequestAuth(req) {
    const token = extractToken(req);
    if (!token) {
        return { user: null, error: { status: 401, code: 'MISSING_TOKEN', message: 'Token não fornecido.' } };
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { user: decoded, error: null };
    } catch (err) {
        const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        return { user: null, error: { status: 401, code, message: 'Token inválido ou expirado.' } };
    }
}

/**
 * Middleware Express que exige auth (popula req.user ou retorna 401).
 */
function requireAuth(req, res, next) {
    const { user, error } = verifyRequestAuth(req);
    if (error) {
        return res.status(error.status).json({ error: error.message, code: error.code });
    }
    req.user = user;
    next();
}

/**
 * Middleware Express opcional: popula req.user se houver token válido,
 * mas não bloqueia se não houver.
 */
function optionalAuth(req, res, next) {
    const { user } = verifyRequestAuth(req);
    req.user = user || null;
    next();
}

/**
 * Seta o cookie httpOnly com o JWT.
 *
 * Em desenvolvimento (HTTP cross-origin localhost):
 *   sameSite='none' + secure=false — browser aceita cookie cross-origin em HTTP
 * Em produção (HTTPS):
 *   sameSite='lax' + secure=true — protege contra CSRF cross-site
 */
function setAuthCookie(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax', // Lax em ambos — same-origin em dev (proxy), seguro em prod
        maxAge: 60 * 60 * 1000, // 1 hora
        path: '/',
    });
}

/**
 * Limpa o cookie de auth.
 */
function clearAuthCookie(res) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
    });
}

module.exports = {
    COOKIE_NAME,
    extractToken,
    verifyRequestAuth,
    requireAuth,
    optionalAuth,
    setAuthCookie,
    clearAuthCookie,
};
