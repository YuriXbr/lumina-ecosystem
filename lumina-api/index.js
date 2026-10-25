require('./src/config/runtime');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const cors = require('cors');
const { csrfProtection } = require('./src/utils/csrfMiddleware');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { addLog, forceSendLogs, routeError, sendErrorEmbed, requestLogger } = require('./src/logger/logger.js');
const metrics = require('./src/logger/metrics.js');
const { checkAuth, loginLimiter, registerLimiter, internalKeyCheck } = require('./auth.js');

const app = express();
const port = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
const ip = process.env.IP || process.env.API_BASE_URL || 'localhost';

// csrfProtection agora vem de src/utils/csrfMiddleware.js (double-submit cookie pattern)
// Substitui o pacote deprecated csurf

app.set('trust proxy', process.env.VERCEL ? 1 : (process.env.TRUST_PROXY || 'loopback'));
app.disable('x-powered-by');

// ─── Helmet: proteção via HTTP headers (análise completa na seção de segurança)
// Helmet é adequado para esta API pois:
//   1. Remove X-Powered-By (fingerprinting do Express)
//   2. HSTS (força HTTPS em produção)
//   3. noSniff, frameguard, referrer já configurados — helmet unifica e torna declarativo
//   4. crossOriginResourcePolicy: 'cross-origin' necessário pois a API serve recursos
//      públicos (inventário, skins) acessados por frontends de domínios diferentes
//   5. contentSecurityPolicy: desabilitado globalmente (API REST — sem HTML/scripts),
//      exceto na rota GET / que renderiza HTML (tratado inline abaixo)
//   6. originAgentCluster: separa origens no browser-level, reduz side-channel attacks
//
// Não incluído: expectCt (deprecated), hidePoweredBy (já em helmet), xssFilter (legacy).
try {
    const helmet = require('helmet');
    app.use(helmet({
        contentSecurityPolicy: false,  // API REST; CSP aplicado só no HTML da rota /
        crossOriginEmbedderPolicy: false,  // assets públicos precisam ser incorporáveis
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        hsts: process.env.NODE_ENV === 'production'
            ? { maxAge: 31536000, includeSubDomains: true, preload: true }
            : false,
        frameguard: { action: 'deny' },
    }));
    app.use((req, res, next) => {
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        // CSP restritivo apenas no HTML da rota de listagem de endpoints
        if (req.path === '/' || req.path.endsWith('.html')) {
            res.setHeader('Content-Security-Policy',
                "default-src 'self'; style-src 'unsafe-inline'; " +
                "script-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';"
            );
        }
        next();
    });
} catch {
    // Helmet não instalado ainda — fallback para headers manuais (funcional, apenas
    // menos declarativo). Instalar: npm install helmet
    app.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        res.removeHeader('X-Powered-By');
        if (req.path === '/' || req.path.endsWith('.html')) {
            res.setHeader('Content-Security-Policy',
                "default-src 'self'; style-src 'unsafe-inline'; " +
                "script-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';"
            );
        }
        next();
    });
}

app.use(cookieParser());
app.use(express.json({ limit: '512kb' })); // Limite explícito de payload (evita body bomb)

// ─── Request-ID + requestLogger (rastreabilidade total) ───────────────────────
app.use(require('./src/utils/telemetry').requestTelemetry);
// requestLogger pode ser undefined se o logger for mocked nos testes
if (typeof requestLogger === 'function') {
    app.use(requestLogger());
}

const { isAllowedOrigin } = require('./src/config/allowedOrigins');

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no Origin header (curl, server-to-server, bot)
    // For browser requests, validate against allow-list
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(Object.assign(new Error('Origin not allowed'), { status: 403, code: 'ORIGIN_NOT_ALLOWED' }), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  exposedHeaders: ['X-Request-Id','X-CF-Ray','Server-Timing','Traceparent','Retry-After'],
  credentials: true
}));

app.use((req,res,next) => { res.setHeader('Cache-Control','no-store'); if (req.path !== '/expapi/v1/exchange-token' && req.cookies?.lumina_token && !['GET','HEAD','OPTIONS'].includes(req.method)) return csrfProtection(req,res,next); next(); });

const routes = [];

