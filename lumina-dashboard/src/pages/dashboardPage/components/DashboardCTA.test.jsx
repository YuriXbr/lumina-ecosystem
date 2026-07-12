import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DashboardCTA from './DashboardCTA';
import { renderWithI18n } from '../../../test/testUtils';

describe('DashboardCTA', () => {
  it('renderiza sem crashar', () => { renderWithI18n(<DashboardCTA />); });
  it('renderiza links', () => { renderWithI18n(<DashboardCTA />); expect(screen.getAllByRole('link').length).toBeGreaterThan(0); });
});
