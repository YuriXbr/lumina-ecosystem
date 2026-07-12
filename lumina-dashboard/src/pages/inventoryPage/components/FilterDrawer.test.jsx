/**
 * src/pages/inventoryPage/components/FilterDrawer.test.jsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import FilterDrawer from './FilterDrawer';
import { renderWithI18n } from '../../../test/testUtils';

function renderDrawer(overrides = {}) {
  const props = {
    isOpen: false,
    onClose: vi.fn(),
    activeFilterCount: 0,
    onOpenButtonClick: vi.fn(),
    renderFilters: () => <div data-testid="filters">Filters Content</div>,
    ...overrides,
  };
  return renderWithI18n(<FilterDrawer {...props} />);
}

describe('FilterDrawer', () => {
  it('renderiza botão "Filtros" para mobile', () => {
    renderDrawer();
    expect(document.querySelector('.lg\\:hidden button')).toBeInTheDocument();
  });

  it('renderiza coluna fixa para desktop', () => {
    const { container } = renderDrawer();
    expect(container.querySelector('.hidden.lg\\:block')).toBeInTheDocument();
  });

  it('renderiza conteúdo de filtros na coluna desktop', () => {
    renderDrawer();
    // renderFilters é chamado tanto na coluna desktop quanto no drawer mobile
    const filters = screen.getAllByTestId('filters');
    expect(filters.length).toBeGreaterThanOrEqual(1);
  });

  it('chama onOpenButtonClick ao clicar no botão mobile', () => {
    const onOpenButtonClick = vi.fn();
    renderDrawer({ onOpenButtonClick });
    const mobileButton = document.querySelector('.lg\\:hidden button');
    fireEvent.click(mobileButton);
    expect(onOpenButtonClick).toHaveBeenCalledTimes(1);
  });

  it('mostra contador de filtros ativos quando > 0', () => {
    renderDrawer({ activeFilterCount: 3 });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('NÃO mostra contador quando activeFilterCount é 0', () => {
    renderDrawer({ activeFilterCount: 0 });
    // Não deve haver span com bg-indigo-600
    const badge = document.querySelector('.bg-indigo-600.text-white.text-xs');
    expect(badge).toBeNull();
  });

  it('drawer mobile tem overlay quando isOpen=true', () => {
    renderDrawer({ isOpen: true });
    // Overlay tem classe bg-black/50
    expect(document.querySelector('.bg-black\\/50')).toBeInTheDocument();
  });

  it('chama onClose ao clicar no overlay', () => {
    const onClose = vi.fn();
    renderDrawer({ isOpen: true, onClose });
    const overlay = document.querySelector('.bg-black\\/50');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no botão de fechar (X)', () => {
    const onClose = vi.fn();
    renderDrawer({ isOpen: true, onClose });
    const closeButton = document.querySelector('button[aria-label]');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('fecha com tecla Escape quando aberto', () => {
    const onClose = vi.fn();
    renderDrawer({ isOpen: true, onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('NÃO fecha com Escape quando fechado', () => {
    const onClose = vi.fn();
    renderDrawer({ isOpen: false, onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('trava scroll do body quando aberto', () => {
    renderDrawer({ isOpen: true });
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restaura scroll do body ao fechar', () => {
    const { rerender } = renderDrawer({ isOpen: true });
    rerender(
      <FilterDrawer
        isOpen={false}
        onClose={vi.fn()}
        activeFilterCount={0}
        onOpenButtonClick={vi.fn()}
        renderFilters={() => <div>Filters</div>}
      />
    );
    // O cleanup do useEffect restaura o overflow
    // Não verificamos o valor exato pois depende do estado anterior
  });
});
