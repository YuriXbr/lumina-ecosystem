import {describe,it,expect,beforeEach,vi} from 'vitest';
import {screen,fireEvent} from '@testing-library/react';
import ConsentModal from './ConsentModal';
import {renderWithProviders} from '../test/testUtils';
const KEY='lumina_cookie_notice_v2';
beforeEach(()=>localStorage.clear());
describe('Aviso de cookies',()=>{
 it('oferece acesso às políticas e não pede autorização genérica para tratar dados',()=>{
  renderWithProviders(<ConsentModal/>);
  expect(screen.getByRole('link',{name:'Política de Privacidade'})).toHaveAttribute('href','/privacy');
  expect(screen.getByRole('link',{name:'Política de Cookies'})).toHaveAttribute('href','/cookies');
  expect(screen.queryByRole('button',{name:/aceitar tudo|recusar tudo/i})).toBeNull();
 });
 it('registrar a leitura não grava consentimento para analytics ou outros tratamentos',()=>{
  renderWithProviders(<ConsentModal/>);fireEvent.click(screen.getByRole('button',{name:'Entendi'}));
  const notice=JSON.parse(localStorage.getItem(KEY));expect(notice.acknowledgedAt).toBeTruthy();expect(notice).not.toHaveProperty('accepted');
  expect(screen.queryByRole('complementary')).toBeNull();
 });
 it('não impede acesso quando o armazenamento está indisponível',()=>{
  const get=vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('unavailable');});
  renderWithProviders(<ConsentModal/>);expect(screen.getByRole('link',{name:'Política de Privacidade'})).toBeInTheDocument();get.mockRestore();
 });
 it('respeita o registro da versão atual, sem reaproveitar a autorização ampla da versão antiga',()=>{
  localStorage.setItem('lumina_cookie_consent_v1',JSON.stringify({accepted:true}));
  const {unmount}=renderWithProviders(<ConsentModal/>);expect(screen.getByRole('button',{name:'Entendi'})).toBeInTheDocument();unmount();
  localStorage.setItem(KEY,JSON.stringify({version:2,acknowledgedAt:'2026-10-23'}));
  renderWithProviders(<ConsentModal/>);expect(screen.queryByRole('complementary')).toBeNull();
 });
});
