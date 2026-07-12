import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DashboardBentoGrid from './DashboardBentoGrid';
import { renderWithI18n } from '../../../test/testUtils';

describe('DashboardBentoGrid', () => {
  it('renderiza sem crashar', () => { renderWithI18n(<DashboardBentoGrid />); });
  it('renderiza conteúdo', () => { const { container } = renderWithI18n(<DashboardBentoGrid />); expect(container.querySelector('div')).not.toBeNull(); });
});
