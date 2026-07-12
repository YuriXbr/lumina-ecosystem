/**
 * src/test/testUtils.jsx
 *
 * Utilitários compartilhados para os testes do Lumina Dashboard.
 *
 * Centraliza:
 *   - Mock factories (makeUser, makeBadge, makeInventory, etc.)
 *   - renderWithProviders (envolve o componente com Router + UserProvider + LanguageProvider)
 *   - mockFetch (helper para mockar fetch global)
 *   - waitFor (re-export de RTL)
 *
 * Uso:
 *   import { renderWithProviders, mockFetch, makeUser } from '../test/testUtils';
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserProvider } from '../contexts/UserContext';
import { LanguageProvider } from '../i18n/LanguageContext';
import { vi } from 'vitest';

// ─── Mock factories ────────────────────────────────────────────────────────

/**
 * Cria um objeto user mockado compatível com o que o /session retorna.
 */
export function makeUser(overrides = {}) {
  return {
    accountId: 'acc-test-0001',
    email: 'tester@example.com',
    firstName: 'Test',
    lastName: 'User',
    accessType: 'user',
    emailVerified: true,
    discordOauth2Id: '',
    discordAvatar: '',
    registrationDate: '2024-01-01T00:00:00.000Z',
    lastLogin: null,
    banned: false,
    blocked: false,
    username: 'tester',
    displayName: 'Test User',
    usernameChangedAt: null,
    displayNameChangedAt: null,
    authProviders: {},
    emailNotifications: true,
    discordNotifications: true,
    botActivityAlerts: false,
    publicProfile: false,
    showOnlineStatus: true,
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    hasPassword: true,
    deletionRequestedAt: null,
    deletionScheduledFor: null,
    ...overrides,
  };
}

/** User admin (level 7) */
export function makeAdminUser(overrides = {}) {
  return makeUser({
    accountId: 'acc-admin-0001',
    email: 'admin@luminasink.com',
    accessType: 'admin',
    username: 'admin',
    displayName: 'Admin User',
    ...overrides,
  });
}

/** User com Discord vinculado */
export function makeUserWithDiscord(overrides = {}) {
  return makeUser({
    discordOauth2Id: '123456789012345678',
    discordAvatar: 'abc123',
    id: '123456789012345678',
    avatar: 'abc123',
    ...overrides,
  });
}

/** Cria uma badge mockada */
export function makeBadge(overrides = {}) {
  return {
    code: 'TESTBADGE',
    name: 'Test Badge',
    description: 'A badge for testing',
    imageUrl: 'https://example.com/badge.png',
    rarity: 'common',
    highlightColor: '#8B5CF6',
    redeemedAt: '2024-01-01T00:00:00.000Z',
    redeemedVia: 'dashboard',
    ...overrides,
  };
}

/** Cria inventário mockado */
export function makeInventory(overrides = {}) {
  return {
    keys: 10,
    hextechChests: 5,
    masterWorkChests: 2,
    dailyRewardAvailable: true,
    nextDailyReward: null,
    dailyRewardStreak: 3,
    ...overrides,
  };
}

/** Cria uma skin mockada */
export function makeSkin(overrides = {}) {
  return {
    id: 1001,
    name: 'Cool Skin',
    championId: 1,
    championName: 'Annie',
    rarity: 'kEpic',
    count: 1,
    ...overrides,
  };
}

/** Cria uma guilda mockada */
export function makeGuild(overrides = {}) {
  return {
    id: '987654321098765432',
    name: 'Test Server',
    icon: 'icon-hash',
    banner: null,
    hasBot: true,
    canManage: true,
    botConfig: {
      prefix: 'l!',
      language: 'pt-BR',
      welcomeEnabled: false,
      moderationEnabled: false,
      musicEnabled: false,
      memberCount: 100,
    },
    ...overrides,
  };
}

/** Cria um post de notícia mockado */
export function makeNewsPost(overrides = {}) {
  return {
    id: '65a1b2c3d4e5f6a7b8c9d0e1',
    title: 'Test News',
    body: 'This is a test news post body.',
    excerpt: 'Test excerpt',
    imageUrl: 'https://example.com/news.png',
    tag: 'novidade',
    pinned: false,
    publishedAt: '2024-01-01T00:00:00.000Z',
    authorName: 'Admin User',
    ...overrides,
  };
}

// ─── Render helpers ────────────────────────────────────────────────────────

/**
 * Renderiza um componente envolto em Router + UserProvider + LanguageProvider.
 *
 * @param {React.ReactElement} ui - Componente a renderizar
 * @param {object} options
 * @param {string} options.route - Rota inicial (default: '/')
 * @param {object} options.user - Usuário pré-setado no UserContext (null = não logado)
 * @param {boolean} options.loading - Estado de loading inicial (default: false)
 * @returns {object} RTL render result + helpers
 */
export function renderWithProviders(ui, options = {}) {
  const {
    route = '/',
    user = null,
    loading = false,
  } = options;

  // Wrapper que seta o user inicial via mock do checkSession
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <UserProvider initialUser={user} initialLoading={loading}>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </UserProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

/**
 * Renderiza um componente envolto apenas em UserProvider + LanguageProvider
 * (sem Router). Útil para componentes que não usam react-router.
 */
export function renderWithI18n(ui, options = {}) {
  const { user = null, loading = false } = options;
  function Wrapper({ children }) {
    return (
      <UserProvider initialUser={user} initialLoading={loading}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </UserProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}

// ─── Mock do fetch global ──────────────────────────────────────────────────

/**
 * Helper para criar uma Response mockada.
 */
export function mockResponse(body, init = {}) {
  const {
    status = 200,
    statusText = 'OK',
    headers = { 'Content-Type': 'application/json' },
  } = init;

  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(bodyStr, { status, statusText, headers });
}

/**
 * Cria um mock de fetch que responde de forma determinística.
 *
 * @param {function|object} handler - função (url, options) => Response, ou mapa url → Response
 * @returns {object} vi.fn() configurado
 *
 * Uso:
 *   const fetchMock = mockFetch({
 *     'expapi/v1/session': mockResponse({ authenticated: true, user: makeUser() }),
 *     'expapi/v1/news': mockResponse({ posts: [], pagination: {} }),
 *   });
 *   global.fetch = fetchMock;
 *
 *   // ou com função:
 *   global.fetch = mockFetch((url) => {
 *     if (url.includes('/session')) return mockResponse({ authenticated: false });
 *     return mockResponse({}, { status: 404 });
 *   });
 */
export function mockFetch(handler) {
  return vi.fn((url, options = {}) => {
    // Normaliza URL: pode vir como string absoluta ou relativa
    const urlStr = typeof url === 'string' ? url : url.toString();

    if (typeof handler === 'function') {
      return Promise.resolve(handler(urlStr, options));
    }

    // handler é um objeto url → Response
    for (const [pattern, response] of Object.entries(handler)) {
      if (urlStr.includes(pattern)) {
        return Promise.resolve(response);
      }
    }

    // Default: 404
    return Promise.resolve(mockResponse({ error: 'Not Found' }, { status: 404 }));
  });
}

// ─── Helper para aguardar async ─────────────────────────────────────────────
export { waitFor, waitForElementToBeRemoved, act } from '@testing-library/react';

// ─── Helper para simular evento customizado ────────────────────────────────
export function dispatchAuthUnauthorized() {
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}
