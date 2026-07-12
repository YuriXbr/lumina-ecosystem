/**
 * src/components/InventoryPreview.test.jsx
 *
 * Testes para src/components/InventoryPreview.jsx
 *
 * Cobre:
 *   - Estado de loading mostra skeleton
 *   - Estado de erro mostra mensagem + retry
 *   - Renderiza 3 stat boxes (hextechChests, masterWorkChests, keys)
 *   - Daily reward available mostra botão de resgatar
 *   - Daily reward not available mostra countdown
 *   - Link para /inventory
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import InventoryPreview from './InventoryPreview';
import { renderWithI18n, makeInventory } from '../test/testUtils';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InventoryPreview', () => {
  it('mostra skeleton no estado de loading', () => {
    const { container } = renderWithI18n(
      <InventoryPreview loading={true} error={null} inventory={null} onRetry={vi.fn()} />
    );
    // 3 skeleton divs com classe animate-pulse h-20
    const skeletons = container.querySelectorAll('.animate-pulse.h-20');
    expect(skeletons.length).toBe(3);
  });

  it('mostra erro + botão de retry no estado de erro', () => {
    const onRetry = vi.fn();
    renderWithI18n(
      <InventoryPreview loading={false} error="boom" inventory={null} onRetry={onRetry} />
    );
    // Mensagem de erro (en-US: "Failed to load inventory")
    expect(screen.getByText(/failed to load inventory/i)).toBeInTheDocument();
    // Botão de retry (en-US: "Try again")
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renderiza 3 stat boxes (hextechChests, masterWorkChests, keys)', () => {
    const inv = makeInventory({
      hextechChests: 5,
      masterWorkChests: 2,
      keys: 10,
      dailyRewardAvailable: false,
      nextDailyReward: null,
    });
    const { container } = renderWithI18n(
      <InventoryPreview loading={false} error={null} inventory={inv} onRetry={vi.fn()} />
    );
    // 3 stat boxes com gradiente
    const statBoxes = container.querySelectorAll('.bg-gradient-to-br');
    expect(statBoxes.length).toBe(3);
    // Valores numéricos
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    // Labels (en-US)
    expect(screen.getByText(/Hextech Chests/i)).toBeInTheDocument();
    expect(screen.getByText(/Masterwork Chests/i)).toBeInTheDocument();
  });

  it('mostra botão de resgatar quando dailyRewardAvailable=true', () => {
    const inv = makeInventory({
      dailyRewardAvailable: true,
      nextDailyReward: null,
    });
    const { container } = renderWithI18n(
      <InventoryPreview loading={false} error={null} inventory={inv} onRetry={vi.fn()} />
    );
    // O botão de resgatar é um <a> roxo (bg-purple-600) com href=/inventory
    const claimButton = container.querySelector('a.bg-purple-600[href="/inventory"]');
    expect(claimButton).toBeInTheDocument();
    // Tem o emoji 🎁
    expect(claimButton.textContent).toContain('🎁');
  });

  it('mostra countdown quando dailyRewardAvailable=false e há nextDailyReward', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const inv = makeInventory({
      dailyRewardAvailable: false,
      nextDailyReward: tomorrow,
      dailyRewardStreak: 3,
    });
    const { container } = renderWithI18n(
      <InventoryPreview loading={false} error={null} inventory={inv} onRetry={vi.fn()} />
    );
    // O countdown é um <p> com classe text-xs text-gray-500 text-center
    const countdownP = container.querySelector('p.text-xs.text-gray-500.text-center');
    expect(countdownP).toBeInTheDocument();
    // Deve conter o emoji 🔥 e o streak (3)
    expect(countdownP.textContent).toContain('🔥');
    expect(countdownP.textContent).toContain('3');
  });

  it('tem link para /inventory', () => {
    renderWithI18n(
      <InventoryPreview
        loading={false}
        error={null}
        inventory={makeInventory({ dailyRewardAvailable: false, nextDailyReward: null })}
        onRetry={vi.fn()}
      />
    );
    const links = screen.getAllByRole('link', { href: '/inventory' });
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it('NÃO mostra botão de resgatar quando dailyRewardAvailable=false', () => {
    const inv = makeInventory({
      dailyRewardAvailable: false,
      nextDailyReward: null,
    });
    const { container } = renderWithI18n(
      <InventoryPreview loading={false} error={null} inventory={inv} onRetry={vi.fn()} />
    );
    const claimButton = container.querySelector('a.bg-purple-600[href="/inventory"]');
    expect(claimButton).not.toBeInTheDocument();
  });
});
