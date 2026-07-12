import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ServerSettingsPage from './ServerSettingsPage';
import { renderWithProviders, makeUser } from '../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => { mockFetch.mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('ServerSettingsPage', () => {
  it('renderiza sem crashar', () => { renderWithProviders(<ServerSettingsPage />, { user: makeUser(), route: '/server/123' }); });
  it('renderiza para usuário logado', () => { expect(() => renderWithProviders(<ServerSettingsPage />, { user: makeUser(), route: '/server/123' })).not.toThrow(); });
});
