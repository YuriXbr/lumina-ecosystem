if (process.env.NODE_ENV === 'production') {
    console.log('Carregando variáveis de ambiente de .env');
    require('@dotenvx/dotenvx').config({ path: '.env' });
} else {
    console.log('Carregando variáveis de ambiente de .env.dev');
    require('@dotenvx/dotenvx').config({path: '.env.dev'});
}
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { addLog, forceSendLogs } = require('./src/logger/logger.js');
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

// Headers de segurança
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // CSP mais restritivo para páginas HTML
    if (req.path === '/' || req.path.endsWith('.html')) {
        res.setHeader('Content-Security-Policy', 
            "default-src 'self'; " +
            "style-src 'unsafe-inline'; " +
            "script-src 'none'; " +
            "object-src 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self';"
        );
    }
    
    next();
});

app.use(cookieParser());
app.use(express.json());

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
            const middlewares = [];

            if (route.apiKeyNeeded) {
                console.log(`Rota ${route.route} precisa de apiKey`);
                middlewares.push((req, res, next) => {
                    const apiKey = req.query.apiKey;
                    if (!apiKey || apiKey !== encodeURIComponent(process.env.LUMINA_API_KEY)) {
                        return res.status(401).send('Invalid or missing API key.');
                    }
                    next();
                });
            }
            if (route.jwtNeeded) {
                console.log(`Rota ${route.route} precisa de JWT`);
                middlewares.push((req, res, next) => {
                    const token = req.headers.authorization.split(' ')[1];
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

            if (route.enabled) {
                console.log(`Rota ${route.route} carregada com ${middlewares.length} middlewares.`);
                if (typeof route.execute !== 'function') {
                    console.error(`Error: Route ${route.route} with method ${route.method} does not have a valid execute function.`);
                } else {
                    if(route.method === 'both') {
                        app.get(route.route, ...middlewares, route.execute);
                        app.post(route.route, ...middlewares, route.execute);
                        routes.push({
                            method: 'get/post',
                            route: route.route,
                            description: route.description || 'No description provided'
                        });
                    } else {
                        app[route.method || 'get'](route.route, ...middlewares, route.execute);
                        routes.push({
                            method: route.method || 'get',
                            route: route.route,
                            description: route.description || 'No description provided'
                        });
                    }
                }
            }
        }
    });
};

loadRoutes(path.join(__dirname, 'src', 'routes'));

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
        console.warn(`CSRF inválido em ${req.method} ${req.originalUrl}`);
        return res.status(403).json({ error: 'Sessão expirada, tente novamente.' });
    }
 
    // Qualquer outro erro não tratado: loga completo no servidor,
    // mas nunca devolve o stack trace pro cliente.
    console.error(`Erro não tratado em ${req.method} ${req.originalUrl}:`, err);
    const status = err.status || err.statusCode || 500;
    return res.status(status).json({ error: 'Erro interno do servidor.' });
});


axios = require('axios');
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

module.exports = app;
