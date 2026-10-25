import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {screen,fireEvent,waitFor,act} from '@testing-library/react';
import ConsoleTab from './ConsoleTab';
import {renderWithProviders,makeAdminUser} from '../../../../test/testUtils';
import {apiGetJson,apiPost} from '../../../../utils/apiFetch';
vi.mock('../../../../utils/apiFetch',()=>({apiGetJson:vi.fn(),apiPost:vi.fn()}));
const worker={workerId:'worker',guildCount:42,pingMs:32,memoryMb:68.5,uptimeSeconds:600};
const snapshot=(events=[])=>({events,cursor:events.at(-1)?.id||null,hasMore:false,workers:[worker],commands:[],pollAfterMs:5000});
beforeEach(()=>{vi.mocked(apiGetJson).mockReset();vi.mocked(apiPost).mockReset();vi.spyOn(document,'hidden','get').mockReturnValue(false);});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it('shows persisted bot logs and bot metrics, with no disabled WebSocket notice',async()=>{
 vi.mocked(apiGetJson).mockResolvedValue(snapshot([{id:'first',level:'info',message:'Bot pronto',timestamp:new Date().toISOString()}]));
 renderWithProviders(<ConsoleTab/>,{user:makeAdminUser()});
 await screen.findByText('Bot pronto');expect(screen.getByText('68.5 MB')).toBeInTheDocument();expect(screen.queryByText(/WebSocket/)).toBeNull();
 expect(apiGetJson).toHaveBeenCalledWith('expapi/v1/admin/bot-console',expect.objectContaining({signal:expect.any(AbortSignal)}));
});
it('requests a whitelisted diagnostic using the shared CSRF mutation client',async()=>{
 vi.mocked(apiGetJson).mockResolvedValue(snapshot());vi.mocked(apiPost).mockResolvedValue({requestId:'queued'});
 renderWithProviders(<ConsoleTab/>,{user:makeAdminUser()});await screen.findByText('68.5 MB');
 fireEvent.change(screen.getByLabelText('Diagnóstico'),{target:{value:'ping'}});fireEvent.click(screen.getByRole('button',{name:'Solicitar diagnóstico'}));
 await waitFor(()=>expect(apiPost).toHaveBeenCalledWith('expapi/v1/admin/bot-console/commands',{command:'ping',requestId:expect.stringMatching(/^[a-f0-9-]{36}$/)}));
});
it('retains events on network failure and clearing affects only the display',async()=>{
 const log={id:'first',level:'info',message:'Keep history',timestamp:new Date().toISOString()};
 vi.mocked(apiGetJson).mockResolvedValueOnce(snapshot([log])).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(snapshot());
 renderWithProviders(<ConsoleTab/>,{user:makeAdminUser()});await screen.findByText('Keep history');
 fireEvent.click(screen.getByRole('button',{name:'Atualizar'}));await screen.findByRole('alert');expect(screen.getByText('Keep history')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Limpar exibição'}));expect(screen.queryByText('Keep history')).toBeNull();expect(apiPost).not.toHaveBeenCalled();
});
it('does not start background polling while the tab is hidden',async()=>{
 vi.spyOn(document,'hidden','get').mockReturnValue(true);vi.mocked(apiGetJson).mockResolvedValue(snapshot());
 renderWithProviders(<ConsoleTab/>,{user:makeAdminUser()});expect(apiGetJson).not.toHaveBeenCalled();
 vi.spyOn(document,'hidden','get').mockReturnValue(false);fireEvent(document,new Event('visibilitychange'));await waitFor(()=>expect(apiGetJson).toHaveBeenCalledTimes(1));
});
it('aborts pending read when paused and disables diagnostics without a live bot',async()=>{
 vi.mocked(apiGetJson).mockResolvedValue({...snapshot(),workers:[]});renderWithProviders(<ConsoleTab/>,{user:makeAdminUser()});
 await screen.findByText(/Sem sinal recente/);expect(screen.getByRole('button',{name:'Solicitar diagnóstico'})).toBeDisabled();
 const signal=vi.mocked(apiGetJson).mock.calls[0][1].signal;fireEvent.click(screen.getByRole('button',{name:'Pausar'}));expect(signal.aborted).toBe(true);expect(screen.getByText('Atualização pausada')).toBeInTheDocument();
});
