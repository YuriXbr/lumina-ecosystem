/**
 * src/components/LanguageSwitcher.test.jsx
 *
 * Testes para src/components/LanguageSwitcher.jsx
 *
 * Cobre:
 *   - Renderiza no modo compact e default
 *   - Botão mostra a bandeira do locale atual
 *   - Dropdown abre ao clicar no botão
 *   - Lista os 3 idiomas suportados (en-US, pt-BR, es-ES)
 *   - Selecionar um idioma chama setLocale e salva no localStorage
 *   - Dropdown fecha ao clicar fora
 *   - Modo compact tem classes diferentes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { renderWithI18n } from '../test/testUtils';

function renderSwitcher(compact = false, initialLocale = 'en-US') {
  // Mock localStorage para detectLocale usar o locale inicial
  if (initialLocale) {
    window.localStorage.setItem('lumina_preferred_locale', initialLocale);
  }

  return renderWithI18n(<LanguageSwitcher compact={compact} />);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('LanguageSwitcher', () => {
  it('renderiza no modo default', () => {
    renderSwitcher();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renderiza no modo compact', () => {
    renderSwitcher(true);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('mostra a bandeira do locale atual (pt-BR)', () => {
    renderSwitcher(false, 'pt-BR');
    expect(screen.getByText('🇧🇷')).toBeInTheDocument();
  });

  it('mostra a bandeira do locale atual (en-US)', () => {
    renderSwitcher(false, 'en-US');
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('mostra a bandeira do locale atual (es-ES)', () => {
    renderSwitcher(false, 'es-ES');
    expect(screen.getByText('🇪🇸')).toBeInTheDocument();
  });

  // ─── Dropdown ─────────────────────────────────────────────────────────
  // NOTA: testes de dropdown usam modo compact (não mostra label no botão)
  // para que possamos distinguir o label "English" no botão do item "English"
  // no dropdown aberto.
  it('dropdown NÃO está visível por padrão (modo compact)', () => {
    renderSwitcher(true);
    expect(screen.queryByText('English')).not.toBeInTheDocument();
    expect(screen.queryByText('Português')).not.toBeInTheDocument();
    expect(screen.queryByText('Español')).not.toBeInTheDocument();
  });

  it('dropdown abre ao clicar no botão (modo compact)', () => {
    renderSwitcher(true);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Português')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
  });

  it('dropdown fecha ao clicar novamente no botão (modo compact)', () => {
    renderSwitcher(true);
    const button = screen.getByRole('button');

    fireEvent.click(button); // abre
    expect(screen.getByText('English')).toBeInTheDocument();

    fireEvent.click(button); // fecha
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  // ─── Seleção de idioma (modo compact para distinguir label do botão) ──
  it('selecionar Português salva no localStorage', () => {
    renderSwitcher(true, 'en-US');
    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByText('Português'));

    expect(window.localStorage.getItem('lumina_preferred_locale')).toBe('pt-BR');
  });

  it('selecionar English muda a bandeira exibida', () => {
    renderSwitcher(true, 'pt-BR');
    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByText('English'));

    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('selecionar Español muda a bandeira exibida', () => {
    renderSwitcher(true, 'en-US');
    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByText('Español'));

    expect(screen.getByText('🇪🇸')).toBeInTheDocument();
  });

  it('dropdown fecha após selecionar um idioma', () => {
    renderSwitcher(true, 'en-US');
    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByText('Português'));

    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  // ─── Click outside ────────────────────────────────────────────────────
  it('dropdown fecha ao clicar fora', () => {
    // Usa renderWithI18n para envolver LanguageSwitcher com providers
    window.localStorage.setItem('lumina_preferred_locale', 'en-US');
    const { container } = renderWithI18n(
      <div>
        <div data-testid="outside">Outside area</div>
        <LanguageSwitcher compact />
      </div>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('English')).toBeInTheDocument();

    // Clica fora
    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  // ─── Modo compact ─────────────────────────────────────────────────────
  it('modo compact mostra apenas bandeira + ícone (sem label)', () => {
    renderSwitcher(true, 'en-US');
    expect(screen.queryByText('English')).not.toBeInTheDocument();
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  // ─── Checkmark do idioma atual ────────────────────────────────────────
  it('mostra checkmark no idioma atual', () => {
    renderSwitcher(true, 'pt-BR');
    fireEvent.click(screen.getByRole('button'));

    // No modo compact, "Português" só aparece no dropdown aberto
    const ptItem = screen.getByText('Português').closest('button');
    expect(ptItem).toBeInTheDocument();
    expect(ptItem.querySelector('svg')).toBeInTheDocument();
  });

  it('NÃO mostra checkmark em idiomas não-selecionados', () => {
    renderSwitcher(true, 'pt-BR');
    fireEvent.click(screen.getByRole('button'));

    const enItem = screen.getByText('English').closest('button');
    const esItem = screen.getByText('Español').closest('button');

    expect(enItem.className).not.toContain('text-purple-700');
    expect(esItem.className).not.toContain('text-purple-700');
  });
});
