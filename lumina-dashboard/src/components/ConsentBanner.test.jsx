/**
 * src/components/ConsentBanner.test.jsx
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import ConsentBanner from './ConsentBanner';

const STORAGE_KEY = 'lumina_consent_v1';

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ConsentBanner', () => {
  it('NÃO renderiza quando localStorage já tem consent', () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    const { container } = render(<ConsentBanner />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(container.firstChild).toBeNull();
  });

  it('NÃO renderiza imediatamente (delay de 2000ms)', () => {
    const { container } = render(<ConsentBanner />);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(container.firstChild).toBeNull();
  });

  it('renderiza após 2000ms', () => {
    const { container } = render(<ConsentBanner />);
    act(() => { vi.advanceTimersByTime(2001); });
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText(/cookies essenciais/i)).toBeInTheDocument();
  });

  it('renderiza quando localStorage está vazio', () => {
    const { container } = render(<ConsentBanner />);
    act(() => { vi.advanceTimersByTime(2001); });
    expect(container.firstChild).not.toBeNull();
  });

  it('botão "Entendi" salva no localStorage e esconde', () => {
    render(<ConsentBanner />);
    act(() => { vi.advanceTimersByTime(2001); });

    fireEvent.click(screen.getByText('Entendi'));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
    expect(screen.queryByText(/cookies essenciais/i)).not.toBeInTheDocument();
  });

  it('menciona httpOnly no texto', () => {
    render(<ConsentBanner />);
    act(() => { vi.advanceTimersByTime(2001); });
    expect(screen.getByText(/httpOnly/i)).toBeInTheDocument();
  });

  it('NÃO crasha quando localStorage.getItem lança', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: vi.fn(() => { throw new Error('Security'); }), setItem: vi.fn(() => { throw new Error('Security'); }) },
      writable: true, configurable: true,
    });

    expect(() => {
      render(<ConsentBanner />);
      act(() => { vi.advanceTimersByTime(2001); });
    }).not.toThrow();

    Object.defineProperty(window, 'localStorage', { value: original, writable: true, configurable: true });
  });
});
