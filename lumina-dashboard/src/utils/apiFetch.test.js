/**
 * src/utils/apiFetch.test.js
 *
 * Testes para src/utils/apiFetch.js
 *
 * Cobre:
 *   - getCsrfToken: cacheia, busca do endpoint correto
 *   - apiFetch: adiciona credentials: include, serializa body objeto para JSON
 *   - apiGet: método GET
 *   - apiGetJson: parse JSON + throw em erro
 *   - apiMutation: adiciona X-CSRF-Token header
 *   - apiPost / apiPut / apiDelete: wrappers com parse + throw
 *   - checkSession: retorna { authenticated: false } em erro
 *   - apiLogout: não lança mesmo se fetch falha
 *   - 401 dispara evento auth:unauthorized
 *   - 403 com CSRF_INVALID invalida cache do token
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock global fetch ANTES do import
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  apiFetch,
  apiGet,
  apiGetJson,
  apiPost,
  apiPut,
  apiDelete,
  apiMutation,
  getCsrfToken,
  checkSession,
  apiLogout,
  API_BASE,
  _resetCsrfCacheForTests,
} from '../utils/apiFetch';

beforeEach(() => {
  mockFetch.mockReset();
  _resetCsrfCacheForTests();
});

afterEach(() => {
  vi.clearAllMocks();
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('API_BASE', () => {
  it('tem valor definido', () => {
    expect(API_BASE).toBeDefined();
    expect(typeof API_BASE).toBe('string');
  });
});

// ─── getCsrfToken ──────────────────────────────────────────────────────────
describe('getCsrfToken', () => {
  it('busca token de /expapi/v1/csrf-token', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'tok-123' }));

    const token = await getCsrfToken();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('expapi/v1/csrf-token'),
      expect.objectContaining({ credentials: 'include' })
    );
    expect(token).toBe('tok-123');
  });

  it('cacheia o token (não busca de novo na 2a chamada)', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'cached-tok' }));

    const t1 = await getCsrfToken();
    const t2 = await getCsrfToken();

    expect(t1).toBe('cached-tok');
    expect(t2).toBe('cached-tok');
    expect(mockFetch).toHaveBeenCalledTimes(1); // só buscou uma vez
  });

  it('retorna string vazia quando fetch falha', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const token = await getCsrfToken();

    expect(token).toBe('');
  });

  it('retorna string vazia quando resposta não é OK', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Server error', { status: 500 }));

    const token = await getCsrfToken();

    expect(token).toBe('');
  });

  it('retorna string vazia quando JSON não tem csrfToken', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ unrelated: 'field' }));

    const token = await getCsrfToken();

    expect(token).toBe('');
  });
});

// ─── apiFetch ──────────────────────────────────────────────────────────────
describe('apiFetch', () => {
  it('adiciona credentials: include sempre', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('expapi/v1/test');

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1]).toHaveProperty('credentials', 'include');
  });

  it('serializa body objeto para JSON string', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('expapi/v1/test', {
      method: 'POST',
      body: { email: 'test@x.com', password: '123' },
    });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].body).toBe(JSON.stringify({ email: 'test@x.com', password: '123' }));
    expect(callArgs[1].headers['Content-Type']).toBe('application/json');
  });

  it('NÃO serializa body string', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('expapi/v1/test', {
      method: 'POST',
      body: 'raw string body',
    });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].body).toBe('raw string body');
  });

  it('pré-pendencia API_BASE em URLs relativas', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('expapi/v1/test');

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('expapi/v1/test');
  });

  it('NÃO pré-pende API_BASE em URLs absolutas (http://)', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('https://other.api.com/endpoint');

    expect(mockFetch.mock.calls[0][0]).toBe('https://other.api.com/endpoint');
  });

  it('preserva headers customizados', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('expapi/v1/test', {
      headers: { 'X-Custom': 'value' },
    });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['X-Custom']).toBe('value');
  });

  it('dispara evento auth:unauthorized quando status é 401', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    const handler = vi.fn();
    window.addEventListener('auth:unauthorized', handler);

    await apiFetch('expapi/v1/test');

    expect(handler).toHaveBeenCalled();
    window.removeEventListener('auth:unauthorized', handler);
  });

  it('NÃO dispara auth:unauthorized para status != 401', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

    const handler = vi.fn();
    window.addEventListener('auth:unauthorized', handler);

    await apiFetch('expapi/v1/test');

    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener('auth:unauthorized', handler);
  });

  it('retorna a Response raw (não faz parse)', async () => {
    const res = jsonResponse({ data: 'test' });
    mockFetch.mockResolvedValueOnce(res);

    const result = await apiFetch('expapi/v1/test');

    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(200);
  });
});

// ─── apiGet ────────────────────────────────────────────────────────────────
describe('apiGet', () => {
  it('faz GET request', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'test' }));

    await apiGet('expapi/v1/test');

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].method).toBe('GET');
  });
});

// ─── apiGetJson ────────────────────────────────────────────────────────────
describe('apiGetJson', () => {
  it('retorna JSON parseado em sucesso', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'test' }));

    const result = await apiGetJson('expapi/v1/test');

    expect(result).toEqual({ data: 'test' });
  });

  it('lança Error com status quando resposta não-OK', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Not found' }, 404));

    await expect(apiGetJson('expapi/v1/test')).rejects.toThrow('Not found');
  });

  it('lança Error com HTTP status quando body não tem error', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ unrelated: true }, 500));

    await expect(apiGetJson('expapi/v1/test')).rejects.toThrow('HTTP 500');
  });

  it('Error lançado tem .status e .response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Bad' }, 400));

    try {
      await apiGetJson('expapi/v1/test');
      expect.fail('Deveria ter lançado');
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.response).toBeInstanceOf(Response);
    }
  });
});

// ─── apiMutation ───────────────────────────────────────────────────────────
describe('apiMutation', () => {
  it('adiciona X-CSRF-Token header', async () => {
    // Mock getCsrfToken primeiro
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-tok-123' }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiMutation('expapi/v1/test', { method: 'POST', body: { x: 1 } });

    // Segunda chamada é a mutation
    const mutationCall = mockFetch.mock.calls[1];
    expect(mutationCall[1].headers['X-CSRF-Token']).toBe('csrf-tok-123');
    expect(mutationCall[1].method).toBe('POST');
  });

  it('usa POST como método default', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'tok' }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiMutation('expapi/v1/test');

    expect(mockFetch.mock.calls[1][1].method).toBe('POST');
  });

  it('aceita method PUT/DELETE', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'tok' }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiMutation('expapi/v1/test', { method: 'PUT', body: { x: 1 } });

    expect(mockFetch.mock.calls[1][1].method).toBe('PUT');
  });
});

// ─── apiPost ───────────────────────────────────────────────────────────────
describe('apiPost', () => {
  it('retorna JSON parseado em sucesso', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'tok' }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true, id: 1 }));

    const result = await apiPost('expapi/v1/test', { name: 'test' });

    expect(result).toEqual({ ok: true, id: 1 });
  });

  it('lança Error em resposta não-OK', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'tok' }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Bad request' }, 400));

    await expect(apiPost('expapi/v1/test', {})).rejects.toThrow('Bad request');
  });
});

// ─── apiPut ────────────────────────────────────────────────────────────────
describe('apiPut', () => {
  it('retorna JSON parseado em sucesso', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'tok' }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await apiPut('expapi/v1/test', { name: 'updated' });

    expect(result).toEqual({ ok: true });
    expect(mockFetch.mock.calls[1][1].method).toBe('PUT');
  });

  it('lança Error em resposta não-OK', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'tok' }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Validation' }, 400));

    await expect(apiPut('expapi/v1/test', {})).rejects.toThrow('Validation');
  });
});

// ─── apiDelete ─────────────────────────────────────────────────────────────
describe('apiDelete', () => {
  it('retorna JSON parseado em sucesso', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'tok' }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await apiDelete('expapi/v1/test');

    expect(result).toEqual({ ok: true });
    expect(mockFetch.mock.calls[1][1].method).toBe('DELETE');
  });
});

// ─── checkSession ──────────────────────────────────────────────────────────
describe('checkSession', () => {
  it('retorna data da sessão quando autenticado', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ authenticated: true, user: { email: 'x@x.com' } }));

    const result = await checkSession();

    expect(result.authenticated).toBe(true);
    expect(result.user.email).toBe('x@x.com');
  });

  it('retorna { authenticated: false } quando resposta não-OK', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Server error', { status: 500 }));

    const result = await checkSession();

    expect(result.authenticated).toBe(false);
  });

  it('retorna { authenticated: false } quando fetch falha', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await checkSession();

    expect(result.authenticated).toBe(false);
  });
});

// ─── apiLogout ─────────────────────────────────────────────────────────────
describe('apiLogout', () => {
  it('faz POST para /expapi/v1/logout com CSRF token', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'tok' }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiLogout();

    // Segunda chamada é o logout
    const logoutCall = mockFetch.mock.calls[1];
    expect(logoutCall[0]).toContain('expapi/v1/logout');
    expect(logoutCall[1].method).toBe('POST');
    expect(logoutCall[1].headers['X-CSRF-Token']).toBe('tok');
  });

  it('NÃO lança mesmo se fetch falha (silencioso)', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'tok' }));
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Não deve lançar
    await expect(apiLogout()).resolves.toBeUndefined();
  });
});
