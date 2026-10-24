import {describe,it,expect} from 'vitest';
import {screen,within} from '@testing-library/react';
import TermsOfUsePage from './TermsOfUsePage';
import LegalPage from '../legalPage/LegalPage';
import SiteFooter from '../../components/SiteFooter';
import {renderWithProviders} from '../../test/testUtils';
describe('Documentos públicos',()=>{
 it('termos identificam a operação e oferecem acesso às outras políticas sem exigir login',()=>{
  renderWithProviders(<TermsOfUsePage/>);
  expect(screen.getByRole('heading',{level:1,name:'Termos de uso'})).toBeInTheDocument();
  expect(screen.getAllByRole('heading',{level:1})).toHaveLength(1);
  expect(screen.getByText(/operados pela LuminaInk/)).toBeInTheDocument();
  expect(within(screen.getByRole('navigation',{name:'Documentos legais'})).getByRole('link',{name:'Privacidade'})).toHaveAttribute('href','/privacy');
 });
 it('privacidade informa retenção, direitos e o contato definido pelo responsável',()=>{
  renderWithProviders(<LegalPage type="privacy"/>);
  expect(screen.getByRole('heading',{name:'6. Por quanto tempo conservamos'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'7. Seus direitos e escolhas'})).toBeInTheDocument();
  expect(screen.getAllByRole('link',{name:'contato@luminasink.com'}).length).toBeGreaterThan(0);
 });
 it('cookies descreve a sessão e esclarece que o aviso é informativo',()=>{
  renderWithProviders(<LegalPage type="cookies"/>);
  expect(screen.getByRole('table')).toHaveTextContent('lumina_oauth_exchange');
  expect(screen.getByText(/fechar ou confirmar a leitura não autoriza novos usos/)).toBeInTheDocument();
 });
 it('o rodapé compartilhado mantém todos os destinos legais e os canais corretos',()=>{
  renderWithProviders(<SiteFooter/>);
  const footer=screen.getByRole('contentinfo');
  expect(within(footer).getByRole('link',{name:'Termos de uso'})).toHaveAttribute('href','/terms');
  expect(within(footer).getByRole('link',{name:'Privacidade'})).toHaveAttribute('href','/privacy');
  expect(within(footer).getByRole('link',{name:'Cookies e dados locais'})).toHaveAttribute('href','/cookies');
  expect(within(footer).getByRole('link',{name:'Direitos autorais'})).toHaveAttribute('href','mailto:dmca@luminasink.com');
 });
});
