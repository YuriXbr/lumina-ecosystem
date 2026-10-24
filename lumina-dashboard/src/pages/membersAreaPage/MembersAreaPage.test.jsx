/**
 * src/pages/membersAreaPage/MembersAreaPage.test.jsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MembersAreaPage from './MembersAreaPage';
import { UserContext } from '../../contexts/UserContext';
import { renderWithProviders, makeUser } from '../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
});

describe('MembersAreaPage', () => {
  it('renderiza sem crashar', () => {
    renderWithProviders(<MembersAreaPage />, { user: makeUser() });
  });

  it('renderiza para usuário logado', () => {
    expect(() => renderWithProviders(<MembersAreaPage />, { user: makeUser() })).not.toThrow();
  });

  it('orienta a vincular Discord sem consultar inventário nem servidores', async () => {
    renderWithProviders(<MembersAreaPage />, { user: makeUser() });
    expect(screen.getByRole('link', { name: 'Conectar Discord' })).toHaveAttribute('href', '/settings');
    await Promise.resolve();
    const urls = mockFetch.mock.calls.map(([url]) => String(url));
    expect(urls.some(url => url.endsWith('/myinventory') || url.endsWith('/my-guilds'))).toBe(false);
    expect(screen.queryByText('Erro ao carregar inventário')).not.toBeInTheDocument();
  });

  it('mostra falha de sessão com nova tentativa, sem tratar como visitante', () => {
    const refreshUser = vi.fn().mockResolvedValue(null);
    renderWithProviders(<UserContext.Provider value={{user:null,loading:false,error:'Falha temporária de sessão.',refreshUser}}><MembersAreaPage /></UserContext.Provider>);
    expect(screen.getByRole('heading', {name:'Não foi possível verificar sua sessão'})).toBeInTheDocument();
    expect(screen.queryByText('Gerencie seus servidores em um só lugar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'Tentar novamente'}));
    expect(refreshUser).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('renderiza para usuário sem logar', () => {
    expect(() => renderWithProviders(<MembersAreaPage />, { user: null })).not.toThrow();
  });
});
