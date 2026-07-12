/**
 * src/components/AppShell.test.jsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AppShell from './AppShell';
import { renderWithProviders } from '../test/testUtils';

describe('AppShell', () => {
  it('renderiza Header', () => {
    renderWithProviders(<AppShell><div>Content</div></AppShell>);
    expect(document.querySelector('header')).toBeInTheDocument();
  });

  it('renderiza children', () => {
    renderWithProviders(<AppShell><div data-testid="content">Content</div></AppShell>);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('NÃO renderiza subheader quando não há title e rota não é admin/settings/server', () => {
    renderWithProviders(<AppShell><div>Content</div></AppShell>, { route: '/members' });
    // Subheader tem classe bg-white border-b
    const subheaders = document.querySelectorAll('.bg-white.border-b.border-gray-200');
    // Pode haver 1 do Header, mas o subheader adicional não deve aparecer
    expect(subheaders.length).toBeLessThanOrEqual(1);
  });

  it('renderiza subheader com title', () => {
    renderWithProviders(<AppShell title="Test Title"><div>Content</div></AppShell>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renderiza subtitle quando fornecido', () => {
    renderWithProviders(<AppShell title="Title" subtitle="Subtitle"><div>Content</div></AppShell>);
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });

  it('renderiza botão voltar quando backTo é fornecido', () => {
    renderWithProviders(<AppShell title="Title" backTo="/home"><div>Content</div></AppShell>);
    const backLinks = screen.getAllByRole('link');
    const backLink = backLinks.find(a => a.getAttribute('href') === '/home');
    expect(backLink).toBeDefined();
  });

  it('renderiza subheader em rota /admin', () => {
    renderWithProviders(<AppShell><div>Content</div></AppShell>, { route: '/admin' });
    // Subheader deve aparecer
    expect(document.querySelectorAll('.bg-white.border-b.border-gray-200').length).toBeGreaterThan(1);
  });

  it('renderiza subheader em rota /settings', () => {
    renderWithProviders(<AppShell><div>Content</div></AppShell>, { route: '/settings' });
    expect(document.querySelectorAll('.bg-white.border-b.border-gray-200').length).toBeGreaterThan(1);
  });

  it('renderiza subheader em rota /server/:id', () => {
    renderWithProviders(<AppShell><div>Content</div></AppShell>, { route: '/server/123' });
    expect(document.querySelectorAll('.bg-white.border-b.border-gray-200').length).toBeGreaterThan(1);
  });

  it('aceita maxWidth customizado', () => {
    const { container } = renderWithProviders(<AppShell maxWidth="max-w-4xl"><div>Content</div></AppShell>);
    expect(container.querySelector('.max-w-4xl')).toBeInTheDocument();
  });
});
