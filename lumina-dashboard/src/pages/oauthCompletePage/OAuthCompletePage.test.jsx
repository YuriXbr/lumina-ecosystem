import {it,expect,vi,beforeEach} from 'vitest';
import {screen,waitFor} from '@testing-library/react';
import OAuthCompletePage from './OAuthCompletePage';
import {renderWithProviders,makeUser} from '../../test/testUtils';
import {apiPost} from '../../utils/apiFetch';
vi.mock('../../utils/apiFetch',()=>({apiPost:vi.fn()}));
beforeEach(()=>{vi.mocked(apiPost).mockReset();window.history.replaceState({},'','/oauth/complete');});
it('exchanges a one-use code after removing the fragment',async()=>{
 window.history.replaceState({},'','/oauth/complete#code=one-use-code&hasPassword=true');
 vi.mocked(apiPost).mockImplementation(async()=>{expect(window.location.hash).toBe('');return{user:makeUser()};});
 renderWithProviders(<OAuthCompletePage/>);
 await waitFor(()=>expect(apiPost).toHaveBeenCalledWith('expapi/v1/exchange-token',{code:'one-use-code'}));
 expect(screen.queryByRole('link')).toBeNull();
});
it('announces loading while exchange is pending',()=>{
 window.history.replaceState({},'','/oauth/complete#code=pending');vi.mocked(apiPost).mockReturnValue(new Promise(()=>{}));
 renderWithProviders(<OAuthCompletePage/>);expect(screen.getByRole('status')).toHaveAttribute('aria-busy','true');
});
it('rejects legacy JWT URLs without sending them to the API',()=>{
 window.history.replaceState({},'','/oauth/complete#token=legacy-jwt');renderWithProviders(<OAuthCompletePage/>);
 expect(apiPost).not.toHaveBeenCalled();expect(screen.getByRole('link')).toHaveAttribute('href','/login');expect(window.location.hash).toBe('');
});
it.each(['link_no_account','discord_already_linked','link_account_not_found'])('link error %s returns to the member area',error=>{
 window.history.replaceState({},'','/oauth/complete?oauthError='+error);renderWithProviders(<OAuthCompletePage/>);
 expect(screen.getByRole('link')).toHaveAttribute('href','/members');expect(apiPost).not.toHaveBeenCalled();
});
it('exchange failure ends loading and allows a new login',async()=>{
 window.history.replaceState({},'','/oauth/complete#code=expired');vi.mocked(apiPost).mockRejectedValue(new Error('expired'));renderWithProviders(<OAuthCompletePage/>);
 await waitFor(()=>expect(screen.getByRole('link')).toHaveAttribute('href','/login'));expect(screen.getByRole('status')).toHaveAttribute('aria-busy','false');
});
