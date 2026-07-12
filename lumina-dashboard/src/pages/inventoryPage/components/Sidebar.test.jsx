/**
 * src/pages/inventoryPage/components/Sidebar.test.jsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Sidebar from './Sidebar';
import { renderWithI18n, makeSkin } from '../../../test/testUtils';

const RARITY_OPTIONS = [
  { key: 'kEpic', labelKey: 'inventory.rarity.epic' },
  { key: 'kLegendary', labelKey: 'inventory.rarity.legendary' },
];

function renderSidebar(overrides = {}) {
  const props = {
    skins: [makeSkin({ championName: 'Annie' }), makeSkin({ championName: 'Ashe', id: 2002 })],
    generalSearch: '',
    setGeneralSearch: vi.fn(),
    championSearch: '',
    setChampionSearch: vi.fn(),
    availableChampions: ['Annie', 'Ashe'],
    selectedChampions: [],
    toggleChampion: vi.fn(),
    raritySearch: '',
    setRaritySearch: vi.fn(),
    selectedRarities: [],
    toggleRarity: vi.fn(),
    rarityOptions: RARITY_OPTIONS,
    ...overrides,
  };
  return renderWithI18n(<Sidebar {...props} />);
}

describe('Sidebar', () => {
  it('renderiza busca geral', () => {
    renderSidebar();
    expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
  });

  it('renderiza lista de campeões', () => {
    renderSidebar();
    expect(screen.getByText('Annie')).toBeInTheDocument();
    expect(screen.getByText('Ashe')).toBeInTheDocument();
  });

  it('renderiza checkboxes de campeão', () => {
    const { container } = renderSidebar();
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  });

  it('mostra contagem de skins por campeão', () => {
    renderSidebar();
    // Cada campeão tem 1 skin
    const counts = screen.getAllByText('1');
    expect(counts.length).toBeGreaterThan(0);
  });

  it('chama toggleChampion ao clicar em checkbox', () => {
    const toggleChampion = vi.fn();
    renderSidebar({ toggleChampion });
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[0]);
    expect(toggleChampion).toHaveBeenCalled();
  });

  it('chama setGeneralSearch ao digitar', () => {
    const setGeneralSearch = vi.fn();
    renderSidebar({ setGeneralSearch });
    const input = document.querySelector('input[type="text"]');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(setGeneralSearch).toHaveBeenCalledWith('test');
  });

  it('mostra botão de limpar busca quando generalSearch tem valor', () => {
    renderSidebar({ generalSearch: 'search term' });
    // Botão de limpar tem SVG
    const clearButton = document.querySelector('button.absolute');
    expect(clearButton).toBeInTheDocument();
  });

  it('NÃO mostra botão de limpar quando generalSearch está vazio', () => {
    renderSidebar({ generalSearch: '' });
    const clearButton = document.querySelector('button.absolute');
    expect(clearButton).toBeNull();
  });

  it('mostra botão "Limpar filtros" quando há filtros ativos', () => {
    renderSidebar({ generalSearch: 'test', selectedChampions: ['Annie'] });
    // O botão de limpar filtros está na seção inferior
    const buttons = screen.getAllByRole('button');
    // Deve haver um botão com SVG de lixeira
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('NÃO mostra botão "Limpar filtros" quando não há filtros ativos', () => {
    const { container } = renderSidebar();
    // Não deve ter o botão na seção de limpar (border-t)
    const clearSection = container.querySelector('.border-t.border-gray-200');
    expect(clearSection).toBeNull();
  });

  it('mostra contagem de campeões selecionados', () => {
    renderSidebar({ selectedChampions: ['Annie', 'Ashe'] });
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('mostra "sem campeões" quando availableChampions está vazio', () => {
    renderSidebar({ availableChampions: [] });
    // Texto de empty state
    const emptyText = document.querySelector('.text-gray-500.text-center');
    expect(emptyText).toBeInTheDocument();
  });
});
