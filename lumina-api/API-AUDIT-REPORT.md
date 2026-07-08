# Lumina API Audit Report

Atualizado a partir do estado atual de `index.js`, `swagger.yaml`, `src/routes/**/*` e `__tests__/*`.

## Resumo Executivo

- A API aplica protecoes globais no bootstrap: Helmet, CORS por allow-list, `X-Request-Id`, `requestLogger()`, limite de body JSON e CSRF apenas em producao para rotas marcadas.
- O logger global registra cada resposta e persiste falhas via `routeError()`. Logs adicionais com `addLog()` aparecem apenas em fluxos especificos de docs e OAuth.
- Ha protecao declarada por metadata em varias rotas, mas tambem ha protecoes inline em handlers, principalmente no grupo `expapi/v1/admin`.
- O Swagger estava desalinhado com o codigo em pontos como `/validate-token`, `/getconfig` e `/dailyreward`; o spec foi atualizado para refletir o codigo atual.

## Protecoes Globais

- `Helmet` e fallback manual de headers de seguranca.
- `CORS` com allow-list fixa e excecao para URLs de preview da Vercel.
- `X-Request-Id` por requisicao.
- `requestLogger()` para rastreio de requisicoes e persistencia de logs.
- `routeError()` para resposta padronizada de erros e envio de evento ao MongoDB/Discord.
- `csrfProtection` aplicado somente em producao e somente em rotas com `csrfProtectionNeeded`.
- `internalKeyCheck` para rotas internas que exigem `internal-key`.
- `apiKeyNeeded`, `jwtNeeded`, `loginLimiterNeeded`, `checkAuthNeeded` e `rateLimiter` sao aplicados pelo bootstrap quando marcados na definicao da rota.

## Testes Presentes

| Arquivo | Foco |
| --- | --- |
| `__tests__/routes-table.test.js` | Pagina raiz com tabela de rotas, headers de seguranca, `X-Request-Id`, 404 para rotas inexistentes e validacao de XSS na listagem. |
| `__tests__/security.test.js` | Headers, CORS, regra de senha, rota desativada e protecao de rotas internas. |
| `__tests__/oauth-routes.test.js` | Fluxo OAuth2 start/callback, origins permitidas, state, login, registro e link de conta. |
| `__tests__/internal-routes.test.js` | Protecao por `internal-key` e fluxo das rotas internas de inventario, bot e guild. |
| `__tests__/auth-routes.test.js` | Login, registro, logout, ping, configuracao, set-password e change-password. |
| `__tests__/ip-rate-limiter.test.js` | Backoff exponencial do rate limiter e bypass em ambiente de teste. |
| `__tests__/inventory.test.js` | `UserInventoryService` (add/remove/fetch/reset). |
| `__tests__/gacha-service.test.js` | Sorteio de skin, probabilidades e protecao contra double-spend/rollback. |
| `__tests__/services-unit.test.js` | `DashboardAccountService`, `UserInventoryService` e `SkinService`. |
| `__tests__/utils-unit.test.js` | State OAuth, resolucao Discord e wrappers Riot API. |
| `__tests__/database-service-update.test.js` | Protecao de update para sempre usar operadores Mongo. |
| `__tests__/routes.test.js` | Smoke test legado; usa imports do layout antigo e nao reflete bem o fluxo atual. |
| `__tests__/setup-env.js` | Helper de setup para a suite. |

## Rotas Legadas de Raiz

Essas rotas continuam ativas por compatibilidade e nao usam protecao extra alem do logger global.

| Rota | Metodo | Protecao real | Logger |
| --- | --- | --- | --- |
| `/api/v1` | GET | nenhuma | `requestLogger` apenas |
| `/index` | GET | nenhuma | `requestLogger` apenas |
| `/login` | GET | nenhuma | `requestLogger` apenas |
| `/register` | GET | nenhuma | `requestLogger` apenas |
| `/logout` | GET | nenhuma | `requestLogger` apenas |
| `/validateAuth` | GET | nenhuma | `requestLogger` apenas |
| `/validate-token` | GET | nenhuma | `requestLogger` apenas |
| `/getConfigs` | GET | nenhuma | `requestLogger` apenas |
| `/configsUpdate` | GET | nenhuma | `requestLogger` apenas |
| `/csrf-token` | GET | nenhuma | `requestLogger` apenas |

## System / Bootstrap / Auth (expapi)

| Rota | Metodo | Protecao real | Logger |
| --- | --- | --- | --- |
| `/expapi/v1/` | GET | nenhuma | `requestLogger` apenas |
| `/expapi/v1/db` | GET | nenhuma | `requestLogger` + `routeError` quando o DB falha |
| `/expapi/v1/csrf-token` | GET | nenhuma | `requestLogger` apenas |
| `/expapi/v1/login` | POST | `loginLimiterNeeded` + `csrfProtectionNeeded` | `requestLogger` + `routeError` no fluxo de login |
| `/expapi/v1/register` | POST | `loginLimiterNeeded` + `csrfProtectionNeeded` | `requestLogger` + `routeError` no fluxo de registro |
| `/expapi/v1/logout` | GET | nenhuma | `requestLogger` apenas |
| `/expapi/v1/getconfig` | GET | desativada, responde 410 | `requestLogger` apenas |
| `/expapi/v1/dailyreward` | POST | `jwtNeeded` + `csrfProtectionNeeded` | `requestLogger` + `routeError` quando a diaria falha |
| `/expapi/oauth2/{provider}/auth/start` | GET | `loginLimiterNeeded` | `requestLogger` + `addLog` em inicio/erro do fluxo OAuth |
| `/expapi/oauth2/{provider}/auth/callback` | GET | nenhuma flag de bootstrap; validacao de state e provider no handler | `requestLogger` + `addLog` em login/registro/vinculo/erro |

