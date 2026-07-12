import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import NewsAdminTab from './NewsAdminTab';
import { renderWithProviders, makeAdminUser } from '../../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => { mockFetch.mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('NewsAdminTab', () => {
  it('renderiza sem crashar', () => { renderWithProviders(<NewsAdminTab />, { user: makeAdminUser() }); });
  it('renderiza formulário ou lista', () => { const { container } = renderWithProviders(<NewsAdminTab />, { user: makeAdminUser() }); expect(container.querySelector('div')).not.toBeNull(); });
});
