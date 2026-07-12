import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DashboardTabs from './DashboardTabs';
import { renderWithProviders, makeUser, makeAdminUser } from '../../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => { mockFetch.mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('DashboardTabs', () => {
  it('renderiza sem crashar', () => { renderWithProviders(<DashboardTabs />, { user: makeUser() }); });
  it('renderiza tabs', () => { const { container } = renderWithProviders(<DashboardTabs />, { user: makeUser() }); expect(container.querySelectorAll('button, [role="tab"]').length).toBeGreaterThan(0); });
  it('renderiza para admin', () => { expect(() => renderWithProviders(<DashboardTabs />, { user: makeAdminUser() })).not.toThrow(); });
});
