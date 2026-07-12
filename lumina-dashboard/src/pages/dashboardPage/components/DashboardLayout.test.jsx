import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DashboardLayout from './DashboardLayout';
import { renderWithProviders, makeUser } from '../../../test/testUtils';

describe('DashboardLayout', () => {
  it('renderiza sem crashar', () => { renderWithProviders(<DashboardLayout><div>Content</div></DashboardLayout>, { user: makeUser() }); });
  it('renderiza children', () => { renderWithProviders(<DashboardLayout><div data-testid="child">Content</div></DashboardLayout>, { user: makeUser() }); expect(screen.getByTestId('child')).toBeInTheDocument(); });
  it('renderiza menu de navegação', () => { const { container } = renderWithProviders(<DashboardLayout><div>C</div></DashboardLayout>, { user: makeUser() }); expect(container.querySelectorAll('a, button').length).toBeGreaterThan(0); });
});
