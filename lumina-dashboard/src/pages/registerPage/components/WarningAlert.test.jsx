/**
 * src/pages/registerPage/components/WarningAlert.test.jsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import WarningAlert from './WarningAlert';

describe('WarningAlert (register)', () => {
  it('renderiza mensagem fornecida', () => {
    render(<WarningAlert message="Erro de registro" />);
    expect(screen.getByText('Erro de registro')).toBeInTheDocument();
  });

  it('renderiza mensagem diferente', () => {
    render(<WarningAlert message="Email já cadastrado" />);
    expect(screen.getByText('Email já cadastrado')).toBeInTheDocument();
  });

  it('NÃO tem botão de fechar (sem onClose)', () => {
    render(<WarningAlert message="Erro" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('tem ícone SVG de erro', () => {
    const { container } = render(<WarningAlert message="Erro" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('tem classe de fundo vermelho', () => {
    const { container } = render(<WarningAlert message="Erro" />);
    expect(container.querySelector('.bg-red-light-6')).toBeInTheDocument();
  });
});
