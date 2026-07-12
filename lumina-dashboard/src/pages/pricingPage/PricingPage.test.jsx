/**
 * src/pages/pricingPage/PricingPage.test.jsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PricingPage from './PricingPage';
import { renderWithProviders } from '../../test/testUtils';

describe('PricingPage', () => {
  it('renderiza sem crashar', () => {
    renderWithProviders(<PricingPage />);
  });

  it('renderiza 3 tiers de preço', () => {
    renderWithProviders(<PricingPage />);
    // 3 preços: R$ 0, R$ 29,99, R$ 68,99
    expect(screen.getAllByText(/R\$/i).length).toBeGreaterThanOrEqual(3);
  });

  it('renderiza seção FAQ', () => {
    renderWithProviders(<PricingPage />);
    // FAQ tem pelo menos uma pergunta
    const faqItems = document.querySelectorAll('.bg-gray-50.rounded-lg.p-6');
    expect(faqItems.length).toBeGreaterThan(0);
  });

  it('tier gratuito tem link para Discord OAuth', () => {
    renderWithProviders(<PricingPage />);
    const links = screen.getAllByRole('link');
    const discordLink = links.find(a => a.getAttribute('href')?.match(/discord\.com\/oauth2\/authorize/));
    expect(discordLink).toBeDefined();
  });

  it('tier popular tem badge "Popular"', () => {
    const { container } = renderWithProviders(<PricingPage />);
    // Badge popular usa bg-purple-600
    const popularBadge = container.querySelector('.bg-purple-600.text-white.text-xs');
    expect(popularBadge).toBeInTheDocument();
  });

  it('tier featured tem ring-2 ring-purple-600', () => {
    const { container } = renderWithProviders(<PricingPage />);
    const featured = container.querySelector('.ring-2.ring-purple-600');
    expect(featured).toBeInTheDocument();
  });

  it('renderiza features com ícone de check', () => {
    const { container } = renderWithProviders(<PricingPage />);
    // CheckIcon é svg com classe text-purple-600
    const checks = container.querySelectorAll('.text-purple-600');
    expect(checks.length).toBeGreaterThan(0);
  });

  it('mostra "/mês" após o preço', () => {
    renderWithProviders(<PricingPage />);
    expect(screen.getAllByText(/mês/i).length).toBeGreaterThanOrEqual(3);
  });
});
