import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
import {apiFetch,apiGetJson,apiPost,getCsrfToken,checkSession,apiLogout,resetCsrfToken} from './apiFetch';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
let fetchMock;
beforeEach(()=>{fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);resetCsrfToken();});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('includes cookies and serializes JSON only for the configured API origin',async()=>{
 fetchMock.mockResolvedValue(json({ok:true}));await apiFetch('expapi/v1/example',{method:'POST',body:{answer:42}});
 const [url,options]=fetchMock.mock.calls[0];expect(new URL(url).pathname).toBe('/expapi/v1/example');expect(options.credentials).toBe('include');expect(options.headers.get('Content-Type')).toBe('application/json');expect(options.body).toBe('{"answer":42}');
 await expect(apiFetch('https://evil.example/collect')).rejects.toThrow('Origem');expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('reports service errors instead of converting them into logout',async()=>{
 fetchMock.mockResolvedValue(json({error:'Unavailable'},503));await expect(checkSession()).rejects.toMatchObject({status:503});
});
it('coalesces simultaneous session requests',async()=>{
 fetchMock.mockResolvedValue(json({authenticated:false}));await Promise.all([checkSession(),checkSession(),checkSession()]);expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('failed CSRF retrieval can be retried',async()=>{
 fetchMock.mockResolvedValueOnce(json({error:'Offline'},503)).mockResolvedValueOnce(json({csrfToken:'fresh'}));
 await expect(getCsrfToken()).rejects.toThrow();expect(await getCsrfToken()).toBe('fresh');
});
it('retries only a CSRF rejection and uses the renewed token',async()=>{
 fetchMock.mockResolvedValueOnce(json({csrfToken:'old'})).mockResolvedValueOnce(json({code:'CSRF_INVALID'},403)).mockResolvedValueOnce(json({csrfToken:'new'})).mockResolvedValueOnce(json({ok:true}));
 expect(await apiPost('expapi/v1/example',{answer:42})).toEqual({ok:true});
 expect(fetchMock.mock.calls[1][1].headers.get('X-CSRF-Token')).toBe('old');expect(fetchMock.mock.calls[3][1].headers.get('X-CSRF-Token')).toBe('new');
});
it('does not retry a failed or timed-out business mutation',async()=>{
 fetchMock.mockResolvedValueOnce(json({csrfToken:'valid'})).mockResolvedValueOnce(json({error:'Failed'},500));
 await expect(apiPost('expapi/v1/example',{})).rejects.toMatchObject({status:500});expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('logout failure is visible to callers',async()=>{
 fetchMock.mockResolvedValueOnce(json({csrfToken:'valid'})).mockResolvedValueOnce(json({error:'Failed'},503));await expect(apiLogout()).rejects.toMatchObject({status:503});
});
it('emits unauthorized only when the API explicitly rejects authentication',async()=>{
 const listener=vi.fn();window.addEventListener('auth:unauthorized',listener);
 fetchMock.mockResolvedValue(json({},401));await apiFetch('expapi/v1/private');expect(listener).toHaveBeenCalledOnce();window.removeEventListener('auth:unauthorized',listener);
});
it('returns request correlation with service errors',async()=>{
 const response=json({error:'Try again'},503);response.headers.set('X-Request-Id','review-request');fetchMock.mockResolvedValue(response);
 await expect(apiGetJson('expapi/v1/example')).rejects.toMatchObject({requestId:'review-request'});
});
it('aborts a stalled request at the time limit',async()=>{
 vi.useFakeTimers();fetchMock.mockImplementation((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))));
 const request=apiFetch('expapi/v1/example',{timeout:100});const assertion=expect(request).rejects.toMatchObject({name:'AbortError'});await vi.advanceTimersByTimeAsync(100);await assertion;
});
