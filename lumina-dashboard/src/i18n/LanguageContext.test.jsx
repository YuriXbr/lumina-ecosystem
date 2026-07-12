/**
 * src/i18n/LanguageContext.test.jsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { LanguageProvider, useI18n, useT } from './LanguageContext';
import { UserProvider } from '../contexts/UserContext';
import { MemoryRouter } from 'react-router-dom';

beforeEach(() => {
  window.localStorage.clear();
});

function renderWithProviders(ui, user = null) {
  return render(
    <MemoryRouter>
      <UserProvider initialUser={user}>
        <LanguageProvider>{ui}</LanguageProvider>
      </UserProvider>
    </MemoryRouter>
  );
}

function TestConsumer() {
  const { locale, setLocale, t, supportedLocales, defaultLocale } = useI18n();
  return (
    <div>
      <div data-testid="locale">{locale}</div>
      <div data-testid="defaultLocale">{defaultLocale}</div>
      <div data-testid="supportedCount">{supportedLocales.length}</div>
      <div data-testid="translated">{t('common.email', { defaultValue: 'Email' })}</div>
      <button onClick={() => setLocale('pt-BR')}>PT</button>
      <button onClick={() => setLocale('en-US')}>EN</button>
    </div>
  );
}

describe('LanguageContext', () => {
  it('useI18n lança erro fora do Provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useI18n must be used within a LanguageProvider');
    spy.mockRestore();
  });

  it('fornece locale, setLocale, t, supportedLocales, defaultLocale', () => {
    renderWithProviders(<TestConsumer />);
    expect(screen.getByTestId('locale')).toBeInTheDocument();
    expect(screen.getByTestId('defaultLocale').textContent).toBe('en-US');
    expect(screen.getByTestId('supportedCount').textContent).toBe('3');
  });

  it('setLocale muda o locale', () => {
    renderWithProviders(<TestConsumer />);
    const initialLocale = screen.getByTestId('locale').textContent;
    fireEvent.click(screen.getByText('PT'));
    expect(screen.getByTestId('locale').textContent).toBe('pt-BR');
    expect(screen.getByTestId('locale').textContent).not.toBe(initialLocale);
  });

  it('t() retorna string traduzida', () => {
    renderWithProviders(<TestConsumer />);
    expect(screen.getByTestId('translated').textContent).toBeTruthy();
  });

  it('atualiza <html lang> quando locale muda', () => {
    renderWithProviders(<TestConsumer />);
    screen.getByText('PT').click();
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('resolve locale a partir de user.language', () => {
    renderWithProviders(<TestConsumer />, { language: 'pt-BR' });
    expect(screen.getByTestId('locale').textContent).toBe('pt-BR');
  });

  it('resolve locale a partir de localStorage quando user é null', () => {
    window.localStorage.setItem('lumina_preferred_locale', 'es-ES');
    renderWithProviders(<TestConsumer />, null);
    expect(screen.getByTestId('locale').textContent).toBe('es-ES');
  });

  it('useT retorna apenas a função t', () => {
    function TOnlyConsumer() {
      const t = useT();
      return <div data-testid="t-result">{t('common.email', { defaultValue: 'Email' })}</div>;
    }
    renderWithProviders(<TOnlyConsumer />);
    expect(screen.getByTestId('t-result').textContent).toBeTruthy();
  });
});
