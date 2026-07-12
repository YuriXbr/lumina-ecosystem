import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import HomeNavBar from './HomeNavBar';
import { renderWithProviders, makeUser } from '../../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
});

describe('HomeNavBar', () => {
  it('renderiza sem crashar', () => {
    renderWithProviders(<HomeNavBar />);
  });

  it('renderiza logo', () => {
    renderWithProviders(<HomeNavBar />);
    expect(document.querySelector('img')).toBeInTheDocument();
  });

  it('renderiza links de navegação', () => {
    renderWithProviders(<HomeNavBar />);
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
  });

  it('renderiza sem user logado', () => {
    renderWithProviders(<HomeNavBar />, { user: null });
    expect(document.querySelector('header, nav')).not.toBeNull();
  });
});
