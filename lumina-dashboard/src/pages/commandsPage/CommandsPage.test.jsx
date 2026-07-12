/**
 * src/pages/commandsPage/CommandsPage.test.jsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import CommandsPage from './CommandsPage';
import { renderWithProviders } from '../../test/testUtils';

describe('CommandsPage', () => {
  it('renderiza sem crashar', () => {
    renderWithProviders(<CommandsPage />);
  });

  it('renderiza 5 categorias de comandos', () => {
    const { container } = renderWithProviders(<CommandsPage />);
    // Cada categoria tem um header com gradiente bg-gradient-to-r
    const categoryHeaders = container.querySelectorAll('.bg-gradient-to-r.px-8');
    expect(categoryHeaders.length).toBe(5);
  });

  it('renderiza ícones das categorias (emoji)', () => {
    renderWithProviders(<CommandsPage />);
    expect(screen.getByText('🎮')).toBeInTheDocument();
    expect(screen.getByText('🛡️')).toBeInTheDocument();
    expect(screen.getByText('💎')).toBeInTheDocument();
    expect(screen.getByText('⚙️')).toBeInTheDocument();
    expect(screen.getByText('🔧')).toBeInTheDocument();
  });

  it('renderiza comandos com nome /command', () => {
    renderWithProviders(<CommandsPage />);
    expect(screen.getByText('leagueprofile')).toBeInTheDocument();
    expect(screen.getByText('ban')).toBeInTheDocument();
    expect(screen.getByText('ping')).toBeInTheDocument();
  });

  it('renderiza link para adicionar bot', () => {
    renderWithProviders(<CommandsPage />);
    const links = screen.getAllByRole('link');
    const discordLink = links.find(a => a.getAttribute('href')?.match(/discord\.com\/oauth2\/authorize/));
    expect(discordLink).toBeDefined();
  });

  it('renderiza link para /members', () => {
    renderWithProviders(<CommandsPage />);
    const links = screen.getAllByRole('link');
    const membersLink = links.find(a => a.getAttribute('href') === '/members');
    expect(membersLink).toBeDefined();
  });

  it('renderiza seção de exemplo com código', () => {
    const { container } = renderWithProviders(<CommandsPage />);
    // Exemplos têm classe bg-white/70
    const examples = container.querySelectorAll('code');
    expect(examples.length).toBeGreaterThan(0);
  });

  it('renderiza pelo menos 20 comandos no total', () => {
    const { container } = renderWithProviders(<CommandsPage />);
    // Cada comando tem um h3 com font-mono
    const commandNames = container.querySelectorAll('h3.font-mono');
    expect(commandNames.length).toBeGreaterThanOrEqual(20);
  });
});
