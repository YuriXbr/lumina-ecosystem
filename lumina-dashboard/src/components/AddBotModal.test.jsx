/**
 * src/components/AddBotModal.test.jsx
 *
 * Testes para src/components/AddBotModal.jsx
 *
 * Cobre:
 *   - Retorna null quando guild é null
 *   - Renderiza o nome da guilda
 *   - Renderiza 4 feature cards
 *   - Checkbox alterna estado de aceite
 *   - Link OAuth fica desabilitado quando não aceito
 *   - onClose chamado ao clicar no botão X
 *   - onClose chamado ao clicar no overlay
 *   - URL OAuth contém guild_id da guilda
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import AddBotModal from './AddBotModal';
import { renderWithI18n, makeGuild } from '../test/testUtils';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AddBotModal', () => {
  it('retorna null quando guild é null', () => {
    const { container } = renderWithI18n(
      <AddBotModal guild={null} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza o nome da guilda', () => {
    const guild = makeGuild({ name: 'My Test Server' });
    const { container } = renderWithI18n(
      <AddBotModal guild={guild} onClose={vi.fn()} />
    );
    // O nome da guilda aparece dentro de <strong> no header e na descrição
    const strongs = container.querySelectorAll('strong');
    expect(strongs.length).toBeGreaterThanOrEqual(1);
    expect(strongs[0].textContent).toBe('My Test Server');
  });

  it('renderiza 4 feature cards', () => {
    const guild = makeGuild();
    const { container } = renderWithI18n(
      <AddBotModal guild={guild} onClose={vi.fn()} />
    );
    // Cada feature card tem classe bg-gray-50 rounded-lg border border-gray-100
    const cards = container.querySelectorAll('.bg-gray-50.rounded-lg.border');
    expect(cards.length).toBe(4);
    // Ícones dos 4 cards
    expect(screen.getByText('🎮')).toBeInTheDocument();
    expect(screen.getByText('🛡️')).toBeInTheDocument();
    expect(screen.getByText('💎')).toBeInTheDocument();
    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  it('checkbox inicia desmarcado e alterna para marcado', () => {
    const guild = makeGuild();
    renderWithI18n(<AddBotModal guild={guild} onClose={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('link OAuth fica desabilitado quando não aceito', () => {
    const guild = makeGuild();
    const { container } = renderWithI18n(
      <AddBotModal guild={guild} onClose={vi.fn()} />
    );
    const oauthLink = container.querySelector(
      'a[href*="discord.com/oauth2/authorize"]'
    );
    expect(oauthLink).toBeInTheDocument();
    expect(oauthLink.className).toContain('pointer-events-none');
    expect(oauthLink.className).toContain('cursor-not-allowed');
  });

  it('link OAuth fica habilitado quando aceito', () => {
    const guild = makeGuild();
    const { container } = renderWithI18n(
      <AddBotModal guild={guild} onClose={vi.fn()} />
    );
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    const oauthLink = container.querySelector(
      'a[href*="discord.com/oauth2/authorize"]'
    );
    expect(oauthLink.className).not.toContain('pointer-events-none');
    expect(oauthLink.className).toContain('bg-purple-600');
  });

  it('chama onClose ao clicar no botão X', () => {
    const onClose = vi.fn();
    const { container } = renderWithI18n(
      <AddBotModal guild={makeGuild()} onClose={onClose} />
    );
    // O botão X é o único button com classe text-gray-400
    const xButton = container.querySelector('button.text-gray-400');
    expect(xButton).toBeInTheDocument();
    fireEvent.click(xButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no overlay', () => {
    const onClose = vi.fn();
    const { container } = renderWithI18n(
      <AddBotModal guild={makeGuild()} onClose={onClose} />
    );
    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('URL OAuth contém guild_id da guilda', () => {
    const guild = makeGuild({ id: '123456789012345678' });
    const { container } = renderWithI18n(
      <AddBotModal guild={guild} onClose={vi.fn()} />
    );
    const oauthLink = container.querySelector(
      'a[href*="discord.com/oauth2/authorize"]'
    );
    const href = oauthLink.getAttribute('href');
    expect(href).toContain('guild_id=123456789012345678');
    expect(href).toContain('client_id=');
    expect(href).toContain('permissions=');
    expect(href).toContain('scope=bot+applications.commands');
  });
});
