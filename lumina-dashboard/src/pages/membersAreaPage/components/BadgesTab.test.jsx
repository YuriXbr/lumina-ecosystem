import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import BadgesTab from './BadgesTab';
import { renderWithProviders, makeUser } from '../../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => { mockFetch.mockResolvedValue(new Response(JSON.stringify({ badges: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('BadgesTab', () => {
  it('renderiza sem crashar', () => { renderWithProviders(<BadgesTab />, { user: makeUser() }); });
  it('renderiza conteúdo', () => { const { container } = renderWithProviders(<BadgesTab />, { user: makeUser() }); expect(container.querySelector('div')).not.toBeNull(); });
});
