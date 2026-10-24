import { API_BASE } from './apiBase';
let csrfTokenCache;
let csrfTokenPromise;
let sessionRequest;
export function resetCsrfToken() { csrfTokenCache = undefined; csrfTokenPromise = undefined; }
function apiUrl(path) {
  const base = new URL(API_BASE || '/', window.location.origin);
  const url = new URL(path, base);
  if (url.origin !== base.origin) throw new Error('Origem de API inválida.');
  return url.href;
}
export async function apiFetch(path, options = {}) {
  const { timeout = 12000, ...fetchOptions } = options;
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(() => controller.abort(), timeout);
  const headers = new Headers(options.headers);
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers.set('Content-Type','application/json'); body = JSON.stringify(body);
  }
  const trace = crypto.randomUUID?.().replaceAll('-','');
  if (trace) headers.set('traceparent', `00-${trace}-${trace.slice(0,16)}-00`);
  try {
    const response = await fetch(apiUrl(path), { ...fetchOptions, body, headers, credentials:'include', signal:controller.signal });
    if (response.status === 401) window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    return response;
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort',abort); }
}
export async function getCsrfToken() {
  if (csrfTokenCache) return csrfTokenCache;
  if (!csrfTokenPromise) csrfTokenPromise = (async () => {
    const response = await apiFetch('expapi/v1/csrf-token');
    if (!response.ok) throw new Error('Não foi possível proteger a solicitação. Tente novamente.');
    const data = await response.json();
    if (!data.csrfToken) throw new Error('Resposta de segurança inválida.');
    csrfTokenCache = data.csrfToken; return csrfTokenCache;
  })().finally(() => { csrfTokenPromise = undefined; });
  return csrfTokenPromise;
}
export const apiGet = (url, options = {}) => apiFetch(url, { ...options, method:'GET' });
async function jsonResponse(response) {
  if (!response.ok) {
    let data; try { data = await response.json(); } catch { /* Non-JSON upstream failure */ }
    const error = new Error(data?.error || `Não foi possível concluir a solicitação (${response.status}).`);
    Object.assign(error,{status:response.status,code:data?.code,requestId:response.headers?.get('X-Request-Id'),response}); throw error;
  }
  return response.status === 204 ? null : response.json();
}
export async function apiGetJson(url,options) { return jsonResponse(await apiGet(url,options)); }
export async function apiMutation(url,{method='POST',body,signal}={}) {
  const send = async () => apiFetch(url,{method,body,signal,headers:{'X-CSRF-Token':await getCsrfToken()}});
  let response = await send();
  if (response.status === 403) {
    const data = await response.clone().json().catch(() => null);
    // A CSRF rejection happens before the action executes; other writes are never retried.
    if (data?.code === 'CSRF_INVALID') { resetCsrfToken(); response = await send(); }
  }
  return response;
}
export async function apiPost(url,body) { return jsonResponse(await apiMutation(url,{body})); }
export async function apiPut(url,body) { return jsonResponse(await apiMutation(url,{method:'PUT',body})); }
export async function apiDelete(url) { return jsonResponse(await apiMutation(url,{method:'DELETE'})); }
export async function checkSession() {
  if (!sessionRequest) sessionRequest = apiGetJson('expapi/v1/session').finally(() => { sessionRequest = undefined; });
  return sessionRequest;
}
export async function apiLogout() { await apiPost('expapi/v1/logout'); resetCsrfToken(); }
export { API_BASE };
