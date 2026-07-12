/**
 * src/components/MutualGuildsList.test.jsx
 *
 * Testes para src/components/MutualGuildsList.jsx
 *
 * Cobre:
 *   - Estado de loading mostra skeleton cards
 *   - Estado de erro mostra ErrorState
 *   - Renderiza guild cards
 *   - Botões de filtro funcionam
 *   - Botão de refresh chama fetchMyGuilds novamente
 *   - Guild card mostra link de configurar quando hasBot && canManage
 *   - Guild card mostra botão de adicionar bot quando !hasBot && canManage
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import MutualGuildsList from './MutualGuildsList';
import { renderWithProviders, makeGuild } from '../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('MutualGuildsList', () => {
  it('mostra skeleton no estado de loading', () => {
    // Fetch nunca resolve — loading fica true
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithProviders(<MutualGuildsList />, {
      loading: true,
    });
    // 6 skeleton cards com classe animate-pulse
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
  });

  it('mostra ErrorState quando fetch falha', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Network error' }, 500));
    renderWithProviders(<MutualGuildsList />, { loading: true });
    // ErrorState tem título (en-US: "Could not load your servers")
    await waitFor(() => {
      expect(screen.getByText(/could not load your servers/i)).toBeInTheDocument();
    });
  });

  it('renderiza guild cards', async () => {
    const guilds = [
      makeGuild({ id: '1', name: 'Guild Alpha', hasBot: true, canManage: true }),
      makeGuild({ id: '2', name: 'Guild Beta', hasBot: false, canManage: false }),
    ];
    mockFetch.mockResolvedValue(jsonResponse({ guilds }));
    renderWithProviders(<MutualGuildsList />, { loading: true });
    await waitFor(() => {
      expect(screen.getByText('Guild Alpha')).toBeInTheDocument();
      expect(screen.getByText('Guild Beta')).toBeInTheDocument();
    });
  });

  it('botões de filtro funcionam', async () => {
    const guilds = [
      makeGuild({ id: '1', name: 'WithBotGuild', hasBot: true, canManage: true }),
      makeGuild({ id: '2', name: 'NoBotGuild', hasBot: false, canManage: false }),
    ];
    mockFetch.mockResolvedValue(jsonResponse({ guilds }));
    renderWithProviders(<MutualGuildsList />, { loading: true });
    await waitFor(() => {
      expect(screen.getByText('WithBotGuild')).toBeInTheDocument();
    });
    // Clica no filtro "Without Bot" (en-US)
    const withoutBotBtn = screen.getByRole('button', { name: /without bot/i });
    fireEvent.click(withoutBotBtn);
    // A guild com bot some
    expect(screen.queryByText('WithBotGuild')).not.toBeInTheDocument();
    // A guild sem bot permanece
    expect(screen.getByText('NoBotGuild')).toBeInTheDocument();
  });

  it('botão de refresh chama fetchMyGuilds novamente', async () => {
    const guilds = [makeGuild({ id: '1', name: 'Guild A' })];
    mockFetch.mockResolvedValue(jsonResponse({ guilds }));
    renderWithProviders(<MutualGuildsList />, { loading: true });
    await waitFor(() => {
      expect(screen.getByText('Guild A')).toBeInTheDocument();
    });
    // 1 chamada ao fetch (para /my-guilds)
    const initialCalls = mockFetch.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.includes('expapi/v1/my-guilds')
    ).length;
    expect(initialCalls).toBe(1);
    // Clica no botão de refresh (en-US: "Refresh")
    const refreshBtn = screen.getByRole('button', { name: /^refresh$/i });
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      const totalCalls = mockFetch.mock.calls.filter(
        ([url]) => typeof url === 'string' && url.includes('expapi/v1/my-guilds')
      ).length;
      expect(totalCalls).toBe(2);
    });
  });

  it('guild card mostra link de configurar quando hasBot && canManage', async () => {
    const guilds = [
      makeGuild({ id: '123', name: 'Managed', hasBot: true, canManage: true }),
    ];
    mockFetch.mockResolvedValue(jsonResponse({ guilds }));
    const { container } = renderWithProviders(<MutualGuildsList />, {
      loading: true,
    });
    await waitFor(() => {
      expect(screen.getByText('Managed')).toBeInTheDocument();
    });
    // Link para /server/123
    const configureLink = container.querySelector('a[href="/server/123"]');
    expect(configureLink).toBeInTheDocument();
  });

  it('guild card mostra botão de adicionar bot quando !hasBot && canManage', async () => {
    const guilds = [
      makeGuild({ id: '456', name: 'NoBotManaged', hasBot: false, canManage: true }),
    ];
    mockFetch.mockResolvedValue(jsonResponse({ guilds }));
    renderWithProviders(<MutualGuildsList />, { loading: true });
    await waitFor(() => {
      expect(screen.getByText('NoBotManaged')).toBeInTheDocument();
    });
    // Botão "Add Bot" (en-US: "Add Bot")
    const addBotBtn = screen.getByRole('button', { name: /add bot/i });
    expect(addBotBtn).toBeInTheDocument();
    // Clicar abre o AddBotModal
    fireEvent.click(addBotBtn);
    // AddBotModal renderiza o link "Continue to Discord" (en-US)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /continue to discord/i })).toBeInTheDocument();
    });
  });

  it('guild card mostra mensagem de sem permissão quando !canManage && hasBot', async () => {
    const guilds = [
      makeGuild({ id: '789', name: 'NoPermGuild', hasBot: true, canManage: false }),
    ];
    mockFetch.mockResolvedValue(jsonResponse({ guilds }));
    renderWithProviders(<MutualGuildsList />, { loading: true });
    await waitFor(() => {
      expect(screen.getByText('NoPermGuild')).toBeInTheDocument();
    });
    // (en-US: "No permission to manage")
    expect(screen.getByText(/no permission to manage/i)).toBeInTheDocument();
  });
});
