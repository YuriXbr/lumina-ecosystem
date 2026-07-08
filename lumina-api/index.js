if (process.env.NODE_ENV === 'production') {
    console.log('Carregando variáveis de ambiente de .env');
    require('@dotenvx/dotenvx').config({ path: '.env' });
} else {
    console.log('Carregando variáveis de ambiente de .env.dev');
    require('@dotenvx/dotenvx').config({path: '.env.dev'});
}
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const cors = require('cors');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { addLog, forceSendLogs, routeError, sendErrorEmbed, requestLogger } = require('./src/logger/logger.js');
const metrics = require('./src/logger/metrics.js');
const { checkAuth, loginLimiter, registerLimiter, internalKeyCheck } = require('./auth.js');

const app = express();
const port = process.env.PORT || process.env.DASHBOARD_PORT;
const ip = process.env.IP || process.env.API_BASE_URL || 'localhost';

const csrfProtection = csrf({ 
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // true em produção HTTPS
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' para cross-origin HTTPS
        maxAge: 60 * 60 * 1000 // 1 hora
    }
});

app.set('trust proxy', 1);

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
app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
});
// requestLogger pode ser undefined se o logger for mocked nos testes
if (typeof requestLogger === 'function') {
    app.use(requestLogger());
}

const allowedOrigins = [
  'https://luminasink.me',
  'https://www.luminasink.me',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://lumina-api-tau.vercel.app',
  'https://bot.luminasink.com'
];

