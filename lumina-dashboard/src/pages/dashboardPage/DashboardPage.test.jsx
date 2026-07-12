import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DashboardPage from './DashboardPage';
import { renderWithProviders, makeUser } from '../../test/testUtils';

describe('DashboardPage', () => {
  it('renderiza sem crashar', () => { renderWithProviders(<DashboardPage />, { user: makeUser() }); });
  it('renderiza algum conteúdo', () => { const { container } = renderWithProviders(<DashboardPage />, { user: makeUser() }); expect(container.querySelector('div')).not.toBeNull(); });
});
