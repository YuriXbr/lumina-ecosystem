/**
 * src/components/ui/Skeleton.test.jsx
 *
 * Testes para src/components/ui/Skeleton.jsx
 *
 * Cobre:
 *   - SkeletonBox: renderiza com className customizado
 *   - SkeletonLine: width, height, className
 *   - SkeletonCard: estrutura interna
 *   - SkeletonRow: número de colunas
 *   - SkeletonTable: número de linhas e colunas
 *   - SkeletonChart: altura customizada
 *   - Default export é SkeletonBox
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  SkeletonBox,
  SkeletonLine,
  SkeletonCard,
  SkeletonRow,
  SkeletonTable,
  SkeletonChart,
} from './Skeleton';
import SkeletonBoxDefault from './Skeleton';

describe('SkeletonBox', () => {
  it('renderiza um div', () => {
    const { container } = render(<SkeletonBox />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('aceita className customizado', () => {
    const { container } = render(<SkeletonBox className="h-4 w-full" />);
    const div = container.querySelector('div');
    expect(div.className).toContain('h-4');
    expect(div.className).toContain('w-full');
  });

  it('tem animação animate-pulse', () => {
    const { container } = render(<SkeletonBox />);
    expect(container.querySelector('div').className).toContain('animate-pulse');
  });
});

describe('SkeletonLine', () => {
  it('renderiza com width e height default', () => {
    const { container } = render(<SkeletonLine />);
    const div = container.querySelector('div');
    expect(div.style.width).toBe('100%');
    expect(div.style.height).toBe('1rem');
  });

  it('aceita width customizado', () => {
    const { container } = render(<SkeletonLine width="50%" />);
    expect(container.querySelector('div').style.width).toBe('50%');
  });

  it('aceita height customizado', () => {
    const { container } = render(<SkeletonLine height="2rem" />);
    expect(container.querySelector('div').style.height).toBe('2rem');
  });

  it('aceita width numérico (px implícito)', () => {
    const { container } = render(<SkeletonLine width={200} />);
    expect(container.querySelector('div').style.width).toBe('200px');
  });

  it('aceita className customizado', () => {
    const { container } = render(<SkeletonLine className="my-2" />);
    expect(container.querySelector('div').className).toContain('my-2');
  });
});

describe('SkeletonCard', () => {
  it('renderiza sem crashar', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.querySelector('.bg-white')).toBeInTheDocument();
  });

  it('tem estrutura interna com elementos animate-pulse', () => {
    const { container } = render(<SkeletonCard />);
    const pulses = container.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });
});

describe('SkeletonRow', () => {
  it('renderiza <tr> com número default de colunas (5)', () => {
    const { container } = render(<table><tbody><SkeletonRow /></tbody></table>);
    const cells = container.querySelectorAll('td');
    expect(cells).toHaveLength(5);
  });

  it('aceita columns customizado', () => {
    const { container } = render(<table><tbody><SkeletonRow columns={3} /></tbody></table>);
    expect(container.querySelectorAll('td')).toHaveLength(3);
  });

  it('aceita columns=1', () => {
    const { container } = render(<table><tbody><SkeletonRow columns={1} /></tbody></table>);
    expect(container.querySelectorAll('td')).toHaveLength(1);
  });
});

describe('SkeletonTable', () => {
  it('renderiza <tbody> com número default de linhas (6) e colunas (5)', () => {
    const { container } = render(<table><SkeletonTable /></table>);
    const rows = container.querySelectorAll('tr');
    expect(rows).toHaveLength(6);
    const cells = container.querySelectorAll('td');
    expect(cells).toHaveLength(30); // 6 * 5
  });

  it('aceita rows e columns customizados', () => {
    const { container } = render(<table><SkeletonTable rows={3} columns={4} /></table>);
    expect(container.querySelectorAll('tr')).toHaveLength(3);
    expect(container.querySelectorAll('td')).toHaveLength(12);
  });
});

describe('SkeletonChart', () => {
  it('renderiza com altura default (220)', () => {
    const { container } = render(<SkeletonChart />);
    const wrapper = container.firstChild;
    expect(wrapper.style.minHeight).toBe('220px');
  });

  it('aceita altura customizada', () => {
    const { container } = render(<SkeletonChart height={400} />);
    expect(container.firstChild.style.minHeight).toBe('400px');
  });

  it('tem 8 barras (placeholders do gráfico)', () => {
    const { container } = render(<SkeletonChart />);
    // 8 divs com classe bg-gray-200 rounded-t
    const bars = container.querySelectorAll('.bg-gray-200.rounded-t');
    expect(bars.length).toBe(8);
  });
});

describe('Default export', () => {
  it('default export é SkeletonBox', () => {
    expect(SkeletonBoxDefault).toBe(SkeletonBox);
  });
});
