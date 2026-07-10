# Lumina Bot API — Documentação Completa de Arquitetura

> **Para quem é este documento**: qualquer desenvolvedor (inclusive júnior) que
> precise entender como a API do Lumina Bot funciona, como cada camada de
> segurança se encaixa, e onde mexer sem quebrar nada.
>
> **Leia na ordem**: Visão Geral → Estrutura de Pastas → Camada de Segurança →
> Rotas → Banco de Dados → Logging → Frontend → Deploy.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Bootstrap: como o servidor sobe](#3-bootstrap-como-o-servidor-sobe)
4. [Camada de Segurança (a parte mais importante)](#4-camada-de-segurança-a-parte-mais-importante)
   - 4.1 [Autenticação: Cookie httpOnly + JWT](#41-autenticação-cookie-httponly--jwt)
   - 4.2 [CSRF: Double-Submit Cookie](#42-csrf-double-submit-cookie)
   - 4.3 [Rate Limiting](#43-rate-limiting)
   - 4.4 [Helmet e Security Headers](#44-helmet-e-security-headers)
   - 4.5 [CORS](#45-cors)
   - 4.6 [Per-Account Lockout](#46-per-account-lockout)
5. [Sistema de Rotas (auto-loading)](#5-sistema-de-rotas-auto-loading)
6. [OAuth2 (Discord)](#6-oauth2-discord)
7. [Banco de Dados (MongoDB + Mongoose)](#7-banco-de-dados-mongodb--mongoose)
8. [Sistema de Logging e Observabilidade](#8-sistema-de-logging-e-observabilidade)
9. [Identidade Pública (username + displayName)](#9-identidade-pública-username--displayname)
10. [Fechamento de Conta (TTL 30 dias)](#10-fechamento-de-conta-ttl-30-dias)
11. [Rotas Internas (Bot ↔ API)](#11-rotas-internas-bot--api)
12. [Dashboard (Frontend React)](#12-dashboard-frontend-react)
13. [Variáveis de Ambiente](#13-variáveis-de-ambiente)
14. [Deploy (Vercel)](#14-deploy-vercel)
15. [Checklist de Segurança](#15-checklist-de-segurança)
16. [FAQ de Desenvolvimento](#16-faq-de-desenvolvimento)

---

## 1. Visão Geral

O Lumina Bot é um bot Discord para jogadores de League of Legends. O projeto
tem três partes:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Dashboard  │────▶│     API     │────▶│  MongoDB    │
│  (React/Vite)│ HTTP │ (Express)   │     │ (Mongoose)  │
│  porta 5173  │cookie│ porta 3000  │     │ Atlas/Vercel│
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │     Bot     │
                    │ (Discord.js)│
                    │  porta —    │
                    └─────────────┘
```

- **Dashboard** (`/dashboard`): SPA React que o usuário acessa no navegador.
  Faz chamadas HTTP para a API. Autentica via cookie httpOnly.
- **API** (`/api`): servidor Express que recebe todas as requisições, valida
  auth, consulta o banco, e responde. Hospedada na Vercel (serverless).
- **Bot** (`/bot`): processo Node.js que conecta ao Discord via WebSocket,
  executa comandos, e fala com a API via rotas internas (com `internal-key`).

### Stack

| Camada | Tecnologia | Porquê |
|--------|-----------|--------|
| Runtime | Node.js 18+ | LTS, suporte a ESM e top-level await |
| Framework HTTP | Express 4 | Maduro, ecosystem enorme, simples |
| Banco | MongoDB + Mongoose 8 | Schema flexível, serverless-friendly |
| Auth | JWT (cookie httpOnly) | Stateless, escala em serverless sem sessão |
| Rate limit | express-rate-limit + MongoDB store | Serverless-safe (estado no DB, não em memória) |
| CSRF | Double-submit cookie custom | Substitui `csurf` deprecated |
| hashing senha | bcryptjs (pure JS) | Sem compilação native, funciona em Vercel |
| OAuth2 | Discord (extensível a Google/GitHub) | Login social com auto-criação de conta |
| Docs API | OpenAPI 3.0.3 + Swagger UI | Spec em `swagger.yaml`, servida em `/docs` |

---

## 2. Estrutura de Pastas

```
api/
├── index.js                  # Bootstrap: Express app, middlewares, route loader
├── auth.js                   # checkAuth, loginLimiter, registerLimiter, internalKeyCheck
├── vercel.json               # Config Vercel (rewrites para index.js)
├── swagger.yaml              # Spec OpenAPI 3.0.3 (4210 linhas)
├── package.json
├── .env                      # SECRETS — NUNCA commitar (ver .gitignore)
├── .env.dev                  # SECRETS dev — NUNCA commitar
├── .env.example              # Template sem secrets (commitar)
└── src/
    ├── config/
    │   └── allowedOrigins.js # Allow-list CORS + OAuth (única fonte de verdade)
    ├── database/
    │   ├── schema.js         # Todos os schemas Mongoose (bot, guilds, accounts, etc.)
    │   └── services/         # Uma classe por collection (CRUD + regras de negócio)
    │       ├── DataBaseService.js      # Base: connect, get, getOne, create, update, delete
    │       ├── DashboardAccountService.js  # Contas de usuário (login, senha, OAuth, username)
    │       ├── GuildService.js         # Guildas do Discord (onde o bot está)
    │       ├── BotService.js           # Config do bot (token, clientId, etc.)
    │       ├── UserInventoryService.js # Inventário de skins/baús
    │       ├── SkinService.js          # Catálogo de skins
    │       ├── LogService.js           # Persistência de logs no MongoDB
    │       ├── NewsService.js          # Feed de novidades
    │       └── ... (ban/mute/warn/champions/universes)
    ├── logger/
    │   ├── logger.js         # addLog, routeError, sendErrorEmbed, requestLogger
    │   └── metrics.js        # Métricas em memória (rotas, erros, uptime)
    ├── oauthProviders/
    │   ├── index.js          # Registry: getProvider('discord')
    │   ├── discordProvider.js # getAuthorizationUrl, exchangeCode, getProfile
    │   └── state.js          # signState/verifyState (HMAC-SHA256 anti-forgery)
    ├── routes/
    │   ├── docs/
    │   │   └── swagger-route.js  # Serve Swagger UI em /docs
    │   └── expapi/
    │       ├── Oauth2/
    │       │   ├── authStart.js   # GET /oauth2/:provider/auth/start
    │       │   └── authCallback.js # GET /oauth2/:provider/auth/callback
    │       ├── v1/
    │       │   ├── login.js
    │       │   ├── register.js
    │       │   ├── logout.js
    │       │   ├── session.js          # NOVO: estado da sessão via cookie
    │       │   ├── getUserProfile.js
    │       │   ├── updateUserSettings.js
    │       │   ├── userIdentity.js     # username + displayName
    │       │   ├── userCheckUsername.js
    │       │   ├── setPassword.js
    │       │   ├── closeAccount.js
    │       │   ├── cancelCloseAccount.js
    │       │   ├── discordInfo.js
    │       │   ├── myGuilds.js
    │       │   ├── myInventory.js
    │       │   ├── dailyReward.js
    │       │   ├── news.js             # GET público
    │       │   ├── publicProfile.js    # GET /public-profile/:identifier
    │       │   ├── unlinkDiscord.js
    │       │   ├── discord/
    │       │   │   └── getGuildInfo.js # IDOR-protected
    │       │   └── admin/
    │       │       ├── getMetrics.js
    │       │       ├── getUsers.js
    │       │       ├── updateUser.js   # Privilege-escalation-protected
    │       │       ├── getGuilds.js
    │       │       ├── updateGuild.js
    │       │       ├── getLogs.js
    │       │       └── news.js         # POST/DELETE (admin only)
    │       └── internal/  # Bot ↔ API (precisa de internal-key)
    │           ├── fetchuserskins.js
    │           ├── fetchinventory.js
    │           ├── newguild.js
    │           ├── updateguilddata.js  # Mass-assignment-protected
    │           ├── deleteguild.js
    │           ├── fetchguilddata.js
    │           ├── fetchbot.js
    │           ├── updatebot.js
    │           ├── fetchstaff.js
    │           ├── commandlog.js
    │           ├── rollskin.js
    │           ├── addskin.js
    │           ├── claimdaily.js
    │           ├── newpunishrecord.js
    │           ├── modifypunishrecord.js  # Mass-assignment-protected
    │           └── removepunishrecord.js
    ├── utils/
    │   ├── authHelpers.js        # extractToken, verifyRequestAuth, setAuthCookie
    │   ├── csrfMiddleware.js     # csrfProtection (double-submit cookie)
    │   ├── identityValidation.js # username/displayName validation + blacklist
    │   ├── ipRateLimiter.js      # Rate limiter serverless (MongoDB store)
    │   ├── resolveDiscordAccount.js
    │   └── gachaService.js
    └── ThirdParty/
        └── riotApi.js            # Wrapper da Riot Games API
```

---

## 3. Bootstrap: como o servidor sobe

O `index.js` é o entrypoint. A ordem de inicialização importa:

```
1. Carrega .env (dotenvx) — .env em produção, .env.dev em desenvolvimento
2. Cria app Express
3. Registra middlewares GLOBAIS (ordem importa!):
   a. Helmet (security headers)
   b. cookie-parser (precisa antes do CSRF)
   c. express.json (body parser, limit 512kb)
   d. Request-ID generator (crypto.randomUUID em cada req)
   e. requestLogger (loga TODA req no MongoDB + console)
   f. CORS (usa allowedOrigins.js)
4. Registra rotas especiais em /expapi/v1/csrf-token e /validate-token
5. Carrega TODAS as rotas de src/routes/ recursivamente (loadRoutes)
   - Para cada arquivo, lê os flags (jwtNeeded, csrfNeeded, etc.) e monta middlewares
   - Registra no Express com app.get/app.post/...
6. Registra error handler global (CSRF errors, unhandled errors)
7. app.listen() — só em não-Vercel; Vercel usa module.exports = app
```

### Detalhe importante: loadRoutes

Cada arquivo em `src/routes/` exporta um objeto. O `loadRoutes` percorre a
árvore de diretórios recursivamente e, para cada arquivo:

```js
const route = require(filePath);
// Lê os flags e monta middlewares na ORDEM:
//   1. apiKeyNeeded     → valida ?apiKey=... (timing-safe)
//   2. jwtNeeded        → valida Authorization: Bearer (popula req.user)
//   3. loginLimiterNeeded → aplica rate limit (5/min para login, 3/hora para register)
//   4. checkAuthNeeded  → middleware checkAuth (legacy, mesmo que jwtNeeded)
//   5. csrfProtectionNeeded → valida X-CSRF-Token vs cookie
//   6. internalKeyNeeded → valida header internal-key (bot ↔ API)
//   7. rateLimiter (se definido na rota) → IP rate limiter custom
// Depois: app[method](route.path, ...middlewares, route.execute)
```

**Peculiaridade**: `csrfProtectionNeeded` só é aplicado em produção
(`NODE_ENV === 'production'`). Em dev, é pulado para facilitar testes com
curl/Postman sem precisar gerar token CSRF.

---

## 4. Camada de Segurança (a parte mais importante)

A segurança da API é feita em **7 camadas sobrepostas** (defense in depth).
Cada uma protege contra uma classe de ataque diferente. Nenhuma camada é
suficiente sozinha — todas trabalham juntas.

### 4.1 Autenticação: Cookie httpOnly + JWT

**Como funciona:**

1. Usuário faz login (`POST /expapi/v1/login`) com email + senha
2. API valida credenciais com `bcrypt.compareSync(password, account.password)`
3. API gera um JWT com `jwt.sign({ email, accountId, ... }, JWT_SECRET, { expiresIn: '1h' })`
4. API seta o JWT em um cookie **httpOnly**:
   ```http
   Set-Cookie: lumina_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=3600; Path=/
   ```
5. O browser armazena o cookie e o envia automaticamente em toda requisição

**Por que cookie httpOnly e não localStorage?**

| | localStorage | Cookie httpOnly |
|---|---|---|
| JavaScript consegue ler? | ✅ SIM | ❌ NÃO |
| XSS pode roubar o token? | ✅ SIM | ❌ NÃO |
| Enviado automaticamente? | ❌ (precisa header manual) | ✅ |
| Expira automaticamente? | ❌ (precisa cleanup manual) | ✅ (Max-Age) |

O `localStorage` era usado antes e era a vulnerabilidade mais crítica —
qualquer XSS (mesmo de uma lib comprometida) podia roubar o token e
sequestrar a sessão. O cookie httpOnly é **imune a XSS** porque o JavaScript
não consegue lê-lo.

**Compatibilidade (dual auth):**

A API aceita auth por cookie **OU** por header `Authorization: Bearer`. O
header Bearer é mantido para clients não-browser (CLI, scripts, testes) que
não gerenciam cookies. A função `verifyRequestAuth(req)` em
`src/utils/authHelpers.js` tenta cookie primeiro, depois header:

```js
function extractToken(req) {
    if (req.cookies?.lumina_token) return req.cookies.lumina_token;
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
    return null;
}
```

**Flags do JWT:**
- `expiresIn: '1h'` — token expira em 1 hora
- `JWT_SECRET` — deve ter pelo menos 32 caracteres de entropia
- Sem refresh token rotation (TODO futuro: 15min access + 7d refresh)

**Helper: `setAuthCookie(res, token)`**

```js
res.cookie('lumina_token', token, {
    httpOnly: true,                    // JS não lê
    secure: process.env.NODE_ENV === 'production',  // só HTTPS em prod
    sameSite: 'lax',                   // protege contra CSRF cross-site
    maxAge: 60 * 60 * 1000,            // 1 hora
    path: '/',
});
```

### 4.2 CSRF: Double-Submit Cookie

**O problema CSRF**: se o usuário está logado no Lumina e visita um site
malicioso, esse site pode fazer `fetch('https://api.lumina.../delete-account',
{ method: 'POST', credentials: 'include' })`. O browser envia o cookie de
auth automaticamente → a API pensa que é o usuário legítimo.

**A solução**: double-submit cookie pattern.

1. Frontend chama `GET /expapi/v1/csrf-token`
2. API gera um token aleatório (32 bytes, `crypto.randomBytes`)
3. API seta em um cookie **NÃO-httpOnly** (JS precisa ler):
   ```http
   Set-Cookie: csrf_token=<random>; SameSite=Lax; Max-Age=3600
   ```
4. API também retorna o token no JSON: `{ csrfToken: "<random>" }`
5. Frontend lê o token e inclui no header de TODA requisição state-changing:
   ```http
   X-CSRF-Token: <random>
   ```
6. O middleware `csrfProtection` valida que o header `X-CSRF-Token` é igual
   ao cookie `csrf_token`. Se não bater → 403 `EBADCSRFTOKEN`.

**Por que isso funciona?** Um site malicioso (cross-origin) não consegue ler
o cookie `csrf_token` do domínio da API (same-origin policy). Sem o token,
não consegue incluir no header → requisição é rejeitada.

**Implementação**: `src/utils/csrfMiddleware.js` (custom, substitui o
`csurf` deprecated desde 2021).

**Peculiaridade**: CSRF só é aplicado em `NODE_ENV === 'production'`. Em
dev, é pulado para facilitar testes com curl/Postman.

### 4.3 Rate Limiting

Três layers de rate limiting:

| Layer | Escopo | Limite | Onde |
|-------|--------|--------|------|
| `loginLimiter` | Por IP | 5 req/min | Rotas com `loginLimiterNeeded: true` (login, validate-token) |
| `registerLimiter` | Por IP | 3 req/hora | Rotas de registro |
| `ipRateLimiter` | Por IP + rota | Custom (ex: 120/min) | Rotas públicas como fetchuserskins |

**Serverless-safe**: o `express-rate-limit` padrão guarda estado em memória,
que é perdido a cada cold start na Vercel. O `ipRateLimiter` custom usa
MongoDB como store (`src/utils/ipRateLimiter.js`), com backoff exponencial
entre bloqueios.

**Peculiaridade**: em `NODE_ENV === 'test'`, todos os rate limiters são
desativados (pass-through) para não gerar 429 espúrios nos testes.

### 4.4 Helmet e Security Headers

O Helmet configura automaticamente:
- `X-Content-Type-Options: nosniff` (anti MIME-sniffing)
- `X-Frame-Options: DENY` (anti clickjacking)
- `Strict-Transport-Security` (HSTS, só em produção com HTTPS)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- Remove `X-Powered-By` (anti fingerprinting)

**CSP**: desabilitado globalmente (API REST não serve HTML). Aplicado só na
rota `/` que renderiza HTML simples.

### 4.5 CORS

A allow-list de origens permitidas vive em **um único lugar**:
`src/config/allowedOrigins.js`. Tanto o middleware CORS do Express quanto o
`isAllowedOrigin` do OAuth usam essa lista.

```js
const ALLOWED_ORIGINS = [
    'https://luminasink.me',
    'https://www.luminasink.me',
    'https://bot.luminasink.com',
    'https://lumina-api-tau.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    // ...
];
```

**Peculiaridade**: em não-produção, também aceita previews Vercel do
projeto (`*-yurixbrs-projects.vercel.app`) via regex.

**CORS config**:
```js
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || isAllowedOrigin(origin)) callback(null, true);
        else callback(new Error('Origin não permitida'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,  // ESSENCIAL para cookies cross-origin
}));
```

`credentials: true` é necessário para o browser enviar cookies
cross-origin (dashboard em `bot.luminasink.com` → API em
`api.bot.luminasink.com`).

### 4.6 Per-Account Lockout

Após 5 tentativas incorretas de `currentPassword` em
`PUT /expapi/v1/user/set-password`, a conta é bloqueada por 15 minutos para
troca de senha. Isso previne brute-force de senha atual mesmo com JWT válido.

Implementado nos campos `passwordAttempts` e `passwordLockedUntil` do schema
`dashboardAccounts`. Resetado em sucesso ou após expirar o lockout.

---

## 5. Sistema de Rotas (auto-loading)

Cada arquivo em `src/routes/` exporta um objeto com a configuração da rota:

```js
module.exports = {
    route: '/expapi/v1/login',        // Path (com :param para dinâmicos)
    description: 'Dashboard login',   // Para docs
    apiKeyNeeded: false,              // ?apiKey=... (legacy)
    jwtNeeded: false,                 // Authorization: Bearer
    internalKeyNeeded: false,         // header internal-key (bot)
    loginLimiterNeeded: true,         // Rate limit de login
    csrfProtectionNeeded: true,       // Exige X-CSRF-Token
    checkAuthNeeded: false,           // Middleware checkAuth legacy
    enabled: true,                    // Se false, retorna 501
    method: 'post',                   // get | post | put | delete | both | both_delete
    rateLimiter: ipRateLimiter({...}), // Opcional: rate limiter custom
    async execute(req, res) { ... },  // Handler
};
```

**`method` especial:**
- `both` → registra GET e POST no mesmo path
- `both_delete` → registra POST e DELETE no mesmo path

**Rotas desativadas** (`enabled: false`) retornam 501 ao invés de 404, para
feedback claro de que existem mas estão off.

---

## 6. OAuth2 (Discord)

O fluxo OAuth2 permite login/cadastro automático via Discord. A arquitetura
é modular — plugar Google/GitHub depois é só criar um provider em
`src/oauthProviders/`.

### Fluxo completo

```
1. Usuário clica "Continuar com Discord" no dashboard
2. Frontend: window.location.href = /expapi/oauth2/discord/auth/start?origin=...&intent=login
3. API (authStart.js):
   - Valida origin contra allowedOrigins.js
   - Gera state assinado com HMAC (anti CSRF do OAuth)
   - Redirect para https://discord.com/oauth2/authorize?client_id=...&scope=identify+email+guilds&state=...
4. Usuário autoriza no Discord
5. Discord redirect para /expapi/oauth2/discord/auth/callback?code=...&state=...
6. API (authCallback.js):
   - Verifica state (HMAC válido + não expirado + origin correto)
   - Troca code por access_token (POST /oauth2/token no Discord)
   - Busca profile do usuário (GET /users/@me no Discord)
   - Intent = login: busca conta por providerId ou email; se não existe, cria
   - Intent = register: cria conta nova (erro se email já existe)
   - Intent = link: vincula Discord a conta já logada (precisa de cookie válido)
   - SETA COOKIE httpOnly com JWT
   - Redirect para {origin}/oauth/complete#isNewAccount=true&hasPassword=false
     (NOTA: o JWT vai no COOKIE, não no fragment da URL — isso mudou!)
7. Frontend (OAuthCompletePage):
   - Lê flags do fragment
   - Chama onLoginSuccess() que busca /session (cookie já está setado)
   - Redirect para /members ou /settings?setupPassword=1
```

### Scopes do Discord

```
identify  → username, avatar, id
email     → email (verified)
guilds    → lista de servidores do usuário (necessário para /my-guilds)
```

### Peculiaridades

- **State assinado**: o parâmetro `state` do OAuth é um JSON base64 + HMAC.
  Impede que atacante forje um state com `linkAccountId` de outra pessoa.
  Ver `src/oauthProviders/state.js`.
- **Auto-criação de conta**: contas criadas via Discord nascem **sem senha**.
  O usuário define depois em `/settings`.
- **Username automático**: contas novas via Discord pegam o `global_name` do
  Discord como username e displayName (se disponível e válido).
- **Refresh token**: se o `discordOauth2Token` expirou, a API faz refresh
  automático usando `discordOauth2RefreshToken` (rotas discordInfo, myGuilds,
  getGuildInfo).

---

## 7. Banco de Dados (MongoDB + Mongoose)

### Conexão

MongoDB Atlas (produção) ou local (dev). A conexão é lazy — `connect()` é
chamado em cada service no primeiro acesso, com check de `readyState` para
evitar reconnects desnecessários.

### Schema principal: `dashboardAccounts`

Campos de identidade pública (redesign v3):

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `accountId` | String (UUID) | PK, gerado com `crypto.randomUUID()` |
| `email` | String | Único, lower-case |
| `password` | String (bcrypt) | Vazio para contas OAuth2 |
| `accessType` | String | user/vipUser/.../owner |
| `discordOauth2Id` | String | ID do Discord |
| `discordOauth2Token` | String | Access token (criptografado? não — TODO) |
| `discordOauth2RefreshToken` | String | Refresh token |
| `username` | String | Handle único (4-16 chars, case-insensitive) |
| `usernameLower` | String | Cópia lower-case para busca |
| `usernameChangedAt` | Date | Cooldown 30 dias |
| `displayName` | String | Nome livre (1-32 chars) |
| `displayNameChangedAt` | Date | Cooldown 24h |
| `deletionRequestedAt` | Date | Se setado, conta será excluída |
| `deletionScheduledFor` | Date | Data agendada (requestAt + 30 dias) |
| `passwordAttempts` | Number | Contador de tentativas incorretas |
| `passwordLockedUntil` | Date | Lockout de 15min após 5 tentativas |

### Demais collections

- `bot` — config do bot (token, clientId, owners, staff)
- `guilds` — guildas onde o bot está (config por servidor)
- `inventory` — inventário de cada usuário (baús, chaves, skins)
- `skins` — catálogo de skins (championId → rarity → skinId)
- `apiLogs` — logs de todas as requisições (TTL 30 dias)
- `apiCache` — cache persistente (serverless-safe)
- `ipRateLimits` — estado do rate limiter (serverless-safe)
- `newsPosts` — feed de novidades
- `punishList` — registros de ban/mute/warn

### Service pattern

Cada collection tem um service que herda de `DataBaseService`:

```js
class DashboardAccountService extends DatabaseService {
    constructor() {
        super('dashboardaccounts', mongoSchema.dashboardAccounts);
    }
    // Métodos específicos...
}
module.exports = new DashboardAccountService(); // Singleton
```

`DataBaseService` fornece: `getAll`, `get`, `getOne`, `create`, `update`,
`delete`. O `update` detecta se o caller já usa operadores (`$set`, `$inc`)
ou não — se não usa, envolve em `$set` automaticamente (evita
substitution-document acidental).

---

## 8. Sistema de Logging e Observabilidade

### Request Logger (middleware global)

TODA requisição passa por `requestLogger()`. Para cada req:

1. Gera `requestId` (UUID) no início
2. No evento `res.finish`, calcula duração
3. Loga no MongoDB (via `LogService.write`) com:
   - level: info (2xx), warn (4xx), error (5xx)
   - type: API
   - method, route, statusCode, durationMs, ip, userEmail, userAgent
4. Atualiza métricas em memória (`metrics.recordRequest`, `recordError`)

### routeError (helper de erro padronizado)

Quando uma rota encontra um erro, chama `routeError({ res, error, route,
errorCode, userMsg, extra })`:

1. Loga no console: `[timestamp] [ROUTE ERROR] [requestId] route | code | message`
2. Registra nas métricas em memória
3. Persiste no MongoDB (LogService)
4. Envia embed para webhook do Discord (sendErrorEmbed) — **com sanitização**:
   - Stack trace truncado a 5 linhas / 500 chars
   - Emails, IPs e tokens longos são redacted (`[email]`, `[ip]`, `[token]`)
5. Retorna HTTP 500 com `{ error, code, requestId }` para o cliente

### Métricas (em memória)

`src/logger/metrics.js` mantém em memória:
- `totalRequests`, `totalErrors`
- `routeStats` (Map): count, errorCount, avgDurationMs, statusCodes, lastCalledAt
- `recentErrors` (array, max 50): id, route, method, status, message, at

Exposto via `GET /expapi/v1/admin/metrics` (admin only).

**Peculiaridade serverless**: como a Vercel recicla processos, as métricas
em memória resetam a cada cold start. Para métricas persistentes, consultar
os logs no MongoDB.

---

## 9. Identidade Pública (username + displayName)

### Regras

**username**:
- 4-16 caracteres
- Apenas `[A-Za-z0-9_]`
- Não pode começar/terminar com `_`
- Não pode conter `__` (dois underscores seguidos)
- Não pode ser apenas números
- Case-insensitive para unicidade (guarda `usernameLower` como índice)
- Preserva a capitalização original escolhida pelo usuário
- Blacklist de 80+ palavras (lumina, admin, discord, riot, etc.) + match
  por substring para marcas
- Cooldown: 30 dias entre mudanças

**displayName**:
- 1-32 caracteres
- Pode conter espaços, acentos, emoji
- Filtrado: zero-width chars, directional control chars, chars de controle
  são removidos (anti spoofing visual)
- Cooldown: 24h entre mudanças

### Resolução de perfil público

`GET /expapi/v1/public-profile/:identifier` aceita:
1. UUID (`accountId`) — formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
2. Discord ID — 17-19 dígitos
3. username (case-insensitive)

A API detecta o formato e busca no campo apropriado.

---

## 10. Fechamento de Conta (TTL 30 dias)

### Fluxo

1. Usuário vai em Settings → Conta → "Agendar fechamento"
2. Digita `EXCLUIR` para confirmar
3. Frontend: `POST /expapi/v1/user/close-account` com `{ confirm: true }`
4. API: seta `deletionRequestedAt = now` e `deletionScheduledFor = now + 30 dias`
5. API: retorna mensagem "Sua conta será excluída em DD/MM/AAAA..."
6. A cada login subsequente: `login.js` detecta `deletionRequestedAt` e
   chama `cancelAccountClosure()` — **login cancela a exclusão**
7. Se passar 30 dias sem login: TODO — implementar cron job que deleta
   contas com `deletionScheduledFor < now`

### Peculiaridade

Contas admin (level 7+) não podem se auto-fechar via painel — precisam
contatar suporte. Prevenção contra auto-sabotagem de admin.

---

## 11. Rotas Internas (Bot ↔ API)

Rotas em `src/routes/expapi/internal/` são chamadas pelo bot Discord, não
pelo dashboard. Usam o header `internal-key` (validado com
`crypto.timingSafeEqual` contra `process.env.INTERNAL_API_KEY`).

**Defesa em depth**: mesmo com `internal-key`, rotas que aceitam update de
dados têm **whitelist de campos** (mass-assignment protection):
- `updateGuildData.js` — só aceita campos de `ALLOWED_GUILD_FIELDS`
- `ModifyPunishRecord.js` — só aceita `{ reason, endTime, staffId }`

Se o `INTERNAL_API_KEY` vazar, o atacante não consegue sobrescrever `_id`,
`guildOwnerId`, etc.

---

## 12. Dashboard (Frontend React)

### Auth flow (cookie-based)

```
1. User abre /members
2. UserContext chama GET /session (credentials: include)
3. API lê cookie lumina_token, verifica JWT, retorna { authenticated, user }
4. Se authenticated: renderiza Área de Membros
5. Se não: renderiza hero anônima + feed público
```

### Helper centralizado: `src/utils/apiFetch.js`

TODA chamada fetch passa por `apiFetch` (ou helpers `apiGet`, `apiPost`,
`apiPut`, `apiDelete`). Isso garante:
- `credentials: 'include'` sempre (envia cookie)
- CSRF token automático em POST/PUT/DELETE
- Evento `auth:unauthorized` em 401 (UserContext limpa estado)

### withAuth e withPermission (HOCs)

- `withAuth(Component)` — exige que esteja logado (redirect para /login)
- `withPermission(Component, 'console')` — exige permissão específica
  (mostra "Acesso restrito" se não tiver)
- `withAdmin(Component)` — atalho para `withPermission(..., 'guild-config')`

**Nota**: a verificação server-side (na API) é o gate real. O HOC é só UX.

### Páginas principais

| Rota | Descrição | Auth |
|------|-----------|------|
| `/` | HomePage (marketing) | Público |
| `/members` | Área de Membros (hero anônima + perfil logado) | Público/logado |
| `/settings` | Configurações (8 tabs: perfil, identidade, notif, priv, regional, segurança, discord, conta) | Logado |
| `/admin` | Painel admin (6 tabs: métricas, users, guilds, news, logs, console) | Admin (7+) |
| `/server/:guildId` | Config de servidor específico | Logado + membership |
| `/u/:identifier` | Perfil público (UUID/Discord ID/username) | Público |
| `/inventory` | Inventário de skins | Público (com `?user=ID`) |
| `/login`, `/register` | Auth | Público |

---

## 13. Variáveis de Ambiente

### Críticas (NUNCA commitar)

```bash
JWT_SECRET=<32+ chars aleatórios>          # Assina os JWTs
INTERNAL_API_KEY=<32+ chars>                # Bot ↔ API
LUMINA_API_KEY=<32+ chars>                  # Legacy API key
ENCRYPTION_KEY=<32+ chars>                  # TODO: criptografar tokens OAuth
OAUTH_STATE_SECRET=<32+ chars>              # HMAC do state OAuth
DISCORD_CLIENT_SECRET=<do Discord Dev Portal>
MONGODB_URI=<mongodb+srv://...>
WEBHOOK_URL=<https://discord.com/api/webhooks/...>
RIOT_API_KEY=<da Riot Games>
```

### Configuração

```bash
NODE_ENV=production|development|test
PORT=3000
DASHBOARD_PROTOCOL=https
DASHBOARD_DOMAIN=bot.luminasink.com
DISCORD_CLIENT_ID=<do Discord Dev Portal>
DISCORD_AUTH_REDIRECT_URI=https://api.bot.luminasink.com/expapi/oauth2/discord/auth/callback
```

### Importante

- `.env` e `.env.dev` estão no `.gitignore` — **NUNCA** commitar
- `.env.example` é o template (sem secrets) — deve ser commitado
- Se um secret vazar (ex: `.env.dev` foi commitado no passado), **rotacionar
  imediatamente** — presume-se comprometido

---

## 14. Deploy (Vercel)

### API

A API roda na Vercel como funções serverless. Config em `vercel.json`:

```json
{
    "version": 2,
    "builds": [{ "src": "index.js", "use": "@vercel/node" }],
    "routes": [{ "src": "/(.*)", "dest": "/index.js", "methods": [...] }]
}
```

Todas as requisições vão para `index.js` (single function). O Express app
é exportado via `module.exports = app`.

### Dashboard

O dashboard é uma SPA Vite estática. Build com `npm run build`, deploy do
diretório `dist/`. Config de rewrite em `vercel.json` para SPA routing:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

### Variáveis na Vercel

Configurar TODAS as variáveis de ambiente no painel da Vercel (Project →
Settings → Environment Variables). **Não** usar `.env` no repositório.

---

## 15. Checklist de Segurança

Antes de fazer deploy, verificar:

- [ ] `NODE_ENV=production` na Vercel
- [ ] `JWT_SECRET` tem 32+ caracteres de entropia
- [ ] `INTERNAL_API_KEY` diferente de `JWT_SECRET`
- [ ] `DISCORD_CLIENT_SECRET` rotacionado se `.env.dev` foi commitado
- [ ] `MONGODB_URI` usa usuário com permissões mínimas (não admin)
- [ ] `WEBHOOK_URL` aponta para canal de logs correto
- [ ] CORS allow-list (`src/config/allowedOrigins.js`) só tem domínios reais
- [ ] Nenhum `console.log` de secrets ou cookies
- [ ] Todas as rotas POST/PUT/DELETE têm `csrfProtectionNeeded: true`
- [ ] Rotas admin têm `checkAuthNeeded` ou validam `accessType` inline
- [ ] Rotas internas têm `internalKeyNeeded: true`
- [ ] Nenhum campo sensível (password, token) retornado em respostas de API

---

## 16. FAQ de Desenvolvimento

### Como adiciono uma nova rota?

1. Cria um arquivo em `src/routes/expapi/v1/minhaRota.js`
2. Exporta o objeto com `route`, `method`, `execute`, e flags de auth
3. A rota é auto-carregada — não precisa mexer no `index.js`

```js
module.exports = {
    route: '/expapi/v1/minha-rota',
    description: 'Faz X',
    apiKeyNeeded: false,
    jwtNeeded: false,           // se true, popula req.user
    csrfProtectionNeeded: true,  // se POST/PUT/DELETE
    enabled: true,
    method: 'post',
    async execute(req, res) {
        // req.user tem { email, accountId, ... } se jwtNeeded: true
        // ou se verifyRequestAuth(req) for chamado manualmente
        return res.status(200).json({ ok: true });
    }
};
```

### Como testo uma rota com CSRF em dev?

Em dev, CSRF é pulado (`NODE_ENV !== 'production'`). Mas se quiser testar
com CSRF:

```bash
# 1. Pegar CSRF token (setta cookie automaticamente com -c cookies.txt)
curl -c cookies.txt http://localhost:3000/expapi/v1/csrf-token

# 2. Ler o token do JSON
TOKEN=$(curl -s -b cookies.txt http://localhost:3000/expapi/v1/csrf-token | jq -r .csrfToken)

# 3. Fazer POST com token no header E cookie na requisição
curl -b cookies.txt -H "X-CSRF-Token: $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"key":"value"}' \
     http://localhost:3000/expapi/v1/minha-rota
```

### Como testo uma rota autenticada?

```bash
# 1. Login (setta cookie lumina_token)
curl -c cookies.txt -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"user@test.com","password":"pass"}' \
     http://localhost:3000/expapi/v1/login

# 2. Fazer requisição autenticada (cookie é enviado automaticamente)
curl -b cookies.txt http://localhost:3000/expapi/v1/user/profile
```

### Como adiciono um novo provider OAuth (ex: Google)?

1. Cria `src/oauthProviders/googleProvider.js` implementando:
   - `name: 'google'`
   - `getAuthorizationUrl(state)`
   - `exchangeCode(code)`
   - `getProfile(accessToken)`
2. Registra em `src/oauthProviders/index.js`
3. As rotas `authStart.js` e `authCallback.js` já suportam qualquer provider
   via `getProvider(req.params.provider)`

### Por que o WebSocket do Console foi desativado?

WebSocket não suporta `credentials: 'include'` como fetch. O cookie httpOnly
não é enviado automaticamente em conexões WS cross-origin. Para
reativar, o backend WS precisa aceitar cookie same-origin OU usar um token
de curta duração trocado via HTTP antes de abrir o WS.

### Por que as métricas resetam a cada cold start?

A Vercel recicla processos serverless. O `metrics.js` guarda estado em
memória que é perdido. Para métricas persistentes, consultar os logs no
MongoDB (`GET /expapi/v1/admin/logs`).

### Como debugo um erro 500?

1. Procure o `requestId` no header `X-Request-Id` da resposta
2. Vá em `/admin/logs` e filtre por esse requestId
3. Ou procure nos logs da Vercel (Dashboard → Functions → Logs)
4. O webhook do Discord também recebe o erro (com stack trace sanitizado)

---

## Documentação da API (Swagger)

A spec OpenAPI 3.0.3 completa está em `swagger.yaml` (4210 linhas) e é
servida via Swagger UI em `GET /docs`.

Contém:
- 57 operações em 52 paths
- 22 schemas reutilizáveis
- 5 security schemes (cookie, bearer, internal-key, csrf, apiKey)
- Exemplos de request/response para cada rota
- Códigos de erro específicos (INVALID_CREDENTIALS, USERNAME_COOLDOWN, etc.)

---

_Última atualização: Redesign v3 (cookie httpOnly + auditoria de segurança)_
