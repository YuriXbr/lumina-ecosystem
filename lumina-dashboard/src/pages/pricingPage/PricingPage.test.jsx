import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import React from 'react';
import PricingPage from './PricingPage';
import { renderWithProviders, makeUser } from '../../test/testUtils';
describe('PricingPage', () => {
  it('oferece convite oficial do plano gratuito sem callback de login', () => {
    renderWithProviders(<PricingPage />, {user:makeUser()});
    const url = new URL(screen.getByRole('link', {name:'Começar'}).href);
    expect(url.origin).toBe('https://discord.com');
    expect(url.searchParams.get('scope')).toBe('bot applications.commands');
    expect(url.searchParams.has('redirect_uri')).toBe(false);
  });
  it('identifica os planos pagos como indisponíveis para contratação', () => {
    renderWithProviders(<PricingPage />, {user:makeUser()});
    expect(screen.getByRole('button', {name:'VIP: contratação indisponível'})).toBeDisabled();
    expect(screen.getByRole('button', {name:'Enterprise: contratação indisponível'})).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Apenas o plano gratuito está disponível');
  });
  it('não anuncia preço pago nem usa links sem destino', () => {
    renderWithProviders(<PricingPage />, {user:makeUser()});
    expect(screen.queryByText(/29,99|68,99/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === '#')).toBe(false);
  });
  it('distingue ideias de recursos disponíveis', () => {
    renderWithProviders(<PricingPage />, {user:makeUser()});
    expect(screen.getAllByText('Recursos em estudo, ainda não incluídos em um plano disponível.')).toHaveLength(2);
  });
  it('explica o funcionamento atual sem prometer descontos ou cobrança', () => {
    renderWithProviders(<PricingPage />, {user:makeUser()});
    expect(screen.getByText('Ainda não. Os planos pagos e seus recursos estão em estudo. Não há checkout nem cobrança pelo site.')).toBeInTheDocument();
    expect(screen.queryByText(/desconto de 20%/i)).not.toBeInTheDocument();
  });
});
