/**
 * src/components/DailyRewardBanner.test.jsx
 *
 * Testes para src/components/DailyRewardBanner.jsx
 *
 * Cobre:
 *   - Retorna null quando inventory é null
 *   - Mostra banner roxo quando dailyRewardAvailable=true
 *   - Mostra banner cinza quando já resgatado (streak > 0)
 *   - Mostra countdown timer
 *   - Botão Resgatar chama onClaim
 *   - Estado de loading mostra skeleton
 *   - Erro retorna null silenciosamente
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import DailyRewardBanner from './DailyRewardBanner';
import { renderWithI18n, makeInventory } from '../test/testUtils';

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

describe('DailyRewardBanner', () => {
  it('retorna null quando inventory é null', () => {
    const { container } = renderWithI18n(
      <DailyRewardBanner onClaim={vi.fn()} inventory={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('mostra banner roxo quando dailyRewardAvailable=true', () => {
    const inv = makeInventory({ dailyRewardAvailable: true });
    const { container } = renderWithI18n(
      <DailyRewardBanner onClaim={vi.fn()} inventory={inv} />
    );
    // Banner roxo tem bg-gradient-to-r
    const banner = container.querySelector('.bg-gradient-to-r');
    expect(banner).toBeInTheDocument();
    // Botão "Resgatar" (texto hardcoded em PT)
    const claimButton = screen.getByRole('button', { name: /resgatar/i });
    expect(claimButton).toBeInTheDocument();
  });

  it('mostra banner cinza quando já resgatado (streak > 0)', () => {
    const inv = makeInventory({
      dailyRewardAvailable: false,
      dailyRewardStreak: 3,
      nextDailyReward: null,
    });
    const { container } = renderWithI18n(
      <DailyRewardBanner onClaim={vi.fn()} inventory={inv} />
    );
    // Banner cinza tem bg-gray-50
    const banner = container.querySelector('.bg-gray-50');
    expect(banner).toBeInTheDocument();
    // Texto de streak (hardcoded em PT): "Sequência de 3 dias consecutivos!"
    expect(screen.getByText(/3 dia/i)).toBeInTheDocument();
  });

  it('mostra countdown timer quando há nextDailyReward', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const inv = makeInventory({
      dailyRewardAvailable: false,
      dailyRewardStreak: 3,
      nextDailyReward: tomorrow.toISOString(),
    });
    const { container } = renderWithI18n(
      <DailyRewardBanner onClaim={vi.fn()} inventory={inv} />
    );
    // Countdown tem classe font-mono font-semibold
    const countdown = container.querySelector('.font-mono.font-semibold');
    expect(countdown).toBeInTheDocument();
    // Formato HH:MM:SS
    expect(countdown.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('botão Resgatar chama onClaim', () => {
    const onClaim = vi.fn();
    const inv = makeInventory({ dailyRewardAvailable: true });
    renderWithI18n(<DailyRewardBanner onClaim={onClaim} inventory={inv} />);
    const claimButton = screen.getByRole('button', { name: /resgatar/i });
    fireEvent.click(claimButton);
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('mostra streak no banner roxo quando disponível e streak > 0', () => {
    const inv = makeInventory({
      dailyRewardAvailable: true,
      dailyRewardStreak: 5,
    });
    const { container } = renderWithI18n(
      <DailyRewardBanner onClaim={vi.fn()} inventory={inv} />
    );
    // Banner roxo
    expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
    // Texto de streak (hardcoded PT): "5 dias seguidos"
    expect(screen.getByText(/5 dia/i)).toBeInTheDocument();
  });

  it('estado de loading mostra skeleton', async () => {
    // Sem inventory prop → busca local; fetch nunca resolve → loading fica true
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithI18n(
      <DailyRewardBanner onClaim={vi.fn()} />
    );
    // Skeleton tem classe animate-pulse h-16
    await waitFor(() => {
      expect(container.querySelector('.animate-pulse.h-16')).toBeInTheDocument();
    });
  });

  it('erro retorna null silenciosamente', async () => {
    // Sem inventory prop; fetch rejeita → localError é setado → retorna null
    mockFetch.mockRejectedValue(new Error('Network error'));
    const { container } = renderWithI18n(
      <DailyRewardBanner onClaim={vi.fn()} />
    );
    // Primeiro espera o skeleton aparecer (loading state)
    await waitFor(() => {
      expect(container.querySelector('.animate-pulse.h-16')).toBeInTheDocument();
    });
    // Depois espera o skeleton sumir (após o erro)
    await waitFor(() => {
      expect(container.querySelector('.animate-pulse.h-16')).not.toBeInTheDocument();
    });
    // Container volta a ser null (erro silencioso)
    expect(container.firstChild).toBeNull();
  });

  it('erro HTTP 500 também retorna null silenciosamente', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: 'Server error' }, 500)
    );
    const { container } = renderWithI18n(
      <DailyRewardBanner onClaim={vi.fn()} />
    );
    await waitFor(() => {
      expect(container.querySelector('.animate-pulse.h-16')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('NÃO chama fetch de inventário quando inventory prop é passado', () => {
    const inv = makeInventory({ dailyRewardAvailable: true });
    renderWithI18n(
      <DailyRewardBanner onClaim={vi.fn()} inventory={inv} />,
      { loading: true }
    );
    // O UserContext pode chamar /session, mas o DailyRewardBanner
    // não deve chamar /myinventory quando inventory é passado via prop
    const inventoryCalls = mockFetch.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.includes('expapi/v1/myinventory')
    );
    expect(inventoryCalls.length).toBe(0);
  });
});
