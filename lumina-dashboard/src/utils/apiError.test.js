/**
 * src/utils/apiError.test.js
 *
 * Testes para src/utils/apiError.js
 *
 * Cobre:
 *   - parseApiError: JSON response, text response, response com parse error
 *   - statusFallbackMessage: cada status code (400, 401, 403, 404, 429, 500, default)
 *   - isNetworkError: TypeError é network error, outros não são
 */

import { describe, it, expect } from 'vitest';
import { parseApiError, statusFallbackMessage, isNetworkError } from '../utils/apiError';

// Helper para criar uma Response mockada
function makeResponse(body, init = {}) {
  const { status = 200, headers = {} } = init;
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  const defaultHeaders = { 'Content-Type': 'application/json' };
  return new Response(bodyStr, {
    status,
    headers: { ...defaultHeaders, ...headers },
  });
}

describe('parseApiError', () => {
  it('extrai { message, code } de response JSON', async () => {
    const res = makeResponse({ error: 'Senha incorreta', code: 'INVALID_CREDENTIALS' });
    const result = await parseApiError(res);
    expect(result.message).toBe('Senha incorreta');
    expect(result.code).toBe('INVALID_CREDENTIALS');
  });

  it('usa fallbackMessage quando JSON não tem campo error', async () => {
    const res = makeResponse({ unrelated: 'field' });
    const result = await parseApiError(res, 'Fallback padrão');
    expect(result.message).toBe('Fallback padrão');
    expect(result.code).toBeNull();
  });

  it('code é null quando JSON não tem code', async () => {
    const res = makeResponse({ error: 'Erro sem code' });
    const result = await parseApiError(res);
    expect(result.message).toBe('Erro sem code');
    expect(result.code).toBeNull();
  });

  it('extrai mensagem de response texto puro (não-JSON)', async () => {
    const res = makeResponse('Token inválido.', { headers: { 'Content-Type': 'text/plain' } });
    const result = await parseApiError(res);
    expect(result.message).toBe('Token inválido.');
    expect(result.code).toBeNull();
  });

  it('usa fallback quando texto é vazio', async () => {
    const res = makeResponse('', { headers: { 'Content-Type': 'text/plain' } });
    const result = await parseApiError(res, 'Fallback');
    expect(result.message).toBe('Fallback');
  });

  it('usa fallback quando response.json() lança (corpo inválido)', async () => {
    // Response com Content-Type JSON mas corpo não-JSON
    const res = new Response('not-json', {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await parseApiError(res, 'Erro genérico');
    expect(result.message).toBe('Erro genérico');
    expect(result.code).toBeNull();
  });

  it('lida com Content-Type ausente', async () => {
    const res = new Response('plain text', {
      status: 400,
      headers: {},
    });
    const result = await parseApiError(res, 'Fallback');
    // Sem Content-Type, tenta text() e retorna
    expect(result.message).toBeTruthy();
  });
});

describe('statusFallbackMessage', () => {
  it('400 → mensagem de dados inválidos', () => {
    const msg = statusFallbackMessage(400);
    expect(msg).toMatch(/inválido/i);
  });

  it('401 → mensagem de email/senha incorretos', () => {
    const msg = statusFallbackMessage(401);
    expect(msg).toMatch(/email|senha/i);
  });

  it('403 → mensagem de acesso negado', () => {
    const msg = statusFallbackMessage(403);
    expect(msg).toMatch(/negado|acesso/i);
  });

  it('404 → mensagem de recurso não encontrado', () => {
    const msg = statusFallbackMessage(404);
    expect(msg).toMatch(/não encontrado/i);
  });

  it('429 → mensagem de muitas tentativas', () => {
    const msg = statusFallbackMessage(429);
    expect(msg).toMatch(/tentativas|aguarde/i);
  });

  it('500 → mensagem de erro interno', () => {
    const msg = statusFallbackMessage(500);
    expect(msg).toMatch(/interno|servidor/i);
  });

  it('status desconhecido → mensagem genérica', () => {
    const msg = statusFallbackMessage(418); // I'm a teapot
    expect(msg).toMatch(/não foi possível/i);
  });

  it('status 0 → mensagem genérica', () => {
    const msg = statusFallbackMessage(0);
    expect(msg).toMatch(/não foi possível/i);
  });
});

describe('isNetworkError', () => {
  it('true para TypeError (falha de rede)', () => {
    const err = new TypeError('Failed to fetch');
    expect(isNetworkError(err)).toBe(true);
  });

  it('false para Error genérico', () => {
    const err = new Error('Something went wrong');
    expect(isNetworkError(err)).toBe(false);
  });

  it('false para string', () => {
    expect(isNetworkError('network error')).toBe(false);
  });

  it('false para objeto que não é TypeError', () => {
    const err = { message: 'Failed to fetch', name: 'NetworkError' };
    expect(isNetworkError(err)).toBe(false);
  });

  it('true para TypeError sem mensagem', () => {
    const err = new TypeError();
    expect(isNetworkError(err)).toBe(true);
  });

  it('false para null/undefined', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});
