import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ProfileTab from './ProfileTab';
import { renderWithProviders, makeUser } from '../../../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => { mockFetch.mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('ProfileTab', () => {
  it('renderiza sem crashar', () => { renderWithProviders(<ProfileTab />, { user: makeUser() }); });
  it('renderiza para usuário com Discord', () => { expect(() => renderWithProviders(<ProfileTab />, { user: makeUser({ discordOauth2Id: '123' }) })).not.toThrow(); });
});
