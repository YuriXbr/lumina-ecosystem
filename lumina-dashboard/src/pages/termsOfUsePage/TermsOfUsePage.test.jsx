/**
 * src/pages/termsOfUsePage/TermsOfUsePage.test.jsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import TermsOfUsePage from './TermsOfUsePage';
import { renderWithProviders } from '../../test/testUtils';

describe('TermsOfUsePage', () => {
  it('renderiza sem crashar', () => {
    renderWithProviders(<TermsOfUsePage />);
  });

  it('renderiza seção de termos (8 seções)', () => {
    const { container } = renderWithProviders(<TermsOfUsePage />);
    const h2s = container.querySelectorAll('h2');
    // 8 seções de termos + 7 seções de privacidade = 15 h2
    expect(h2s.length).toBeGreaterThanOrEqual(15);
  });

  it('renderiza seção de privacidade', () => {
    renderWithProviders(<TermsOfUsePage />);
    // O título de privacidade é o segundo h1
    const h1s = document.querySelectorAll('h1');
    expect(h1s.length).toBeGreaterThanOrEqual(2);
  });

  it('renderiza listas (ul > li) nas seções de privacidade', () => {
    const { container } = renderWithProviders(<TermsOfUsePage />);
    const uls = container.querySelectorAll('ul');
    expect(uls.length).toBeGreaterThan(0);
    const lis = container.querySelectorAll('li');
    expect(lis.length).toBeGreaterThan(0);
  });
});
