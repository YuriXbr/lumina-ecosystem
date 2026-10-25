import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import EmailCodePage from './EmailCodePage';
import RejectCodePage from './RejectCodePage';
import {apiPost} from '../../utils/apiFetch';
vi.mock('../../utils/apiFetch',()=>({apiPost:vi.fn()}));
vi.mock('../../contexts/UserContext',()=>({useUser:()=>({user:null,refreshUser:vi.fn().mockResolvedValue(null)})}));
beforeEach(()=>{vi.mocked(apiPost).mockReset();});
const show=ui=>render(<MemoryRouter>{ui}</MemoryRouter>);
it('requests a code without exposing account existence and enables the code form',async()=>{
 vi.mocked(apiPost).mockResolvedValue({ok:true,message:'Se esta conta puder receber o código, enviaremos um email.'});
 show(<EmailCodePage purpose="verify"/>);fireEvent.change(screen.getByLabelText('Email de cadastro'),{target:{value:'review@example.test'}});fireEvent.click(screen.getByRole('button',{name:'Enviar código'}));
 await waitFor(()=>expect(screen.getByLabelText('Código de confirmação')).toBeInTheDocument());expect(apiPost).toHaveBeenCalledWith('expapi/v1/account/email-code/request',{email:'review@example.test',purpose:'verify'});expect(screen.getByRole('button',{name:/Reenviar em/})).toBeDisabled();
});
it('request failures leave a retryable form and an accessible error',async()=>{
 vi.mocked(apiPost).mockRejectedValue(new Error('Envio indisponível.'));
 show(<EmailCodePage purpose="reset"/>);fireEvent.change(screen.getByLabelText('Email de cadastro'),{target:{value:'review@example.test'}});fireEvent.click(screen.getByRole('button',{name:'Enviar código'}));
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Envio indisponível.'));expect(screen.getByRole('button',{name:'Enviar código'})).toBeEnabled();
});
it('opening a rejection link never cancels automatically and removes the fragment',async()=>{
 window.history.replaceState({},'','/security/code#token='+('A'.repeat(43)));
 show(<RejectCodePage/>);expect(apiPost).not.toHaveBeenCalled();expect(window.location.hash).toBe('');
 vi.mocked(apiPost).mockResolvedValue({ok:true,blockedUntil:new Date(Date.now()+86400000).toISOString()});fireEvent.click(screen.getByRole('button',{name:'Cancelar código e bloquear por 24 horas'}));
 await waitFor(()=>expect(screen.getByRole('heading',{name:'Solicitação cancelada'})).toBeInTheDocument());expect(apiPost).toHaveBeenCalledTimes(1);expect(apiPost).toHaveBeenCalledWith('expapi/v1/account/email-code/reject',{token:'A'.repeat(43)});
});
it('a missing rejection token cannot submit a cancellation',()=>{show(<RejectCodePage/>);expect(screen.getByRole('alert')).toHaveTextContent('Abra esta página pelo botão recebido no email.');expect(screen.queryByRole('button')).toBeNull();expect(apiPost).not.toHaveBeenCalled();});