const isVercelTestEnv = (origin) => {
  const vercelRegex = /^https:\/\/[a-zA-Z0-9-]+-yurixbrs-projects\.vercel\.app$/;
  return vercelRegex.test(origin);
};

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || isVercelTestEnv(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Origin não permitida por CORS: ' + origin), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

const routes = [];

const loadRoutes = (dir) => {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.lstatSync(filePath).isDirectory()) {
            loadRoutes(filePath);
        } else if (file.endsWith('.js')) {
            const route = require(filePath);
            if (!route || typeof route !== 'object' || typeof route.route !== 'string') {
                return;
            }
            const middlewares = [];

            if (route.apiKeyNeeded) {
                console.log(`Rota ${route.route} precisa de apiKey`);
                middlewares.push((req, res, next) => {
                    const apiKey = req.query.apiKey || '';
                    const expectedKey = encodeURIComponent(process.env.LUMINA_API_KEY || '');
                    // CORREÇÃO: comparação com !== vaza o tamanho/posição do primeiro
                    // byte divergente através do tempo de execução (timing attack).
                    // Usamos o mesmo padrão de crypto.timingSafeEqual já usado em
                    // auth.js (internalKeyCheck) para as demais chaves da API.
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
                console.log(`Rota ${route.route} precisa de JWT`);
                middlewares.push((req, res, next) => {
                    const authHeader = req.headers.authorization;
                    if (!authHeader || !authHeader.startsWith('Bearer ')) {
                        return res.status(401).json({ error: 'Token não fornecido.' });
                    }
                    const token = authHeader.split(' ')[1];
                    if (!token) {
                        return res.status(401).send('Invalid token.');
                    }
                    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                        if (err) {
                            return res.status(401).send('Invalid token.');
                        }
                        req.user = decoded;
                        next();
                    });
                });
            }
            if (route.loginLimiterNeeded) {
                console.log(`Rota ${route.route} precisa de loginLimiter`);
                // Usar registerLimiter para rotas de registro, loginLimiter para as demais
                if (route.route.includes('/register')) {
                    middlewares.push(registerLimiter);
                } else {
                    middlewares.push(loginLimiter);
                }
            }
            if (route.checkAuthNeeded) {
                console.log(`Rota ${route.route} precisa de checkAuth`);
                middlewares.push(checkAuth);
            }
            if (route.csrfProtectionNeeded) {
                if(process.env.NODE_ENV === 'production') {
                    console.log(`Rota ${route.route} precisa de csrfProtection`);
                    middlewares.push(csrfProtection);
                } else { 
                    console.log(`Rota ${route.route} não tem csrfProtection por estar em desenvolvimento`);
                }
            }
            if(route.internalKeyNeeded) {
                console.log(`Rota ${route.route} precisa de internalKey`);
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

            if (route.enabled) {
                console.log(`Rota ${route.route} carregada com ${middlewares.length} middlewares.`);
                if (typeof route.execute !== 'function') {
                    console.error(`Error: Route ${route.route} with method ${route.method} does not have a valid execute function.`);
                } else {
                    if(route.method === 'both') {
                        app.get(route.route, ...middlewares, route.execute);
                        app.post(route.route, ...middlewares, route.execute);
                        routes.push({ method: 'get/post', route: route.route, description: route.description || 'No description provided' });
                    } else if (route.method === 'both_delete') {
                        // POST e DELETE na mesma rota (ex: deleteGuild que aceita ambos)
                        app.post(route.route, ...middlewares, route.execute);
                        app.delete(route.route, ...middlewares, route.execute);
                        routes.push({ method: 'post/delete', route: route.route, description: route.description || 'No description provided' });
                    } else {
                        app[route.method || 'get'](route.route, ...middlewares, route.execute);
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
    console.log('CSRF token solicitado, cookies:', req.headers.cookie);
    res.json({ csrfToken: req.csrfToken() });
});

app.post('/expapi/v1/validate-token', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('You need an authorization token to access this.');
    }
    
    const headerParts = authHeader.split(' ');
    if (headerParts.length !== 2 || headerParts[0] !== 'Bearer') {
        return res.status(401).send('Invalid authorization header format. Use: Bearer <token>');
    }
    
    const token = headerParts[1];
    if (!token) {
        return res.status(401).send('Token not provided.');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).send('Invalid token.');
        res.status(200).send('Valid token.');
    });
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

app.get('/', (req, res) => {
    const apiRoutes = routes.filter(route => route.route.startsWith('/api/')).map(route => `
        <tr>
            <td>${escapeHtml(route.method.toUpperCase())}</td>
            <td>${escapeHtml(route.route)}</td>
            <td>${escapeHtml(route.description || 'No description provided')}</td>
        </tr>
    `).join('');

    const expApiRoutes = routes.filter(route => route.route.startsWith('/expapi/')).map(route => `
        <tr>
            <td>${escapeHtml(route.method.toUpperCase())}</td>
            <td>${escapeHtml(route.route)}</td>
            <td>${escapeHtml(route.description || 'No description provided')}</td>
        </tr>
    `).join('');

    const html = `
        <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Lumina API - Endpoints</title>
                <style>
                    body {
                        background-color: black;
                        color: white;
                        font-family: Arial, sans-serif;
                        margin: 20px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    th, td {
                        border: 1px solid white;
                        padding: 8px;
                        text-align: left;
                        word-break: break-word;
                    }
                    th {
                        background-color: #333;
                    }
                    h1, h2 {
                        color: #fff;
                    }
                </style>
            </head>
            <body>
                <h1>Lumina API - Endpoints Disponíveis</h1>
                <h2>PRODUCTION API</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Método</th>
                            <th>Endpoint</th>
                            <th>Descrição</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${apiRoutes}
                    </tbody>
                </table>
                <h2>EXPERIMENTAL API</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Método</th>
                            <th>Endpoint</th>
                            <th>Descrição</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expApiRoutes}
                    </tbody>
                </table>
                <footer style="margin-top: 40px; color: #666; font-size: 12px;">
                    <p>Lumina Bot API</p>
                </footer>
            </body>
        </html>
    `;

    res.status(200).send(html);
});

app.all('*', (req, res) => {
    res.status(404).send('Endpoint Not found.');
});

app.use((err, req, res, next) => {
    // Erro específico do csurf quando o token CSRF é inválido/ausente
    if (err.code === 'EBADCSRFTOKEN') {
        console.warn(`[${new Date().toLocaleString('pt-BR')}] CSRF inválido em ${req.method} ${req.originalUrl}`);
        return res.status(403).json({ error: 'Sessão expirada, tente novamente.', code: 'CSRF_INVALID' });
    }

    // Qualquer outro erro não tratado
    const { routeError } = require('./src/logger/logger.js');
    const status = err.status || err.statusCode || 500;
    return routeError({
        res, error: err,
        route: `${req.method} ${req.originalUrl}`,
        errorCode: err.code || 'UNHANDLED_ERROR',
        userMsg: 'Erro interno do servidor.',
        status,
        extra: {
            '🌐 Método': req.method,
            '🛣️ Rota': req.originalUrl,
            '🔑 IP': req.ip || 'desconhecido',
        },
    });
});


// Só inicia o servidor quando este arquivo é executado diretamente
// (node index.js), nunca quando é importado como módulo pelos testes
// (require('../index')). Sem isso, cada arquivo de teste tentava abrir
// a porta 3000 e o segundo encontrava EADDRINUSE.
if (require.main === module) {
    (async () => {
        try {
            app.listen(port, async () => {
                addLog('API', 'start', `API iniciada em ${ip}`);
                console.log(`API iniciada em ${ip}`);
            });
        } catch (error) {
            addLog('API', 'start', `Erro ao iniciar API: ${error}`);
            console.error('Error starting API:', error);
            forceSendLogs();
            process.exit(1);
        }
    })();
}

module.exports = app;
