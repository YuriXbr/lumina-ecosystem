import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import UserManagementTab from './UserManagementTab';
import { renderWithProviders, makeAdminUser } from '../../../../test/testUtils';
const mockFetch = vi.fn();
global.fetch = mockFetch;
const account = {accountId:'member-1',firstName:'Ana',lastName:'Silva',email:'ana@example.test',accessType:'user',emailVerified:true,blocked:false,banned:false,lastLogin:null};
const json = body => new Response(JSON.stringify(body), {status:200});
beforeEach(() => mockFetch.mockReset());
describe('UserManagementTab', () => {
  it('avança com a paginação da API sem recortar novamente a segunda página', async () => {
    mockFetch.mockImplementation(async url => json({users:[{...account,email:String(url).includes('page=2')?'second@example.test':'first@example.test'}],pagination:{hasMore:!String(url).includes('page=2')}}));
    renderWithProviders(<UserManagementTab />, {user:makeAdminUser()});
    await screen.findByText('first@example.test');
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}));
    await screen.findByText('second@example.test');
    expect(screen.getByText('Página 2')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Próximo'})).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox',{name:'Buscar usuários'}),{target:{value:'Ana'}});
    await waitFor(() => expect(mockFetch.mock.calls.some(([url]) => String(url).includes('page=1') && String(url).includes('search=Ana'))).toBe(true));
  });
  it('mantém o foco durante edição e fecha o modal com Escape', async () => {
    mockFetch.mockImplementation(async () => json({users:[account],pagination:{hasMore:false}}));
    renderWithProviders(<UserManagementTab />, {user:makeAdminUser({accessType:'headadmin'})});
    await screen.findByText(account.email);
    fireEvent.click(screen.getByRole('button',{name:'Ver detalhes'}));
    expect(screen.queryByRole('option',{name:'Owner',exact:true})).not.toBeInTheDocument();
    const input = screen.getByRole('textbox',{name:'Nome',exact:true});
    const actor=userEvent.setup();
    await actor.type(input,' Maria');
    expect(screen.getByRole('textbox',{name:'Nome',exact:true})).toBe(input);
    expect(input).toHaveValue('Ana Maria');
    expect(input).toHaveFocus();
    await actor.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('aceita registros legados sem nome e mostra ausência de login sem data de 1970', async () => {
    mockFetch.mockImplementation(async () => json({users:[{...account,firstName:null,lastName:null}],pagination:{hasMore:false}}));
    renderWithProviders(<UserManagementTab />, {user:makeAdminUser()});
    await screen.findByText(account.email);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
  });
});