const _isDev = process.env.NODE_ENV !== 'production';
const loadRoutes = (dir) => {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.lstatSync(filePath).isDirectory()) {
            loadRoutes(filePath);
        } else if (file.endsWith('.js')) {
            let route;
            try {
                route = require(filePath);
            } catch (requireErr) {
                // Um require falho (módulo não encontrado, erro de sintaxe, etc.)
                // NÃO deve crashar todo o servidor — loga e pula esta rota.
                console.error(`[FATAL] Falha ao carregar rota ${filePath}: ${requireErr.message}`);
                addLog('API', 'route.load.fail', `Falha ao carregar ${filePath}: ${requireErr.message}`);
                throw requireErr;
            }
            if (!route || typeof route !== 'object' || typeof route.route !== 'string') {
                return;
            }
            const middlewares = [];

            if (route.apiKeyNeeded) {
                if (_isDev) console.log(`Rota ${route.route} precisa de apiKey`);
                middlewares.push((req, res, next) => {
                    // Accept API key from query param (legacy) or X-Lumina-API-Key header
                    const apiKey = req.headers['x-lumina-api-key'] || '';
                    const expectedKey = process.env.LUMINA_API_KEY || '';
                    const a = Buffer.from(String(apiKey));
                    const b = Buffer.from(String(expectedKey));
                    const valid = expectedKey.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
                    if (!valid) {
                        return res.status(401).send('Invalid or missing API key.');
                    }
                    next();
                });
            }
            if (route.jwtNeeded) {
                if (_isDev) console.log(`Rota ${route.route} precisa de JWT`);
                middlewares.push(async (req, res, next) => {
                    const { verifyRequestAuthWithAccountCheck } = require('./src/utils/authHelpers');
                    const { user, account, error } = await verifyRequestAuthWithAccountCheck(req);
                    if (error) {
                        return res.status(error.status).json({ error: error.message, code: error.code });
                    }
                    req.user = user;
                    req.account = account;
                    next();
                });
            }
            if (route.loginLimiterNeeded) {
                if (_isDev) console.log(`Rota ${route.route} precisa de loginLimiter`);
                // Usar registerLimiter para rotas de registro, loginLimiter para as demais
                if (route.route.includes('/register')) {
                    middlewares.push(registerLimiter);
                } else {
                    middlewares.push(loginLimiter);
                }
            }
            if (route.checkAuthNeeded) {
                if (_isDev) console.log(`Rota ${route.route} precisa de checkAuth`);
                middlewares.push(checkAuth);
            }
            if (route.csrfProtectionNeeded) middlewares.push(csrfProtection);
            if(route.internalKeyNeeded) {
                if (_isDev) console.log(`Rota ${route.route} precisa de internalKey`);
                middlewares.push(internalKeyCheck);
            }

            // ── Rate limiter por IP, opcional, com backoff exponencial ──────
            // Cada rota pode definir:
            //   rateLimiter: ipRateLimiter({ max: 60, windowMs: 60_000 })
            // O middleware é serverless-safe (estado no MongoDB) e nunca
            // bloqueia em NODE_ENV=test.
            if (typeof route.rateLimiter === 'function') {
                middlewares.push(route.rateLimiter);
            }

            const execute = (req,res,next) => Promise.resolve(route.execute(req,res)).catch(next);
            if (route.enabled) {
                if (_isDev) if (_isDev) console.log(`Rota ${route.route} carregada com ${middlewares.length} middlewares.`);
                if (typeof route.execute !== 'function') {
                    console.error(`Error: Route ${route.route} with method ${route.method} does not have a valid execute function.`);
                } else {
                    if(route.method === 'both') {
                        app.get(route.route, ...middlewares, execute);
                        app.post(route.route, ...middlewares, execute);
                        routes.push({ method: 'get/post', route: route.route, description: route.description || 'No description provided' });
                    } else if (route.method === 'both_delete') {
                        // POST e DELETE na mesma rota (ex: deleteGuild que aceita ambos)
                        app.post(route.route, ...middlewares, execute);
                        app.delete(route.route, ...middlewares, execute);
                        routes.push({ method: 'post/delete', route: route.route, description: route.description || 'No description provided' });
                    } else {
                        app[route.method || 'get'](route.route, ...middlewares, execute);
                        routes.push({
                            method: route.method || 'get',
                            route: route.route,
                            description: route.description || 'No description provided'
                        });
                    }
                }
            } else {
                // Rota desativada: registra um handler 501 para feedback claro
                // em vez de deixar o Express retornar 404 (que é confuso)
                const disabledHandler = (req, res) => res.status(501).json({
                    error: 'Esta rota está desativada.',
                    code: 'ROUTE_DISABLED',
                    route: route.route,
                });
                const method = route.method === 'both' ? ['get', 'post']
                             : route.method === 'both_delete' ? ['post', 'delete']
                             : [route.method || 'get'];
                method.forEach(m => app[m](route.route, disabledHandler));
            }
        }
    });
};

