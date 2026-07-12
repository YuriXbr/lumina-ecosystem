import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import LoginModal from './loginModal';
import { renderWithProviders } from '../../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => { mockFetch.mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('LoginModal', () => {
  it('renderiza sem crashar', () => { renderWithProviders(<LoginModal />); });
  it('renderiza inputs de email e senha', () => { renderWithProviders(<LoginModal />); expect(document.querySelector('input[type="email"]')).toBeInTheDocument(); expect(document.querySelector('input[type="password"]')).toBeInTheDocument(); });
  it('renderiza botão Discord', () => { renderWithProviders(<LoginModal />); const buttons = screen.getAllByRole('button'); expect(buttons.length).toBeGreaterThanOrEqual(2); });
  it('renderiza link para /register', () => { renderWithProviders(<LoginModal />); const links = screen.getAllByRole('link'); expect(links.find(a => a.getAttribute('href') === '/register')).toBeDefined(); });
});
