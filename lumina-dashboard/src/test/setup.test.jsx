/**
 * src/test/setup.test.jsx
 *
 * Teste de sanidade do ambiente Vitest + RTL.
 * Verifica que matchers do jest-dom estão disponíveis e que o jsdom funciona.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

function HelloWorld({ name = 'World' }) {
  return <div>Hello, {name}!</div>;
}

describe('Ambiente de teste', () => {
  it('renderiza um componente React simples', () => {
    render(<HelloWorld />);
    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
  });

  it('aceita props', () => {
    render(<HelloWorld name="Lumina" />);
    expect(screen.getByText('Hello, Lumina!')).toBeInTheDocument();
  });

  it('jest-dom matcher toBeInTheDocument funciona', () => {
    render(<div data-testid="test">test</div>);
    const el = screen.getByTestId('test');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('test');
  });

  it('jsdom provê window e document', () => {
    expect(window).toBeDefined();
    expect(document).toBeDefined();
    expect(document.createElement('div')).toBeDefined();
  });

  it('localStorage funciona e é limpo entre testes', () => {
    localStorage.setItem('test-key', 'test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
  });

  it('localStorage do teste anterior foi limpo', () => {
    expect(localStorage.getItem('test-key')).toBeNull();
  });
});