loadRoutes(path.join(__dirname, 'src', 'routes'));

const swaggerRoute = require('./src/routes/docs/swagger-route.js');
swaggerRoute(app);

app.get('/expapi/v1/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

app.post('/expapi/v1/validate-token', async (req, res, next) => {
    const { verifyRequestAuthWithAccountCheck } = require('./src/utils/authHelpers');
    const { user, error } = await verifyRequestAuthWithAccountCheck(req);
    if (error) {
        return res.status(401).json({ error: 'Token invalido ou nao fornecido.', code: error.code });
    }
    res.status(200).json({ valid: true, email: user.email });
});

app.get('/expapi/v1/validateAuth', loginLimiter, checkAuth, csrfProtection, (req, res) => {
    res.status(200).send('Valid credentials.');
});

// Função para escapar HTML e prevenir XSS
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

app.get('/health/live', (req,res) => res.json({ok:true}));
app.get('/health/ready', async (req,res) => {
    try { await require('./src/database/services/DataBaseService').connectDatabase(); return res.json({ok:true}); }
    catch { return res.status(503).json({ok:false}); }
});

// Root endpoint removed for security (S-M5) — endpoint enumeration was possible
app.get('/', (req, res) => res.status(204).send());

app.all('*', (req, res) => {
    res.status(404).send('Endpoint Not found.');
});

app.use((err, req, res, next) => {
    // Define safeUrl locally — redact sensitive query params from logs
    const safeUrl = req.originalUrl
        ? req.originalUrl.replace(/([?&])(apiKey|internal-key|token|password|secret|api_key)=([^&]*)/gi, '$1$2=***REDACTED***')
        : req.path || '';

    // Erro específico do csurf quando o token CSRF é inválido/ausente
    if (err.code === 'EBADCSRFTOKEN') {
        console.warn(`[${new Date().toLocaleString('pt-BR')}] CSRF inválido em ${req.method} ${safeUrl}`);
        return res.status(403).json({ error: 'Sessão expirada, tente novamente.', code: 'CSRF_INVALID' });
    }

    // Qualquer outro erro não tratado
    const { routeError } = require('./src/logger/logger.js');
    const status = err.status || err.statusCode || 500;
    return routeError({
        res, error: err,
        route: `${req.method} ${safeUrl}`,
        errorCode: err.code || 'UNHANDLED_ERROR',
        userMsg: 'Erro interno do servidor.',
        status,
        extra: {
            '🌐 Método': req.method,
            '🛣️ Rota': safeUrl,
            '🔑 IP': req.ip || 'desconhecido',
        },
    });
});


// Serverless imports register no timers or global process listeners.
if (require.main === module) {
    const { connectDatabase } = require('./src/database/services/DataBaseService');
    let server, stopping = false;
    const shutdown = async (code = 0) => {
        if (stopping) return;
        stopping = true;
        const deadline = setTimeout(() => process.exit(code || 1), 10000);
        deadline.unref();
        if (server) await new Promise(resolve => server.close(resolve));
        await require('mongoose').disconnect().catch(() => {});
        process.exit(code);
    };
    process.once('SIGTERM', () => shutdown());
    process.once('SIGINT', () => shutdown());
    process.once('uncaughtException', error => { console.error('[fatal]', error.name); void shutdown(1); });
    process.once('unhandledRejection', error => { console.error('[fatal]', error?.name || 'UnhandledRejection'); void shutdown(1); });
    connectDatabase().then(() => { server = app.listen(port, () => console.log(`Lumina API listening on ${port}`)); })
      .catch(error => { console.error('[startup]', error.name); process.exitCode = 1; });
}
module.exports = app;
