/**
 * src/components/CookieConsent.test.jsx
 *
 * Testes para src/components/CookieConsent.jsx
 *
 * Cobre:
 *   - Não renderiza quando localStorage tem CONSENT_VERSION correto
 *   - Renderiza quando localStorage não tem versão
 *   - Renderiza quando localStorage tem versão diferente
 *   - Botão "Entendi" salva no localStorage e esconde o banner
 *   - Botão de fechar (X) esconde o banner sem salvar
 *   - Aparece após delay de 1500ms
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import CookieConsent from './CookieConsent';

const STORAGE_KEY = 'lumina_cookie_consent';
const CONSENT_VERSION = '1';

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CookieConsent', () => {
  it('NÃO renderiza quando localStorage tem CONSENT_VERSION correto', () => {
    window.localStorage.setItem(STORAGE_KEY, CONSENT_VERSION);
    const { container } = render(<CookieConsent />);

    // Avança timers para garantir que o setTimeout do useEffect execute
    act(() => { vi.advanceTimersByTime(2000); });

    expect(container.firstChild).toBeNull();
  });

  it('renderiza quando localStorage não tem versão salva', () => {
    const { container } = render(<CookieConsent />);
    act(() => { vi.advanceTimersByTime(2000); });

    expect(screen.getByText(/Nós usamos cookies/i)).toBeInTheDocument();
  });

  it('renderiza quando localStorage tem versão diferente', () => {
    window.localStorage.setItem(STORAGE_KEY, 'old-version-0');
    const { container } = render(<CookieConsent />);
    act(() => { vi.advanceTimersByTime(2000); });

    expect(screen.getByText(/Nós usamos cookies/i)).toBeInTheDocument();
  });

  it('NÃO renderiza imediatamente (delay de 1500ms)', () => {
    const { container } = render(<CookieConsent />);

    // Antes do delay, não deve estar visível
    act(() => { vi.advanceTimersByTime(1000); });
    expect(container.firstChild).toBeNull();
  });

  it('renderiza após 1500ms', () => {
    const { container } = render(<CookieConsent />);

    act(() => { vi.advanceTimersByTime(1499); });
    expect(container.firstChild).toBeNull();

    act(() => { vi.advanceTimersByTime(2); });
    expect(screen.getByText(/Nós usamos cookies/i)).toBeInTheDocument();
  });

  // ─── Botão "Entendi" ──────────────────────────────────────────────────
  it('botão "Entendi" salva CONSENT_VERSION no localStorage', () => {
    render(<CookieConsent />);
    act(() => { vi.advanceTimersByTime(2000); });

    fireEvent.click(screen.getByText('Entendi'));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(CONSENT_VERSION);
  });

  it('botão "Entendi" esconde o banner', () => {
    render(<CookieConsent />);
    act(() => { vi.advanceTimersByTime(2000); });

    fireEvent.click(screen.getByText('Entendi'));

    expect(screen.queryByText(/Nós usamos cookies/i)).not.toBeInTheDocument();
  });

  // ─── Botão fechar (X) ─────────────────────────────────────────────────
  it('botão de fechar (X) esconde o banner sem salvar', () => {
    render(<CookieConsent />);
    act(() => { vi.advanceTimersByTime(2000); });

    const closeButton = screen.getByTitle('Fechar');
    fireEvent.click(closeButton);

    expect(screen.queryByText(/Nós usamos cookies/i)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // ─── Conteúdo ─────────────────────────────────────────────────────────
  it('menciona lumina_token (cookie httpOnly)', () => {
    render(<CookieConsent />);
    act(() => { vi.advanceTimersByTime(2000); });

    expect(screen.getByText(/lumina_token/i)).toBeInTheDocument();
  });

  it('menciona httpOnly', () => {
    render(<CookieConsent />);
    act(() => { vi.advanceTimersByTime(2000); });

    expect(screen.getByText(/httpOnly/i)).toBeInTheDocument();
  });
});
