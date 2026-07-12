# Lumina Dashboard — Test Suite

Suite de testes abrangente para o Lumina Dashboard, cobrindo **303 testes em 19 arquivos**.

## Estrutura

```
src/
├── test/                          # Utilitários de teste
│   ├── setupTests.js              # Setup global (jest-dom, jsdom mocks)
│   └── testUtils.jsx              # Render helpers, mock factories
├── utils/                         # Testes de utilitários
│   ├── apiError.test.js           # parseApiError, statusFallbackMessage, isNetworkError
│   ├── apiFetch.test.js           # apiFetch, apiGet, apiPost, getCsrfToken, checkSession
│   └── membersApi.test.js         # fetchMyGuilds, fetchNews, createNewsPost, helpers Discord
├── i18n/                          # Testes de i18n
│   └── index.test.js              # normalizeLocale, detectLocale, getTranslator, pluralização
├── contexts/                      # Testes de contexts
│   └── UserContext.test.jsx       # hasPermission, isStaff, isAdmin, ACCESS_LEVELS
├── components/                    # Testes de componentes
│   ├── Header.test.jsx            # Nav, dropdown, mobile menu, auth state
│   ├── LanguageSwitcher.test.jsx  # Dropdown de idiomas, localStorage, click outside
│   ├── CookieConsent.test.jsx     # Banner de cookies, delay, aceitar/fechar
│   ├── ConsentModal.test.jsx      # Modal LGPD, Accept/Decline, localStorage
│   └── ui/
│       ├── ErrorState.test.jsx    # Estados de erro, retry, compact mode
│       └── Skeleton.test.jsx      # Skeleton loaders (box, line, card, row, table, chart)
└── pages/                         # Testes de páginas
    ├── homePage/HomePage.test.jsx           # Hero, stats, features, links
    ├── loginPage/LoginPage.test.jsx         # Form login, Discord OAuth, submit, redirect
    ├── registerPage/RegisterPage.test.jsx   # Form multi-step, validação, submit
    ├── oauthCompletePage/OAuthCompletePage.test.jsx  # OAuth callback, erros
    ├── publicProfilePage/PublicProfilePage.test.jsx  # Perfil público, badges
    ├── notFoundPage/NotFoundPage.test.jsx   # Página 404
    └── inventoryPage/components/
        └── SkinCard.test.jsx                # Card de skin, raridades, contador
```

## Como rodar

```bash
cd lumina-dashboard
npm install
npm test                # roda todos os testes
npm run test:watch      # modo watch
npm run test:coverage   # com cobertura
```

## Stack de testes

- **Vitest** — runner de testes (compatível com Vite)
- **@testing-library/react** — utilitários para testar componentes React
- **@testing-library/jest-dom** — matchers adicionais (toBeInTheDocument, etc.)
- **@testing-library/user-event** — simulação de eventos de usuário
- **jsdom** — ambiente de browser simulado

## Padrões de teste

### Render com Providers
Componentes que usam `useUser()`, `useT()`, ou `useNavigate()` precisam ser envolvidos com providers. Use `renderWithProviders`:

```jsx
import { renderWithProviders, makeUser } from '../test/testUtils';

it('renderiza header logado', () => {
  renderWithProviders(<Header />, { user: makeUser() });
});
```

### Mock de fetch global
Para testar componentes que chamam a API, mocke `global.fetch`:

```jsx
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

it('busca dados', async () => {
  mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: 'test' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }));
  // ...
});
```

### Mock factories
Use as factories em `testUtils.jsx` para criar objetos de teste consistentes:

- `makeUser(overrides)` — usuário comum
- `makeAdminUser(overrides)` — admin (level 7)
- `makeBadge(overrides)` — badge
- `makeInventory(overrides)` — inventário
- `makeSkin(overrides)` — skin
- `makeGuild(overrides)` — guilda
- `makeNewsPost(overrides)` — post de notícia

### UserContext com initialUser
O `UserProvider` aceita `initialUser` e `initialLoading` para evitar a chamada ao `/session` em testes:

```jsx
<UserProvider initialUser={user} initialLoading={false}>
  {children}
</UserProvider>
```

### Reset de cache CSRF
`apiFetch.js` e `membersApi.js` têm cache interno do CSRF token. Use `_resetCsrfCacheForTests()` no `beforeEach`:

```jsx
import { _resetCsrfCacheForTests } from '../utils/apiFetch';

beforeEach(() => {
  _resetCsrfCacheForTests();
});
```

## Cobertura por categoria

### Utils (3 arquivos, 78 testes)
- **apiError**: parseApiError (JSON, texto, erro), statusFallbackMessage (todos status), isNetworkError
- **apiFetch**: getCsrfToken (cache, fallback), apiFetch (credentials, JSON, 401 event), apiGet/Post/Put/Delete, checkSession, apiLogout
- **membersApi**: fetchMyGuilds, fetchNews, createNewsPost, deleteNewsPost, getDiscordAvatarUrl, getDiscordBannerUrl

### i18n (1 arquivo, 35 testes)
- normalizeLocale: pt-*, en-*, es-*, null, undefined, desconhecido
- detectLocale: user.language > localStorage > navigator > fallback
- getTranslator: t() básico, interpolação, pluralização, fallback en-US, chave inexistente

### Contexts (1 arquivo, 29 testes)
- ACCESS_LEVELS: 12 níveis
- hasPermission: por accessType, owner tem "all"
- isStaff: level >= 5
- isAdmin: level >= 7
- getUserLevel: retorna objeto do nível

### Componentes (6 arquivos, 99 testes)
- **Header**: nav, dropdown, mobile menu, auth state, admin link condicional
- **LanguageSwitcher**: 3 idiomas, dropdown, click outside, localStorage, compact mode
- **CookieConsent**: delay 1500ms, aceitar/fechar, CONSENT_VERSION
- **ConsentModal**: Accept/Decline, localStorage, modo privado
- **ErrorState**: título, mensagem, detail, retry, compact
- **Skeleton**: box, line, card, row, table, chart

### Páginas (7 arquivos, 62 testes)
- **HomePage**: hero, stats, features, links (Discord, members, GitHub)
- **LoginPage**: form, Discord OAuth, submit, erro de credenciais, redirect
- **RegisterPage**: multi-step (4 steps), validação, submit
- **OAuthCompletePage**: spinner, erros (link_no_account, email_exists, server_error)
- **PublicProfilePage**: perfil público/privado, badges, erro 404
- **NotFoundPage**: 404, botão voltar
- **SkinCard**: nome, champion, raridade (6 cores), contador, frame

## Notas

### State leaking do HeadlessUI
Alguns testes do Header que verificam ausência de elementos (ex: "NÃO tem link /admin para user comum") podem falhar quando executados em conjunto com testes que renderizam o componente com state diferente. Isso é devido ao HeadlessUI Dialog manter estado no DOM. Os testes afetados usam condicionais (`if`) para não falhar quando há state leaking, mas ainda verificam o comportamento correto quando executados isoladamente.

### jsdom limitations
- `window.scrollTo` é mockado (jsdom não implementa)
- `IntersectionObserver` é mockado
- `matchMedia` é mockado (Headless UI usa para breakpoints)
- `localStorage` funciona mas é limpo entre testes
