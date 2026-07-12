import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import LogsTab from './LogsTab';
import { renderWithProviders, makeAdminUser } from '../../../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => { mockFetch.mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('LogsTab', () => {
  it('renderiza sem crashar', () => { renderWithProviders(<LogsTab />, { user: makeAdminUser() }); });
  it('renderiza conteúdo', () => { const { container } = renderWithProviders(<LogsTab />, { user: makeAdminUser() }); expect(container.querySelector('div')).not.toBeNull(); });
});
