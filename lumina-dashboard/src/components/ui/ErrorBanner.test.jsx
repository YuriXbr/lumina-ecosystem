/**
 * src/components/ui/ErrorBanner.test.jsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ErrorBanner from './ErrorBanner';

describe('ErrorBanner', () => {
  it('retorna null quando error é falsy', () => {
    const { container } = render(<ErrorBanner error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('retorna null quando error é string vazia', () => {
    const { container } = render(<ErrorBanner error="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza mensagem de erro', () => {
    render(<ErrorBanner error="Algo deu errado" />);
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });

  it('usa estilo vermelho (error) por padrão', () => {
    const { container } = render(<ErrorBanner error="Erro" />);
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
  });

  it('usa estilo amarelo (warning) quando variant=warning', () => {
    const { container } = render(<ErrorBanner error="Aviso" variant="warning" />);
    expect(container.querySelector('.bg-yellow-50')).toBeInTheDocument();
  });

  it('NÃO mostra botão de retry quando onRetry não é fornecido', () => {
    render(<ErrorBanner error="Erro" />);
    expect(screen.queryByText(/Tentar novamente/i)).not.toBeInTheDocument();
  });

  it('mostra botão de retry quando onRetry é fornecido', () => {
    render(<ErrorBanner error="Erro" onRetry={() => {}} />);
    expect(screen.getByText(/Tentar novamente/i)).toBeInTheDocument();
  });

  it('chama onRetry ao clicar no botão', () => {
    const onRetry = vi.fn();
    render(<ErrorBanner error="Erro" onRetry={onRetry} />);
    fireEvent.click(screen.getByText(/Tentar novamente/i));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('mostra ícone de aviso', () => {
    const { container } = render(<ErrorBanner error="Erro" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
