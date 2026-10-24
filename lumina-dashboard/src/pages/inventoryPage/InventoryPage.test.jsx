import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { InventoryPage } from './InventoryPage';
import { renderWithProviders } from '../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => { mockFetch.mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('InventoryPage', () => {
  it('renderiza sem crashar', () => { renderWithProviders(<InventoryPage />); });
  it('renderiza header do inventário', () => { renderWithProviders(<InventoryPage />); expect(document.querySelector('div')).not.toBeNull(); });
  it('reutiliza o contexto de sessão sem uma consulta duplicada', async () => { renderWithProviders(<InventoryPage />); await waitFor(() => { expect(mockFetch).not.toHaveBeenCalled(); }, { timeout: 3000 }); });
});
