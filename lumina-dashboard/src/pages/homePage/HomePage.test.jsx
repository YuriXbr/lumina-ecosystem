/**
 * src/pages/homePage/HomePage.test.jsx
 *
 * Testes para src/pages/homePage/HomePage.jsx
 *
 * Cobre:
 *   - Renderiza hero section com "Lumina Bot"
 *   - Renderiza stats section
 *   - Renderiza features (4 cards)
 *   - Link "Adicionar bot" aponta para Discord OAuth
 *   - Link "Área de Membros" navega para /members
 *   - Funciona sem auth (público)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import HomePage from './HomePage';
import { renderWithProviders } from '../../test/testUtils';

describe('HomePage', () => {
  it('renderiza sem crashar', () => {
    renderWithProviders(<HomePage />);
  });

  it('mostra "Lumina" em algum lugar da página', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getAllByText(/Lumina/i).length).toBeGreaterThan(0);
  });

  it('tem link para adicionar o bot ao Discord', () => {
    renderWithProviders(<HomePage />);
    // Procura qualquer link que aponte para discord.com/oauth2/authorize
    const links = screen.getAllByRole('link');
    const discordLink = links.find(a => a.getAttribute('href')?.match(/discord\.com\/oauth2\/authorize/));
    expect(discordLink).toBeDefined();
  });

  it('tem link para a Área de Membros (/members)', () => {
    renderWithProviders(<HomePage />);
    const links = screen.getAllByRole('link');
    const membersLink = links.find(a => a.getAttribute('href') === '/members');
    expect(membersLink).toBeDefined();
  });

  it('renderiza stats section (25+, 6, 24/7, Beta)', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText('25+')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('24/7')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renderiza features com ícones (emoji)', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText('🎮')).toBeInTheDocument();
    expect(screen.getByText('🛡️')).toBeInTheDocument();
    expect(screen.getByText('💎')).toBeInTheDocument();
    expect(screen.getByText('🔧')).toBeInTheDocument();
  });

  it('funciona sem usuário logado (público)', () => {
    expect(() => renderWithProviders(<HomePage />, { user: null })).not.toThrow();
  });

  it('funciona com usuário logado', () => {
    expect(() => renderWithProviders(<HomePage />, { user: { email: 'x@x.com', accessType: 'user' } })).not.toThrow();
  });

  it('tem link para GitHub', () => {
    renderWithProviders(<HomePage />);
    const links = screen.getAllByRole('link');
    const githubLink = links.find(a => a.getAttribute('href')?.match(/github\.com/));
    expect(githubLink).toBeDefined();
  });
});
