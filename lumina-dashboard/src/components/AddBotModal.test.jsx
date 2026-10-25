import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {screen,fireEvent} from '@testing-library/react';
import AddBotModal from './AddBotModal';
import {renderWithI18n as renderBase,makeGuild,makeUser} from '../test/testUtils';
const renderWithI18n=ui=>renderBase(ui,{user:makeUser()});
beforeEach(()=>vi.stubEnv('VITE_DISCORD_CLIENT_ID','1270847355284881550'));
afterEach(()=>vi.unstubAllEnvs());
it('renders nothing without a target guild',()=>{const {container}=renderWithI18n(<AddBotModal guild={null} onClose={vi.fn()}/>);expect(container.firstChild).toBeNull();});
it('labels the dialog and requires acknowledgement before enabling installation',()=>{
 renderWithI18n(<AddBotModal guild={makeGuild()} onClose={vi.fn()}/>);
 expect(screen.getByRole('dialog',{name:'Adicionar Lumina Bot'})).toBeInTheDocument();
 const invite=screen.getByRole('link',{name:'Continuar para Discord'});expect(invite).toHaveAttribute('aria-disabled','true');
 fireEvent.click(screen.getByRole('checkbox'));expect(invite).toHaveAttribute('aria-disabled','false');
 const url=new URL(invite.href);expect(url.searchParams.get('guild_id')).toBe(makeGuild().id);expect(url.searchParams.has('redirect_uri')).toBe(false);
});
it('closes by the accessible close button and Escape',()=>{
 const close=vi.fn();renderWithI18n(<AddBotModal guild={makeGuild()} onClose={close}/>);
 fireEvent.click(screen.getByRole('button',{name:'Fechar'}));expect(close).toHaveBeenCalledTimes(1);
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});expect(close).toHaveBeenCalledTimes(2);
});
it('disables invitation when the application ID is missing',()=>{
 vi.stubEnv('VITE_DISCORD_CLIENT_ID','');renderWithI18n(<AddBotModal guild={makeGuild()} onClose={vi.fn()}/>);
 fireEvent.click(screen.getByRole('checkbox'));expect(screen.getByRole('alert')).toHaveTextContent('O convite está indisponível');
 expect(screen.getByText('Continuar para Discord')).not.toHaveAttribute('href');
});
