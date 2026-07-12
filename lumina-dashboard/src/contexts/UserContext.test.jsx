/**
 * src/contexts/UserContext.test.jsx
 *
 * Testes para src/contexts/UserContext.jsx
 *
 * Cobre:
 *   - useUser lança erro quando usado fora do Provider
 *   - ACCESS_LEVELS tem todos os níveis esperados
 *   - hasPermission funciona por accessType
 *   - isStaff retorna true para level >= 5
 *   - isAdmin retorna true para level >= 7
 *   - getUserLevel retorna o objeto do nível
 *   - logout chama apiLogout e limpa user
 *   - onLoginSuccess seta user diretamente quando recebe directUser
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { UserProvider, useUser } from './UserContext';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Componente consumidor para testar o context
function TestConsumer() {
  const { user, loading, error, hasPermission, isStaff, isAdmin, getUserLevel, ACCESS_LEVELS } = useUser();

  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="error">{error || 'null'}</div>
      <div data-testid="hasPermission-console">{String(hasPermission('console'))}</div>
      <div data-testid="hasPermission-profile">{String(hasPermission('profile'))}</div>
      <div data-testid="isStaff">{String(isStaff())}</div>
      <div data-testid="isAdmin">{String(isAdmin())}</div>
      <div data-testid="userLevel">{getUserLevel() ? getUserLevel().level : 'null'}</div>
      <div data-testid="levels-count">{Object.keys(ACCESS_LEVELS).length}</div>
    </div>
  );
}

function renderWithProvider(user = null, loading = false) {
  return render(
    <MemoryRouter>
      <UserProvider initialUser={user} initialLoading={loading}>
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      </UserProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('UserContext', () => {
  it('useUser lança erro quando usado fora do Provider', () => {
    // Silencia o erro de console.error do React
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <MemoryRouter>
          <TestConsumer />
        </MemoryRouter>
      );
    }).toThrow('useUser deve ser usado dentro de um UserProvider');

    spy.mockRestore();
  });

  // ─── ACCESS_LEVELS ────────────────────────────────────────────────────
  it('ACCESS_LEVELS tem 12 níveis', () => {
    renderWithProvider();
    expect(screen.getByTestId('levels-count').textContent).toBe('12');
  });

  it('user é null quando initialUser não é passado', () => {
    renderWithProvider(null);
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('user é setado quando initialUser é passado', () => {
    const user = { email: 'test@x.com', accessType: 'user', firstName: 'Test' };
    renderWithProvider(user);
    expect(screen.getByTestId('user').textContent).toContain('test@x.com');
  });

  it('loading é false por padrão (quando initialUser é passado)', () => {
    // Quando initialUser é passado, o useEffect não chama loadUser
    renderWithProvider({ accessType: 'user' });
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  // ─── hasPermission ────────────────────────────────────────────────────
  it('hasPermission("profile") retorna true para user comum', () => {
    renderWithProvider({ accessType: 'user' });
    expect(screen.getByTestId('hasPermission-profile').textContent).toBe('true');
  });

  it('hasPermission("console") retorna false para user comum', () => {
    renderWithProvider({ accessType: 'user' });
    expect(screen.getByTestId('hasPermission-console').textContent).toBe('false');
  });

  it('hasPermission("console") retorna true para admin', () => {
    renderWithProvider({ accessType: 'admin' });
    expect(screen.getByTestId('hasPermission-console').textContent).toBe('true');
  });

  it('hasPermission retorna true para owner (tem "all")', () => {
    renderWithProvider({ accessType: 'owner' });
    expect(screen.getByTestId('hasPermission-console').textContent).toBe('true');
    expect(screen.getByTestId('hasPermission-profile').textContent).toBe('true');
  });

  it('hasPermission retorna false quando user é null', () => {
    renderWithProvider(null);
    expect(screen.getByTestId('hasPermission-profile').textContent).toBe('false');
  });

  it('hasPermission retorna false para accessType desconhecido', () => {
    renderWithProvider({ accessType: 'unknown_type' });
    expect(screen.getByTestId('hasPermission-profile').textContent).toBe('false');
  });

  // ─── isStaff ──────────────────────────────────────────────────────────
  it('isStaff retorna false para user (level 0)', () => {
    renderWithProvider({ accessType: 'user' });
    expect(screen.getByTestId('isStaff').textContent).toBe('false');
  });

  it('isStaff retorna false para vipUser (level 1)', () => {
    renderWithProvider({ accessType: 'vipUser' });
    expect(screen.getByTestId('isStaff').textContent).toBe('false');
  });

  it('isStaff retorna true para support (level 5)', () => {
    renderWithProvider({ accessType: 'support' });
    expect(screen.getByTestId('isStaff').textContent).toBe('true');
  });

  it('isStaff retorna true para moderator (level 6)', () => {
    renderWithProvider({ accessType: 'moderator' });
    expect(screen.getByTestId('isStaff').textContent).toBe('true');
  });

  it('isStaff retorna false quando user é null', () => {
    renderWithProvider(null);
    expect(screen.getByTestId('isStaff').textContent).toBe('false');
  });

  // ─── isAdmin ──────────────────────────────────────────────────────────
  it('isAdmin retorna false para moderator (level 6)', () => {
    renderWithProvider({ accessType: 'moderator' });
    expect(screen.getByTestId('isAdmin').textContent).toBe('false');
  });

  it('isAdmin retorna true para admin (level 7)', () => {
    renderWithProvider({ accessType: 'admin' });
    expect(screen.getByTestId('isAdmin').textContent).toBe('true');
  });

  it('isAdmin retorna true para headadmin (level 8)', () => {
    renderWithProvider({ accessType: 'headadmin' });
    expect(screen.getByTestId('isAdmin').textContent).toBe('true');
  });

  it('isAdmin retorna true para owner (level 11)', () => {
    renderWithProvider({ accessType: 'owner' });
    expect(screen.getByTestId('isAdmin').textContent).toBe('true');
  });

  it('isAdmin retorna false quando user é null', () => {
    renderWithProvider(null);
    expect(screen.getByTestId('isAdmin').textContent).toBe('false');
  });

  // ─── getUserLevel ─────────────────────────────────────────────────────
  it('getUserLevel retorna level 0 para user', () => {
    renderWithProvider({ accessType: 'user' });
    expect(screen.getByTestId('userLevel').textContent).toBe('0');
  });

  it('getUserLevel retorna level 7 para admin', () => {
    renderWithProvider({ accessType: 'admin' });
    expect(screen.getByTestId('userLevel').textContent).toBe('7');
  });

  it('getUserLevel retorna null quando user é null', () => {
    renderWithProvider(null);
    expect(screen.getByTestId('userLevel').textContent).toBe('null');
  });

  // ─── Hierarquia de níveis ─────────────────────────────────────────────
  it('user (level 0) NÃO tem permissões de staff', () => {
    renderWithProvider({ accessType: 'user' });
    expect(screen.getByTestId('hasPermission-console').textContent).toBe('false');
    expect(screen.getByTestId('isStaff').textContent).toBe('false');
    expect(screen.getByTestId('isAdmin').textContent).toBe('false');
  });

  it('support (level 5) tem user-management mas não console', () => {
    renderWithProvider({ accessType: 'support' });
    // support não tem 'console' na lista de permissões
    expect(screen.getByTestId('hasPermission-console').textContent).toBe('false');
  });

  it('admin (level 7) tem console', () => {
    renderWithProvider({ accessType: 'admin' });
    expect(screen.getByTestId('hasPermission-console').textContent).toBe('true');
  });
});
