# Lumina API — Test Suite

Suite de testes abrangente para a Lumina API, cobrindo **797 testes em 54 arquivos**.

## Estrutura

```
__tests__/
├── helpers/                    # Utilitários compartilhados
│   └── testUtils.js            # JWT/CSRF helpers, mock factories, mock appliers
├── routes/                     # Testes de rotas (1 arquivo por rota)
│   ├── expapi-v1-login.test.js
│   ├── expapi-v1-register.test.js
│   ├── expapi-v1-logout.test.js
│   ├── expapi-v1-session.test.js
│   ├── expapi-v1-exchangeToken.test.js
│   ├── expapi-v1-setPassword.test.js
│   ├── expapi-v1-userIdentity.test.js
│   ├── expapi-v1-userCheckUsername.test.js
│   ├── expapi-v1-getUserProfile.test.js
│   ├── expapi-v1-getUserSettings.test.js
│   ├── expapi-v1-updateUserSettings.test.js
│   ├── expapi-v1-closeAccount.test.js
│   ├── expapi-v1-cancelCloseAccount.test.js
│   ├── expapi-v1-discordInfo.test.js
│   ├── expapi-v1-myGuilds.test.js
│   ├── expapi-v1-unlinkDiscord.test.js
│   ├── expapi-v1-publicProfile.test.js
│   ├── expapi-v1-myInventory.test.js
│   ├── expapi-v1-dailyReward.test.js
│   ├── expapi-v1-publicRollskin.test.js
│   ├── expapi-v1-news.test.js
│   ├── expapi-v1-baseAndDb.test.js
│   ├── admin-createBadge.test.js
│   ├── admin-deleteBadge.test.js
│   ├── admin-getBadges.test.js
│   ├── admin-getUsers.test.js
│   ├── admin-updateUser.test.js
│   ├── admin-getMetrics.test.js
│   ├── admin-getLogs.test.js
│   ├── admin-getGuilds.test.js
│   ├── admin-updateGuild.test.js
│   ├── admin-news.test.js
│   ├── badges-getMyBadges.test.js
│   ├── badges-getUserBadges.test.js
│   ├── badges-redeemBadge.test.js
│   ├── discord-getGuildInfo.test.js
│   ├── internal-guilds.test.js
│   ├── internal-inventory.test.js
│   ├── internal-skins.test.js
│   ├── internal-badges.test.js
│   ├── internal-misc.test.js
│   ├── internal-punishments.test.js
│   ├── oauth-authStart.test.js
│   └── oauth-authCallback.test.js
├── utils/                      # Testes unitários de utilitários
│   ├── authHelpers.test.js
│   ├── csrfMiddleware.test.js
│   ├── identityValidation.test.js
│   ├── gachaService.test.js
│   ├── oauthState.test.js
│   ├── allowedOrigins.test.js
│   ├── ipRateLimiter.test.js
│   └── metrics.test.js
├── middleware/                 # Testes de middlewares
│   └── auth.test.js
├── security/                   # Testes de segurança e exploits
│   └── exploits.test.js
└── setup-env.js                # Setup executado antes de cada arquivo
```

## Como rodar

```bash
cd lumina-api
npm install
npm test                # roda todos os testes
npm run test:watch      # modo watch
npm run test:coverage   # com cobertura
```

## Cobertura

### Rotas públicas expapi/v1 (22 arquivos)
- **login, register, logout, session, exchangeToken**: auth flows completos
- **setPassword, userIdentity, userCheckUsername**: gestão de identidade
- **getUserProfile, getUserSettings, updateUserSettings**: perfil e settings
- **closeAccount, cancelCloseAccount**: lifecycle de conta
- **discordInfo, myGuilds, unlinkDiscord**: integração Discord
- **publicProfile**: perfil público por UUID/Discord ID/username
- **myInventory, dailyReward, publicRollskin**: sistema de gacha
- **news**: feed público
- **baseAndDb**: rotas raiz, /csrf-token, /validate-token, /validateAuth, /db

