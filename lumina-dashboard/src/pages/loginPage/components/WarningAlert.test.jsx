/**
 * src/pages/loginPage/components/WarningAlert.test.jsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import WarningAlert from './WarningAlert';

describe('WarningAlert (login)', () => {
  it('renderiza mensagem default quando não recebe prop', () => {
    render(<WarningAlert />);
    expect(screen.getByText(/Email ou senha inválidos/i)).toBeInTheDocument();
  });

  it('renderiza mensagem customizada', () => {
    render(<WarningAlert message="Erro customizado" />);
    expect(screen.getByText('Erro customizado')).toBeInTheDocument();
  });

  it('NÃO renderiza botão de fechar quando onClose não é fornecido', () => {
    render(<WarningAlert message="Erro" />);
    expect(screen.queryByLabelText(/Fechar/i)).not.toBeInTheDocument();
  });

  it('renderiza botão de fechar quando onClose é fornecido', () => {
    render(<WarningAlert message="Erro" onClose={() => {}} />);
    expect(screen.getByLabelText(/Fechar/i)).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão de fechar', () => {
    const onClose = vi.fn();
    render(<WarningAlert message="Erro" onClose={onClose} />);
    fireEvent.click(screen.getByLabelText(/Fechar/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tem ícone SVG de erro', () => {
    const { container } = render(<WarningAlert message="Erro" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
