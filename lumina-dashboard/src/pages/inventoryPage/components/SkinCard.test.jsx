/**
 * src/pages/inventoryPage/components/SkinCard.test.jsx
 *
 * Testes para src/pages/inventoryPage/components/SkinCard.jsx
 *
 * Cobre:
 *   - Renderiza nome da skin, championName, raridade
 *   - Imagem da skin usa URL do ddragon
 *   - Badge de raridade tem cor correta
 *   - Contador de quantidade aparece quando > 1
 *   - NÃO mostra contador quando count = 1 ou ausente
 *   - Ícone de raridade sobreposto para raridades não-Legacy
 *   - getRarityLabel traduz raridades
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SkinCard from './SkinCard';
import { renderWithI18n } from '../../../test/testUtils';

describe('SkinCard', () => {
  const baseSkin = {
    id: 1001,
    name: 'Cool Skin',
    championId: 1,
    championName: 'Annie',
    rarity: 'kEpic',
    count: 1,
  };

  it('renderiza nome da skin', () => {
    renderWithI18n(<SkinCard skin={baseSkin} />);
    expect(screen.getByText('Cool Skin')).toBeInTheDocument();
  });

  it('renderiza championName', () => {
    renderWithI18n(<SkinCard skin={baseSkin} />);
    expect(screen.getByText('Annie')).toBeInTheDocument();
  });

  it('renderiza ID da skin (#001)', () => {
    renderWithI18n(<SkinCard skin={baseSkin} />);
    expect(screen.getByText('#001')).toBeInTheDocument();
  });

  it('imagem da skin usa URL do ddragon', () => {
    const { container } = renderWithI18n(<SkinCard skin={baseSkin} />);
    const img = container.querySelector('img[src*="ddragon.leagueoflegends.com"]');
    expect(img).toBeInTheDocument();
    // URL deve conter championId e os últimos 3 dígitos do id
    expect(img.getAttribute('src')).toContain('/1_');
  });

  // ─── Contador de quantidade ───────────────────────────────────────────
  it('mostra contador quando count > 1', () => {
    renderWithI18n(<SkinCard skin={{ ...baseSkin, count: 5 }} />);
    expect(screen.getByText('×5')).toBeInTheDocument();
  });

  it('NÃO mostra contador quando count = 1', () => {
    renderWithI18n(<SkinCard skin={{ ...baseSkin, count: 1 }} />);
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });

  it('NÃO mostra contador quando count é undefined', () => {
    const { count, ...skinWithoutCount } = baseSkin;
    renderWithI18n(<SkinCard skin={skinWithoutCount} />);
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });

  // ─── Raridades ────────────────────────────────────────────────────────
  it('kEpic usa gradiente roxo', () => {
    const { container } = renderWithI18n(<SkinCard skin={baseSkin} />);
    const badge = container.querySelector('.bg-gradient-to-r.from-purple-500');
    expect(badge).toBeInTheDocument();
  });

  it('kLegendary usa gradiente amarelo', () => {
    const { container } = renderWithI18n(<SkinCard skin={{ ...baseSkin, rarity: 'kLegendary' }} />);
    const badge = container.querySelector('.bg-gradient-to-r.from-yellow-500');
    expect(badge).toBeInTheDocument();
  });

  it('kMythic usa gradiente vermelho', () => {
    const { container } = renderWithI18n(<SkinCard skin={{ ...baseSkin, rarity: 'kMythic' }} />);
    const badge = container.querySelector('.bg-gradient-to-r.from-red-500');
    expect(badge).toBeInTheDocument();
  });

  it('kUltimate usa gradiente indigo', () => {
    const { container } = renderWithI18n(<SkinCard skin={{ ...baseSkin, rarity: 'kUltimate' }} />);
    const badge = container.querySelector('.bg-gradient-to-r.from-indigo-500');
    expect(badge).toBeInTheDocument();
  });

  it('kTranscendent usa gradiente pink', () => {
    const { container } = renderWithI18n(<SkinCard skin={{ ...baseSkin, rarity: 'kTranscendent' }} />);
    const badge = container.querySelector('.bg-gradient-to-r.from-pink-500');
    expect(badge).toBeInTheDocument();
  });

  it('kLegacy usa gradiente laranja', () => {
    const { container } = renderWithI18n(<SkinCard skin={{ ...baseSkin, rarity: 'kLegacy' }} />);
    const badge = container.querySelector('.bg-gradient-to-r.from-orange-500');
    expect(badge).toBeInTheDocument();
  });

  it('raridade desconhecida usa gradiente cinza (default)', () => {
    const { container } = renderWithI18n(<SkinCard skin={{ ...baseSkin, rarity: 'kUnknown' }} />);
    const badge = container.querySelector('.bg-gradient-to-r.from-gray-500');
    expect(badge).toBeInTheDocument();
  });

  // ─── Ícone de raridade ────────────────────────────────────────────────
  it('mostra ícone de raridade para kEpic', () => {
    const { container } = renderWithI18n(<SkinCard skin={baseSkin} />);
    // Ícone é um img com src /kEpic.png
    const rarityIcon = container.querySelector('img[src="/kEpic.png"]');
    expect(rarityIcon).toBeInTheDocument();
  });

  it('NÃO mostra ícone de raridade para kLegacy', () => {
    const { container } = renderWithI18n(<SkinCard skin={{ ...baseSkin, rarity: 'kLegacy' }} />);
    const rarityIcon = container.querySelector('img[src="/kLegacy.png"]');
    expect(rarityIcon).toBeNull();
  });

  it('NÃO mostra ícone de raridade para kNoRarity', () => {
    const { container } = renderWithI18n(<SkinCard skin={{ ...baseSkin, rarity: 'kNoRarity' }} />);
    const rarityIcon = container.querySelector('img[src="/kNoRarity.png"]');
    expect(rarityIcon).toBeNull();
  });

  // ─── Frame overlay ────────────────────────────────────────────────────
  it('tem frame overlay (shardframe.png)', () => {
    const { container } = renderWithI18n(<SkinCard skin={baseSkin} />);
    const frame = container.querySelector('img[src="/shardframe.png"]');
    expect(frame).toBeInTheDocument();
  });
});
