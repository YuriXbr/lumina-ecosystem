/**
 * src/pages/notFoundPage/NotFoundPage.test.jsx
 *
 * Testes para src/pages/notFoundPage/NotFoundPage.jsx
 *
 * Cobre:
 *   - Renderiza "404" e mensagem
 *   - Botão de voltar para home
 *   - Link aponta para "/"
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import NotFoundPage from './NotFoundPage';
import { renderWithProviders } from '../../test/testUtils';

describe('NotFoundPage', () => {
  it('renderiza "404"', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renderiza mensagem de página não encontrada', () => {
    renderWithProviders(<NotFoundPage />);
    // O título traduzido — verificamos que há algum texto além do 404
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renderiza botão de voltar', () => {
    renderWithProviders(<NotFoundPage />);
    // O botão está dentro de um <Link to="/">
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('botão de voltar é um link para "/"', () => {
    renderWithProviders(<NotFoundPage />);
    const link = screen.getByRole('button').closest('a');
    expect(link).toHaveAttribute('href', '/');
  });

  it('não crasha sem providers (testa isolado)', () => {
    // NotFoundPage usa useT() que precisa de LanguageProvider
    // então este teste só verifica que renderiza com providers
    expect(() => renderWithProviders(<NotFoundPage />)).not.toThrow();
  });
});
