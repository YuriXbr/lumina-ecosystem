/**
 * src/components/ui/ErrorState.test.jsx
 *
 * Testes para src/components/ui/ErrorState.jsx
 *
 * Cobre:
 *   - Renderiza título, mensagem, detail
 *   - Modo compact vs default
 *   - Botão de retry aparece apenas quando onRetry é fornecido
 *   - retryLabel customizado
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ErrorState from './ErrorState';
import { renderWithI18n } from '../../test/testUtils';

describe('ErrorState', () => {
  it('renderiza título', () => {
    renderWithI18n(<ErrorState title="Erro ao carregar" />);
    expect(screen.getByText('Erro ao carregar')).toBeInTheDocument();
  });

  it('renderiza mensagem quando fornecida', () => {
    renderWithI18n(<ErrorState title="Erro" message="Tente novamente mais tarde" />);
    expect(screen.getByText('Tente novamente mais tarde')).toBeInTheDocument();
  });

  it('renderiza detail quando fornecido', () => {
    renderWithI18n(<ErrorState title="Erro" detail="HTTP 500: Internal Server Error" />);
    expect(screen.getByText('HTTP 500: Internal Server Error')).toBeInTheDocument();
  });

  it('NÃO renderiza mensagem quando não fornecida', () => {
    renderWithI18n(<ErrorState title="Apenas título" />);
    const container = screen.getByText('Apenas título').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('NÃO renderiza botão de retry quando onRetry não é fornecido', () => {
    renderWithI18n(<ErrorState title="Erro" retryLabel="Tentar novamente" />);
    expect(screen.queryByText('Tentar novamente')).not.toBeInTheDocument();
  });

  it('renderiza botão de retry quando onRetry é fornecido', () => {
    renderWithI18n(<ErrorState title="Erro" onRetry={() => {}} retryLabel="Tentar novamente" />);
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('chama onRetry quando botão é clicado', () => {
    const onRetry = vi.fn();
    renderWithI18n(<ErrorState title="Erro" onRetry={onRetry} retryLabel="Retry" />);

    fireEvent.click(screen.getByText('Retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // ─── Modo compact ─────────────────────────────────────────────────────
  it('modo compact renderiza com classes diferentes (menor padding)', () => {
    const { container } = renderWithI18n(
      <ErrorState title="Erro compact" compact />
    );
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
    expect(screen.getByText('Erro compact')).toBeInTheDocument();
  });

  it('modo compact também mostra botão de retry', () => {
    renderWithI18n(
      <ErrorState title="Erro" compact onRetry={() => {}} retryLabel="Retry" />
    );
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('modo default NÃO usa bg-red-50 no container externo', () => {
    const { container } = renderWithI18n(
      <ErrorState title="Erro default" />
    );
    expect(container.querySelector('.bg-white')).toBeInTheDocument();
  });

  // ─── Props ausentes ───────────────────────────────────────────────────
  it('renderiza sem nenhuma prop opcional', () => {
    renderWithI18n(<ErrorState title="Apenas título" />);
    expect(screen.getByText('Apenas título')).toBeInTheDocument();
  });

  it('retryLabel default é string vazia quando não fornecido', () => {
    renderWithI18n(<ErrorState title="Erro" onRetry={() => {}} />);
    expect(screen.getByText('Erro')).toBeInTheDocument();
  });
});