## User / Profile / Discord / Inventory

| Rota | Metodo | Protecao real | Logger |
| --- | --- | --- | --- |
| `/expapi/v1/discordinfo` | GET | JWT verificado inline no handler | `requestLogger` + `routeError` |
| `/expapi/v1/discord/guild/:guildId` | GET | JWT verificado inline no handler | `requestLogger` + `routeError` |
| `/expapi/v1/unlink-discord` | POST | `jwtNeeded` + `csrfProtectionNeeded` + `checkAuthNeeded` e verificacao inline de JWT | `requestLogger` + `routeError` |
| `/expapi/v1/user/profile` | GET | JWT verificado inline no handler | `requestLogger` + `routeError` |
| `/expapi/v1/user/settings` | GET | JWT verificado inline no handler | `requestLogger` + `routeError` |
| `/expapi/v1/user/settings` | PUT | JWT verificado inline no handler e `csrfProtectionNeeded` | `requestLogger` + `routeError` |
| `/expapi/v1/user/set-password` | POST | `jwtNeeded` + `loginLimiterNeeded` + `csrfProtectionNeeded` | `requestLogger` + `routeError` |
| `/expapi/v1/user/change-password` | PUT | desativada, responde 501 | `requestLogger` apenas |
| `/expapi/v1/myinventory` | GET | `jwtNeeded` | `requestLogger` + `routeError` |
| `/expapi/v1/rollskin` | POST | `jwtNeeded` + `csrfProtectionNeeded` | `requestLogger` + `routeError` |

## Admin

Os endpoints admin nao usam middleware de JWT no bootstrap; eles validam `Authorization`, fazem `jwt.verify()` e checam nivel de acesso dentro do handler.

| Rota | Metodo | Protecao real | Logger |
| --- | --- | --- | --- |
| `/expapi/v1/admin/users` | GET | JWT inline + nivel >= 5 | `requestLogger` + `routeError` |
| `/expapi/v1/admin/users/:userId` | PUT | JWT inline + nivel >= 5 + `csrfProtectionNeeded` | `requestLogger` + `routeError` |
| `/expapi/v1/admin/guilds` | GET | JWT inline + nivel >= 7 | `requestLogger` + `routeError` |
| `/expapi/v1/admin/guilds/:guildId` | PUT | JWT inline + nivel >= 7 + `csrfProtectionNeeded` | `requestLogger` + `routeError` |
| `/expapi/v1/admin/metrics` | GET | JWT inline + nivel >= 7 | `requestLogger` + `routeError` |
| `/expapi/v1/admin/logs` | GET | JWT inline + nivel >= 7 | `requestLogger` + `routeError` |

## Internal

| Rota | Metodo | Protecao real | Logger |
| --- | --- | --- | --- |
| `/expapi/internal/claimdaily` | POST | `internalKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/addinventory` | POST | `internalKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/addskin` | POST | `internalKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/fetchinventory` | GET/POST | publica, com `rateLimiter` de 120 req/min por IP | `requestLogger` + `routeError` |
| `/expapi/internal/fetchuserskins` | GET/POST | publica, com `rateLimiter` de 120 req/min por IP | `requestLogger` + `routeError` |
| `/expapi/internal/fetchbot` | GET | `apiKeyNeeded` + `internalKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/staff` | GET | `apiKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/newguild` | POST | `internalKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/deleteguild` | POST/DELETE | `internalKeyNeeded` | `requestLogger` + `addLog` no sucesso + `routeError` no erro |
| `/expapi/internal/fetchguilddata` | POST | `internalKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/updateguilddata` | POST | `internalKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/newpunishrecord` | POST | `internalKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/modifypunishrecord` | POST | `internalKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/removepunishrecord` | POST | `internalKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/rollskin` | POST | `internalKeyNeeded` | `requestLogger` + `routeError` |
| `/expapi/internal/updatebot` | POST | `apiKeyNeeded` + `internalKeyNeeded` | `requestLogger` + `routeError` |

## Logger Por Rota

- `requestLogger()` é comum a todas as rotas registradas pelo bootstrap.
- `routeError()` aparece na maior parte dos handlers com tratamento de excecao.
- `addLog()` aparece em:
  - `src/routes/docs/swagger-route.js`
  - `src/routes/expapi/Oauth2/authStart.js`
  - `src/routes/expapi/Oauth2/authCallback.js`
  - `src/routes/expapi/internal/deleteGuild.js`
- Rotas simples e legadas (`/login`, `/register`, `/logout`, `/validateAuth`, `/validate-token`, `/getConfigs`, `/configsUpdate`, `/csrf-token`, `/index`, `/api/v1`) nao fazem log especifico alem do middleware global.

## Observacoes Finais

- O maior drift corrigido no Swagger foi a documentacao de `/expapi/v1/validate-token`, que nao existe no codigo; a rota real e `/validate-token`.
- `getconfig` e `change-password` estao documentadas como desativadas e retornando 410/501, respectivamente.
- As rotas admin sao protegidas por verificacao inline de JWT e nivel de acesso, nao por middleware declarativo no bootstrap.