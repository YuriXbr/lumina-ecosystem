/**
 * src/pages/aboutPage/AboutPage.test.jsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AboutPage from './AboutPage';
import SiteFooter from '../../components/SiteFooter';
import { renderWithProviders } from '../../test/testUtils';

describe('AboutPage', () => {
  it('renderiza sem crashar', () => {
    renderWithProviders(<AboutPage />);
  });

  it('renderiza foto do desenvolvedor', () => {
    renderWithProviders(<AboutPage />);
    const photo = document.querySelector('img[src*="undraw_male_avatar"]');
    expect(photo).toBeInTheDocument();
  });

  it('renderiza link GitHub do desenvolvedor', () => {
    renderWithProviders(<AboutPage />);
    const links = screen.getAllByRole('link');
    const githubLinks = links.filter(a => a.getAttribute('href')?.includes('github.com'));
    expect(githubLinks.length).toBeGreaterThan(0);
  });

  it('renderiza badges de role', () => {
    const { container } = renderWithProviders(<AboutPage />);
    // Badges usam classe bg-indigo-600
    const badges = container.querySelectorAll('.bg-purple-600.text-white');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('usa somente o footer global com políticas', () => {
    renderWithProviders(<><AboutPage /><SiteFooter /></>);
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '/privacy');
    expect(screen.queryByText(/2024 LUMINA BOT/i)).not.toBeInTheDocument();
  });

  it('oferece link nomeado para o repositório real', () => {
    renderWithProviders(<AboutPage />);
    expect(screen.getByRole('link', { name: 'Código do Lumina no GitHub' })).toHaveAttribute('href', 'https://github.com/YuriXbr/lumina-ecosystem');
  });

  it('renderiza ícones de skills', () => {
    const { container } = renderWithProviders(<AboutPage />);
    // Skills são renderizadas como <span> com SVG icons (react-icons)
    const skillSpans = container.querySelectorAll('[aria-hidden="true"] svg');
    expect(skillSpans.length).toBeGreaterThan(0);
  });
});
