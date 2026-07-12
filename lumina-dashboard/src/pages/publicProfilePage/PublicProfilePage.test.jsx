/**
 * src/pages/publicProfilePage/PublicProfilePage.test.jsx
 *
 * Testes para src/pages/publicProfilePage/PublicProfilePage.jsx
 *
 * Cobre:
 *   - Busca perfil público por identifier
 *   - Renderiza avatar, displayName, username
 *   -Perfil privado mostra badge "Privado"
 *   - Perfil público mostra registrationDate e accessType
 *   - Erro 404 mostra ErrorState
 *   - Erro de rede mostra ErrorState com retry
 *   - Badge section renderiza badges
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import PublicProfilePage from './PublicProfilePage';
import { renderWithProviders } from '../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const VALID_PROFILE = {
  accountId: 'acc-123',
  username: 'pubuser',
  displayName: 'Pub User',
  discordOauth2Id: '123456789012345678',
  avatar: 'avatar-hash',
  publicProfile: true,
  registrationDate: '2024-01-01T00:00:00.000Z',
  accessType: 'vipUser',
};

describe('PublicProfilePage', () => {
  it('renderiza sem crashar', () => {
    mockFetch.mockResolvedValue(jsonResponse(VALID_PROFILE));
    renderWithProviders(<PublicProfilePage />, { route: '/u/pubuser' });
  });

  it('busca perfil público na API', async () => {
    mockFetch.mockResolvedValue(jsonResponse(VALID_PROFILE));

    renderWithProviders(<PublicProfilePage />, { route: '/u/pubuser' });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('expapi/v1/public-profile/')
      );
    });
  });

  it('mostra displayName do perfil', async () => {
    mockFetch.mockResolvedValue(jsonResponse(VALID_PROFILE));

    renderWithProviders(<PublicProfilePage />, { route: '/u/pubuser' });

    await waitFor(() => {
      expect(screen.getByText('Pub User')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('mostra username com @', async () => {
    mockFetch.mockResolvedValue(jsonResponse(VALID_PROFILE));

    renderWithProviders(<PublicProfilePage />, { route: '/u/pubuser' });

    await waitFor(() => {
      // username aparece em vários lugares — getAllByText
      const usernameElements = screen.getAllByText(/pubuser/i);
      expect(usernameElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('mostra badge "Público" quando publicProfile=true', async () => {
    mockFetch.mockResolvedValue(jsonResponse(VALID_PROFILE));

    renderWithProviders(<PublicProfilePage />, { route: '/u/pubuser' });

    await waitFor(() => {
      // Procura por um elemento com classe bg-green-100 (badge público)
      expect(document.querySelector('.bg-green-100')).toBeInTheDocument();
    });
  });

  it('mostra badge "Privado" quando publicProfile=false', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ...VALID_PROFILE, publicProfile: false }));

    renderWithProviders(<PublicProfilePage />, { route: '/u/pubuser' });

    await waitFor(() => {
      // Badge privado usa bg-gray-100
      expect(document.querySelector('.bg-gray-100')).toBeInTheDocument();
    });
  });

  it('perfil público mostra registrationDate', async () => {
    mockFetch.mockResolvedValue(jsonResponse(VALID_PROFILE));

    renderWithProviders(<PublicProfilePage />, { route: '/u/pubuser' });

    await waitFor(() => {
      // A data é formatada com toLocaleDateString
      // Apenas verifica que algum elemento com a data aparece
      expect(screen.getByText(/jan|january|2024/i)).toBeInTheDocument();
    });
  });

  // ─── Erros ────────────────────────────────────────────────────────────
  it('erro 404 mostra ErrorState', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Usuário não encontrado.' }, 404));

    renderWithProviders(<PublicProfilePage />, { route: '/u/ghostuser' });

    await waitFor(() => {
      // ErrorState tem classe bg-white ou bg-red-50
      const errorElement = document.querySelector('.bg-white.border.border-gray-200.rounded-lg');
      expect(errorElement).toBeInTheDocument();
    });
  });

  it('erro de rede mostra ErrorState', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    renderWithProviders(<PublicProfilePage />, { route: '/u/test' });

    await waitFor(() => {
      expect(document.querySelector('.bg-white.border.border-gray-200.rounded-lg')).toBeInTheDocument();
    });
  });

  // ─── Badges ───────────────────────────────────────────────────────────
  it('busca badges do usuário em paralelo', async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes('badges/user')) {
        return Promise.resolve(jsonResponse({ badges: [], username: 'pubuser', displayName: 'Pub User' }));
      }
      return Promise.resolve(jsonResponse(VALID_PROFILE));
    });

    renderWithProviders(<PublicProfilePage />, { route: '/u/pubuser' });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('expapi/v1/badges/user/')
      );
    }, { timeout: 3000 });
  });

  it('renderiza seção de badges mesmo quando vazia', async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes('badges/user')) {
        return Promise.resolve(jsonResponse({ badges: [] }));
      }
      return Promise.resolve(jsonResponse(VALID_PROFILE));
    });

    renderWithProviders(<PublicProfilePage />, { route: '/u/pubuser' });

    await waitFor(() => {
      // Seção de badges tem ícone de presente (GiftIcon)
      // Não há como verificar o ícone diretamente, mas a seção existe
      expect(screen.getByText(/sem badges|no badges/i)).toBeInTheDocument();
    });
  });

  // ─── Link de voltar ───────────────────────────────────────────────────
  it('tem link para voltar a /members', async () => {
    mockFetch.mockResolvedValue(jsonResponse(VALID_PROFILE));

    renderWithProviders(<PublicProfilePage />, { route: '/u/pubuser' });

    await waitFor(() => {
      // Pode haver múltiplos links para /members (Header + back link)
      const memberLinks = screen.getAllByRole('link', { href: '/members' });
      expect(memberLinks.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
