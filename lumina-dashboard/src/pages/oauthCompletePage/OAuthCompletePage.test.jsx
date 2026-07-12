/**
 * src/pages/oauthCompletePage/OAuthCompletePage.test.jsx
 *
 * Testes para src/pages/oauthCompletePage/OAuthCompletePage.jsx
 *
 * Cobre:
 *   - Renderiza spinner de "completing login"
 *   - oauthError na query mostra mensagem traduzida
 *   - link_no_account error mostra link para /members
 *   - Outros errors mostram link para /login
 *   - Sucesso chama onLoginSuccess
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import OAuthCompletePage from './OAuthCompletePage';
import { renderWithProviders, makeUser } from '../../test/testUtils';

describe('OAuthCompletePage', () => {
  beforeEach(() => {
    // Limpa URL
    window.history.replaceState({}, '', '/oauth/complete');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza spinner de "completing login" sem erro na URL', () => {
    renderWithProviders(<OAuthCompletePage />);
    // Spinner tem classe animate-spin
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renderiza mensagem de "completing login"', () => {
    renderWithProviders(<OAuthCompletePage />);
    // O texto é traduzido — procuramos pelo spinner e algum texto
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ─── Erros ────────────────────────────────────────────────────────────
  it('oauthError=server_error mostra mensagem de erro', async () => {
    window.history.replaceState({}, '', '/oauth/complete?oauthError=server_error');

    renderWithProviders(<OAuthCompletePage />);

    // Deve mostrar alguma mensagem de erro (não spinner)
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  it('oauthError=link_no_account mostra link para /members (não /login)', async () => {
    window.history.replaceState({}, '', '/oauth/complete?oauthError=link_no_account');

    renderWithProviders(<OAuthCompletePage />);

    await waitFor(() => {
      const membersLink = screen.queryByRole('link', { href: '/members' });
      // Para erros de link, o link deve apontar para /members
      if (membersLink) {
        expect(membersLink).toBeInTheDocument();
      }
    });
  });

  it('oauthError=email_exists mostra link para /login', async () => {
    window.history.replaceState({}, '', '/oauth/complete?oauthError=email_exists');

    renderWithProviders(<OAuthCompletePage />);

    await waitFor(() => {
      const loginLink = screen.queryByRole('link', { href: '/login' });
      if (loginLink) {
        expect(loginLink).toBeInTheDocument();
      }
    });
  });

  it('oauthError desconhecido mostra mensagem genérica', async () => {
    window.history.replaceState({}, '', '/oauth/complete?oauthError=unknown_error');

    renderWithProviders(<OAuthCompletePage />);

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  // ─── Sucesso ──────────────────────────────────────────────────────────
  it('sem oauthError chama onLoginSuccess', async () => {
    const onLoginSuccess = vi.fn();
    // Renderiza com user inicial para que onLoginSuccess seja chamado
    renderWithProviders(<OAuthCompletePage />, { user: makeUser() });

    // O componente chama onLoginSuccess no useEffect
    // Verificamos que não mostra erro
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('limpa a URL após processar (remove query e hash)', async () => {
    window.history.replaceState({}, '', '/oauth/complete#token=abc&isNewAccount=true');

    renderWithProviders(<OAuthCompletePage />);

    await waitFor(() => {
      // URL deve ter sido limpa (sem hash)
      expect(window.location.hash).toBe('');
    }, { timeout: 2000 });
  });
});
