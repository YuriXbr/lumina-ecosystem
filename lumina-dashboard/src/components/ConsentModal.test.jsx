/**
 * src/components/ConsentModal.test.jsx
 *
 * Testes para src/components/ConsentModal.jsx
 *
 * Cobre:
 *   - Não renderiza quando localStorage tem consentimento
 *   - Renderiza quando localStorage está vazio
 *   - Renderiza quando localStorage falha (modo privado)
 *   - Botão Accept salva { accepted: true, date } e esconde
 *   - Botão Decline salva { accepted: false, date } e esconde
 *   - Botão X (fechar) funciona como Decline
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ConsentModal from './ConsentModal';
import { renderWithI18n } from '../test/testUtils';

const STORAGE_KEY = 'lumina_cookie_consent_v1';

beforeEach(() => {
  window.localStorage.clear();
});

describe('ConsentModal', () => {
  it('NÃO renderiza quando localStorage tem consentimento salvo', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, date: '2024-01-01' }));
    const { container } = renderWithI18n(<ConsentModal />);

    expect(container.firstChild).toBeNull();
  });

  it('renderiza quando localStorage está vazio', () => {
    renderWithI18n(<ConsentModal />);

    expect(screen.getByText('🍪')).toBeInTheDocument();
  });

  // ─── Botão Accept ─────────────────────────────────────────────────────
  it('botão Accept salva { accepted: true } no localStorage', () => {
    renderWithI18n(<ConsentModal />);

    const acceptButton = screen.getByText(/Accept/i);
    fireEvent.click(acceptButton);

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(saved.accepted).toBe(true);
    expect(saved.date).toBeDefined();
  });

  it('botão Accept esconde o modal', () => {
    renderWithI18n(<ConsentModal />);

    fireEvent.click(screen.getByText(/Accept/i));

    expect(screen.queryByText('🍪')).not.toBeInTheDocument();
  });

  // ─── Botão Decline ────────────────────────────────────────────────────
  it('botão Decline salva { accepted: false } no localStorage', () => {
    renderWithI18n(<ConsentModal />);

    const declineButton = screen.getByText(/Decline/i);
    fireEvent.click(declineButton);

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(saved.accepted).toBe(false);
    expect(saved.date).toBeDefined();
  });

  it('botão Decline esconde o modal', () => {
    renderWithI18n(<ConsentModal />);

    fireEvent.click(screen.getByText(/Decline/i));

    expect(screen.queryByText('🍪')).not.toBeInTheDocument();
  });

  // ─── Botão X (fechar) ─────────────────────────────────────────────────
  it('botão X (aria-label Close) funciona como Decline', () => {
    renderWithI18n(<ConsentModal />);

    const closeButton = screen.getByLabelText(/Close/i);
    fireEvent.click(closeButton);

    expect(screen.queryByText('🍪')).not.toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(saved.accepted).toBe(false);
  });

  // ─── localStorage indisponível ────────────────────────────────────────
  it('renderiza quando localStorage.getItem lança (modo privado)', () => {
    // Salva o localStorage original
    const original = window.localStorage;
    const mockStorage = {
      getItem: vi.fn(() => { throw new Error('Security error'); }),
      setItem: vi.fn(() => { throw new Error('Security error'); }),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    renderWithI18n(<ConsentModal />);

    expect(screen.getByText('🍪')).toBeInTheDocument();

    // Restaura o localStorage original ANTES do afterEach rodar
    Object.defineProperty(window, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it('NÃO crasha quando setItem lança (modo privado)', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => { throw new Error('QuotaExceeded'); }),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    expect(() => {
      renderWithI18n(<ConsentModal />);
      fireEvent.click(screen.getByText(/Accept/i));
    }).not.toThrow();

    // Restaura
    Object.defineProperty(window, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});