### Rotas admin (10 arquivos)
- **createBadge, deleteBadge, getBadges**: CRUD de badges
- **getUsers, updateUser**: gestão de usuários com hierarquia de níveis
- **getMetrics, getLogs**: observabilidade
- **getGuilds, updateGuild**: gestão de guildas com whitelisting de campos
- **news**: CRUD de posts

### Rotas badges/discord/internal/oauth (12 arquivos)
- **badges**: getMyBadges, getUserBadges, redeemBadge
- **discord**: getGuildInfo (com channels/roles via bot token)
- **internal**: guilds, inventory, skins, badges, punishments, misc (claimDaily, commandLog, fetchBot, updateBot, staff)
- **oauth**: authStart (login/register/link), authCallback (3 intents)

### Utilitários (8 arquivos)
- **authHelpers**: extractToken, verifyRequestAuth, verifyRequestAuthWithAccountCheck, requireAuth, optionalAuth, setAuthCookie, clearAuthCookie
- **csrfMiddleware**: double-submit cookie pattern, GET gera token, POST/PUT/DELETE valida
- **identityValidation**: username syntax + blacklist, displayName sanitization (zero-width chars), cooldowns
- **gachaService**: computeProbabilities (soma=1), pickRarity (distribuição estatística), rollSkin (débito atômico + reembolso)
- **oauthState**: signState/verifyState (HMAC-SHA256, tamper detection, timing-safe)
- **allowedOrigins**: allow-list + Vercel preview em não-produção
- **ipRateLimiter**: calcBlockDuration (backoff exponencial), bypass em test env
- **metrics**: recordRequest, recordError (buffer circular), getSnapshot

### Middlewares (1 arquivo)
- **auth**: checkAuth, internalKeyCheck (timing-safe), loginLimiter, registerLimiter

### Segurança (1 arquivo)
- **exploits**: NoSQL injection, XSS, IDOR, mass assignment, JWT forgery, privilege escalation, key brute force, path traversal, HTTP method safety, account enumeration, cookie security, security headers

## Padrões de teste

### Mocks
Todos os serviços de banco de dados são mockados com `jest.mock()`. O logger também é mockado para evitar `setInterval`/`setTimeout` que causem open handles.

### JWT de teste
```js
const { makeJwt, makeExpiredJwt, makeWrongSecretJwt, makeGarbageJwt } = require('../helpers/testUtils');
```

### CSRF em testes
Em `NODE_ENV=test`, o `csrfProtection` é bypassado pelo `index.js`. Testes do CSRF middleware em si estão em `__tests__/utils/csrfMiddleware.test.js`.

### Rate limiters em testes
`loginLimiter`, `registerLimiter` e `ipRateLimiter` são bypassados em `NODE_ENV=test`.

### Cobertura por status code
Cada rota testa:
- **200/201**: sucesso
- **400**: campos faltando, validação de input
- **401**: sem auth, token inválido/expirado
- **403**: permissão insuficiente, conta suspensa, CSRF inválido
- **404**: recurso não encontrado
- **409**: conflito (duplicidade)
- **429**: rate limit, cooldown
- **500**: erro interno
- **503**: DB indisponível

## Bugs encontrados e documentados

Durante os testes, identificamos bugs reais na implementação:

1. **`account = updated` em const** (myGuilds.js, discordInfo.js): as rotas fazem `const { account } = ...` e depois tentam `account = updated` no fluxo de refresh token, lançando TypeError. Documentado nos testes como 500.

2. **calcBlockDuration nunca atinge MAX_BLOCK_MS** (ipRateLimiter.js): o cap do exponent em 9 (em vez de usar `Math.min` na duração final corretamente) faz com que o bloqueio máximo seja 8.5h, nunca 24h. Documentado nos testes.

3. **Logout retorna JSON** (não 302 redirect): testes antigos esperavam 302, mas a rota retorna `200 { ok: true }`.
