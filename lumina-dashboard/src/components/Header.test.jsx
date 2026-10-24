import {it,expect,vi} from 'vitest';
import {screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';
import {renderWithProviders,makeUser,makeAdminUser} from '../test/testUtils';
it('anonymous navigation includes public pages, login, and registration',()=>{
 renderWithProviders(<Header/>);
 for(const href of ['/commands','/inventory','/pricing','/about','/login','/register'])expect(document.querySelector(`a[href="${href}"]`)).toBeInTheDocument();
});
it('member menu exposes account settings without administrator actions',async()=>{
 renderWithProviders(<Header/>,{user:makeUser()});
 await userEvent.click(screen.getByRole('button',{name:/^Conta:/}));
 expect(await screen.findByRole('menuitem',{name:'Configurações'})).toHaveAttribute('href','/settings');
 expect(screen.getByRole('menuitem',{name:'Área de Membros'})).toHaveAttribute('href','/members');
 expect(screen.queryByRole('menuitem',{name:'Painel Admin'})).toBeNull();
 expect(screen.getByRole('menuitem',{name:'Sair'})).toBeInTheDocument();
});
it('administrator menu links to the admin panel',async()=>{
 renderWithProviders(<Header/>,{user:makeAdminUser()});await userEvent.click(screen.getByRole('button',{name:/^Conta:/}));
 expect(await screen.findByRole('menuitem',{name:'Painel Admin'})).toHaveAttribute('href','/admin');
});
it('mobile menu is labeled, navigable, and closes by Escape',async()=>{
 renderWithProviders(<Header/>);await userEvent.click(screen.getByRole('button',{name:/menu/i}));
 expect(await screen.findByRole('dialog',{name:'Lumina Bot'})).toBeInTheDocument();
 await userEvent.keyboard('{Escape}');await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
});
it('active route is exposed to assistive technology',()=>{renderWithProviders(<Header/>,{route:'/commands'});expect(document.querySelector('a[href="/commands"]')).toHaveAttribute('aria-current','page');});
