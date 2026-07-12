import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DashboardSettingsPage from './DashboardSettingsPage';
import { renderWithProviders, makeUser } from '../../test/testUtils';

describe('DashboardSettingsPage', () => {
  it('renderiza sem crashar (após correção do bug do token indefinido)', () => {
    // CORREÇÃO #3: antes do fix, o componente referenciava `token` que não
    // estava definido, causando ReferenceError. Agora usa useUser() + cookie.
    expect(() => renderWithProviders(<DashboardSettingsPage />, { user: makeUser() })).not.toThrow();
  });

  it('renderiza spinner quando formData.bot é null', () => {
    renderWithProviders(<DashboardSettingsPage />, { user: makeUser() });
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
