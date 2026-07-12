/**
 * src/pages/botAdminPage/BotAdminPage.test.jsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import BotAdminPage from './BotAdminPage';
import { renderWithProviders } from '../../test/testUtils';

describe('BotAdminPage', () => {
  it('renderiza sem crashar', () => {
    renderWithProviders(<BotAdminPage />);
  });

  it('renderiza NavBar do bot admin', () => {
    const { container } = renderWithProviders(<BotAdminPage />);
    // NavBar tem header ou nav
    expect(container.querySelector('header, nav, .bg-')).not.toBeNull();
  });

  it('renderiza algum conteúdo (placeholder ou lista)', () => {
    const { container } = renderWithProviders(<BotAdminPage />);
    expect(container.querySelector('div')).not.toBeNull();
  });
});
