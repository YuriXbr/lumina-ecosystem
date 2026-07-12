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
 * Versão assíncrona de verifyRequestAuth que também valida o estado da conta
 * no banco (banned / blocked). Deve ser usada em rotas autenticadas que precisam
 * garantir que a conta ainda está ativa.
 *
 * Retorna { user, account, error }:
 *   - error preenchido se o JWT for inválido OU a conta estiver banida/bloqueada
 *     (status 401 para token inválido, 403 para conta suspensa)
 *   - account é o documento completo do DashboardAccountService (null se não houver
 *     JWT válido ou se a conta não existir — nesse caso error é preenchido)
 */
async function verifyRequestAuthWithAccountCheck(req) {
    const { user, error } = verifyRequestAuth(req);
    if (error) return { user: null, account: null, error };

    // Lazy-require para evitar ciclo de dependência em testes que mockam o service.
    let DashboardAccountService;
    try {
        DashboardAccountService = require('../database/services/DashboardAccountService');
    } catch {
        return { user, account: null, error: null };
    }

    let account = null;
    try {
        account = await DashboardAccountService.getDashboardAccountByEmail(user.email);
    } catch (dbErr) {
        // DB error should NOT silently pass — return 503 so the caller can handle it
        return { user: null, account: null, error: { status: 503, code: 'DB_UNAVAILABLE', message: 'Database temporarily unavailable.' } };
    }

    if (!account) {
        return {
            user: null,
            account: null,
            error: { status: 401, code: 'ACCOUNT_NOT_FOUND', message: 'Conta não encontrada.' },
        };
    }

    if (account.banned) {
        return {
            user: null,
            account,
            error: { status: 403, code: 'ACCOUNT_BANNED', message: 'Esta conta foi banida.' },
        };
    }
    if (account.blocked) {
        return {
            user: null,
            account,
            error: { status: 403, code: 'ACCOUNT_BLOCKED', message: 'Esta conta está bloqueada.' },
        };
    }

    return { user, account, error: null };
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
 *   sameSite='none' + secure=true — permite cookies cross-origin (prod)
 *   sameSite='lax' + secure=false — same-origin via proxy Vite (dev)
 */
function setAuthCookie(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction,
        // CORREÇÃO #5: em produção, dashboard e API são cross-origin (subdomínios
        // diferentes). SameSite=Lax bloqueia o cookie lumina_token em requisições
        // POST/PUT/DELETE cross-origin, causando 401/403. SameSite=None + Secure
        // permite o cookie ser enviado cross-origin.
        sameSite: isProduction ? 'none' : 'lax',
        domain: isProduction ? '.luminasink.com' : undefined,
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
        sameSite: isProduction ? 'none' : 'lax',
        domain: isProduction ? '.luminasink.com' : undefined,
        path: '/',
    });
}

module.exports = {
    COOKIE_NAME,
    extractToken,
    verifyRequestAuth,
    verifyRequestAuthWithAccountCheck,
    requireAuth,
    optionalAuth,
    setAuthCookie,
    clearAuthCookie,
};
