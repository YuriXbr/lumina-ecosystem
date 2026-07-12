import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SettingsTab from './SettingsTab';
import { renderWithProviders, makeUser } from '../../../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => { mockFetch.mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('SettingsTab', () => {
  it('renderiza sem crashar', () => { renderWithProviders(<SettingsTab />, { user: makeUser() }); });
  it('renderiza toggles ou inputs', () => { const { container } = renderWithProviders(<SettingsTab />, { user: makeUser() }); expect(container.querySelectorAll('input, button, [role="switch"]').length).toBeGreaterThan(0); });
});
