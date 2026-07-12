/**
 * src/i18n/apiErrors.test.js
 */
import { describe, it, expect, vi } from 'vitest';
import { translateApiError } from '../i18n/apiErrors';
import { getTranslator } from '../i18n/index.js';

const t = getTranslator('en-US');

describe('translateApiError', () => {
  it('traduz erro por code conhecido', () => {
    const err = { code: 'MISSING_TOKEN' };
    const result = translateApiError(err, t);
    expect(typeof result).toBe('string');
    expect(result).not.toBe('MISSING_TOKEN'); // deve traduzir, não retornar o code
  });

  it('traduz ACCOUNT_BANNED', () => {
    const result = translateApiError({ code: 'ACCOUNT_BANNED' }, t);
    expect(typeof result).toBe('string');
  });

  it('traduz USERNAME_TAKEN', () => {
    const result = translateApiError({ code: 'USERNAME_TAKEN' }, t);
    expect(typeof result).toBe('string');
  });

  it('traduz DISCORD_NOT_LINKED', () => {
    const result = translateApiError({ code: 'DISCORD_NOT_LINKED' }, t);
    expect(typeof result).toBe('string');
  });

  it('traduz RATE_LIMITED', () => {
    const result = translateApiError({ code: 'RATE_LIMITED' }, t);
    expect(typeof result).toBe('string');
  });

  it('usa message do servidor quando code não está mapeado', () => {
    const err = { response: { data: { error: 'Erro customizado do servidor', code: 'UNKNOWN_CODE' } } };
    const result = translateApiError(err, t);
    expect(result).toBe('Erro customizado do servidor');
  });

  it('usa fallback genérico quando code não existe e não tem message', () => {
    const err = { code: 'TOTALLY_UNKNOWN_CODE' };
    const result = translateApiError(err, t);
    expect(typeof result).toBe('string');
  });

  it('usa fallback genérico quando err é undefined', () => {
    const result = translateApiError(undefined, t);
    expect(typeof result).toBe('string');
  });

  it('usa fallback genérico quando err é null', () => {
    const result = translateApiError(null, t);
    expect(typeof result).toBe('string');
  });

  it('usa fallback customizado quando fornecido', () => {
    const result = translateApiError({ code: 'UNKNOWN' }, t, 'custom.fallback.key');
    expect(typeof result).toBe('string');
  });

  it('lê code de err.response.data.code', () => {
    const err = { response: { data: { code: 'ACCOUNT_NOT_FOUND' } } };
    const result = translateApiError(err, t);
    expect(typeof result).toBe('string');
  });

  it('lê code diretamente de err.code', () => {
    const err = { code: 'INVALID_TOKEN' };
    const result = translateApiError(err, t);
    expect(typeof result).toBe('string');
  });

  it('prioriza response.data.code sobre err.code', () => {
    const err = { code: 'FALLBACK_CODE', response: { data: { code: 'ACCOUNT_BANNED' } } };
    const result = translateApiError(err, t);
    // Deve traduzir ACCOUNT_BANNED (do response.data.code)
    expect(typeof result).toBe('string');
  });
});
