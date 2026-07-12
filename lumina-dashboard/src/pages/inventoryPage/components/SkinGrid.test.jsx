/**
 * src/pages/inventoryPage/components/SkinGrid.test.jsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SkinGrid from './SkinGrid';
import { renderWithI18n, makeSkin } from '../../../test/testUtils';

describe('SkinGrid', () => {
  it('renderiza grid vazio sem crashar', () => {
    const { container } = renderWithI18n(<SkinGrid filteredSkins={[]} />);
    expect(container.querySelector('.grid')).toBeInTheDocument();
  });

  it('renderiza SkinCard para cada skin', () => {
    const skins = [makeSkin({ id: 1, name: 'A' }), makeSkin({ id: 2, name: 'B' }), makeSkin({ id: 3, name: 'C' })];
    renderWithI18n(<SkinGrid filteredSkins={skins} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('tem classes de grid responsivo', () => {
    const { container } = renderWithI18n(<SkinGrid filteredSkins={[]} />);
    const grid = container.querySelector('.grid');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).toContain('lg:grid-cols-4');
  });
});
