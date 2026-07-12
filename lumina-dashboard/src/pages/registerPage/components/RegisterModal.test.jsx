import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import RegisterModal from './RegisterModal';
import { renderWithProviders } from '../../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => {
  mockFetch.mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
});

describe('RegisterModal', () => {
  it('renderiza sem crashar (após correção do erro de sintaxe no fetch)', () => {
    // CORREÇÃO #4: antes do fix, o fetch() estava incompleto (faltava method,
    // headers, body e fechamento de parêntese), causando erro de sintaxe que
    // impedia a importação do módulo. Agora está completo e funcional.
    expect(() => renderWithProviders(<RegisterModal />)).not.toThrow();
  });

  it('renderiza inputs de formulário', () => {
    renderWithProviders(<RegisterModal />);
    expect(document.querySelectorAll('input').length).toBeGreaterThan(0);
  });

  it('renderiza botão Discord', () => {
    renderWithProviders(<RegisterModal />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
