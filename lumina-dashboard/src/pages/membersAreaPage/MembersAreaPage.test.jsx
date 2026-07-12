/**
 * src/pages/membersAreaPage/MembersAreaPage.test.jsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import MembersAreaPage from './MembersAreaPage';
import { renderWithProviders, makeUser } from '../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
});

describe('MembersAreaPage', () => {
  it('renderiza sem crashar', () => {
    renderWithProviders(<MembersAreaPage />, { user: makeUser() });
  });

  it('renderiza para usuário logado', () => {
    expect(() => renderWithProviders(<MembersAreaPage />, { user: makeUser() })).not.toThrow();
  });

  it('renderiza para usuário sem logar', () => {
    expect(() => renderWithProviders(<MembersAreaPage />, { user: null })).not.toThrow();
  });
});
