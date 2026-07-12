/**
 * src/pages/adminPage/AdminPage.test.jsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AdminPage from './AdminPage';
import { renderWithProviders, makeAdminUser, makeUser } from '../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
});

describe('AdminPage', () => {
  it('renderiza sem crashar para admin', () => {
    renderWithProviders(<AdminPage />, { user: makeAdminUser() });
  });

  it('renderiza tabs admin', () => {
    renderWithProviders(<AdminPage />, { user: makeAdminUser() });
    expect(document.querySelector('button, [role="tab"]')).not.toBeNull();
  });

  it('renderiza para headadmin', () => {
    expect(() => renderWithProviders(<AdminPage />, { user: makeUser({ accessType: 'headadmin' }) })).not.toThrow();
  });

  it('renderiza para owner', () => {
    expect(() => renderWithProviders(<AdminPage />, { user: makeUser({ accessType: 'owner' }) })).not.toThrow();
  });
});
