/**
 * src/pages/aboutPage/AboutPage.test.jsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AboutPage from './AboutPage';
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
    const badges = container.querySelectorAll('.bg-indigo-600.text-white');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renderiza footer com copyright', () => {
    renderWithProviders(<AboutPage />);
    expect(screen.getByText(/2024 LUMINA BOT/i)).toBeInTheDocument();
  });

  it('renderiza links sociais no footer (GitHub, Twitter, LinkedIn)', () => {
    renderWithProviders(<AboutPage />);
    const footer = document.querySelector('footer');
    const socialLinks = footer.querySelectorAll('a[target="_blank"]');
    expect(socialLinks.length).toBeGreaterThanOrEqual(3);
  });

  it('renderiza ícones de skills', () => {
    const { container } = renderWithProviders(<AboutPage />);
    // Skills são renderizadas como <span> com SVG icons (react-icons)
    const skillSpans = container.querySelectorAll('.flex.space-x-4 span');
    expect(skillSpans.length).toBeGreaterThan(0);
  });
});
