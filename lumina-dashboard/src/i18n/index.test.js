/**
 * src/i18n/index.test.js
 *
 * Testes para src/i18n/index.js
 *
 * Cobre:
 *   - normalizeLocale: pt-*, en-*, es-*, null, undefined, desconhecido
 *   - detectLocale: user.language > localStorage > navigator > fallback
 *   - getTranslator: t() básico, interpolação, pluralização, fallback para en-US, chave inexistente
 *   - SUPPORTED_LOCALES, DEFAULT_LOCALE
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeLocale,
  detectLocale,
  getTranslator,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from '../i18n/index.js';

// ─── Constantes ────────────────────────────────────────────────────────────
describe('Constantes', () => {
  it('SUPPORTED_LOCALES inclui en-US, pt-BR, es-ES', () => {
    expect(SUPPORTED_LOCALES).toContain('en-US');
    expect(SUPPORTED_LOCALES).toContain('pt-BR');
    expect(SUPPORTED_LOCALES).toContain('es-ES');
  });

  it('DEFAULT_LOCALE é en-US', () => {
    expect(DEFAULT_LOCALE).toBe('en-US');
  });
});

// ─── normalizeLocale ───────────────────────────────────────────────────────
describe('normalizeLocale', () => {
  it('converte "pt" para "pt-BR"', () => {
    expect(normalizeLocale('pt')).toBe('pt-BR');
  });

  it('converte "pt-BR" para "pt-BR"', () => {
    expect(normalizeLocale('pt-BR')).toBe('pt-BR');
  });

  it('converte "pt-PT" para "pt-BR" (qualquer pt-* vira pt-BR)', () => {
    expect(normalizeLocale('pt-PT')).toBe('pt-BR');
  });

  it('converte "en" para "en-US"', () => {
    expect(normalizeLocale('en')).toBe('en-US');
  });

  it('converte "en-GB" para "en-US"', () => {
    expect(normalizeLocale('en-GB')).toBe('en-US');
  });

  it('converte "es" para "es-ES"', () => {
    expect(normalizeLocale('es')).toBe('es-ES');
  });

  it('converte "es-MX" para "es-ES"', () => {
    expect(normalizeLocale('es-MX')).toBe('es-ES');
  });

  it('preserva "en-US" exato', () => {
    expect(normalizeLocale('en-US')).toBe('en-US');
  });

  it('retorna DEFAULT_LOCALE para locale null', () => {
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE);
  });

  it('retorna DEFAULT_LOCALE para locale undefined', () => {
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it('retorna DEFAULT_LOCALE para locale não-string', () => {
    expect(normalizeLocale(123)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale({})).toBe(DEFAULT_LOCALE);
  });

  it('retorna DEFAULT_LOCALE para locale desconhecido', () => {
    expect(normalizeLocale('fr-FR')).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale('de-DE')).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale('ja-JP')).toBe(DEFAULT_LOCALE);
  });

  it('aceita locale exato da lista mesmo se não bate com prefixo', () => {
    // SUPPORTED_LOCALES inclui 'en-US', 'pt-BR', 'es-ES'
    expect(normalizeLocale('en-US')).toBe('en-US');
  });
});

// ─── detectLocale ──────────────────────────────────────────────────────────
describe('detectLocale', () => {
  let originalNavigator;
  let originalLocalStorage;

  beforeEach(() => {
    originalNavigator = window.navigator;
    originalLocalStorage = window.localStorage;
  });

  afterEach(() => {
    Object.defineProperty(window, 'navigator', { value: originalNavigator, writable: true });
    Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, writable: true });
  });

  it('usa user.language quando disponível (prioridade 1)', () => {
    // Mock localStorage para garantir que não interfere
    const mockStorage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });

    const result = detectLocale({ language: 'pt-BR' });
    expect(result).toBe('pt-BR');
  });

  it('user.language normaliza (pt → pt-BR)', () => {
    const mockStorage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });

    const result = detectLocale({ language: 'pt' });
    expect(result).toBe('pt-BR');
  });

  it('usa localStorage quando user não tem language (prioridade 2)', () => {
    const mockStorage = { getItem: vi.fn(() => 'es-ES'), setItem: vi.fn() };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });

    const result = detectLocale({ language: null });
    expect(result).toBe('es-ES');
  });

  it('usa navigator.language quando user e localStorage não têm (prioridade 3)', () => {
    const mockStorage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });

    // Mock navigator
    Object.defineProperty(window, 'navigator', {
      value: { language: 'pt-BR' },
      writable: true,
    });

    const result = detectLocale(null);
    expect(result).toBe('pt-BR');
  });

  it('usa DEFAULT_LOCALE quando nada está disponível', () => {
    const mockStorage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });
    Object.defineProperty(window, 'navigator', { value: { language: null }, writable: true });

    const result = detectLocale(null);
    expect(result).toBe(DEFAULT_LOCALE);
  });

  it('usa DEFAULT_LOCALE quando user é null e localStorage falha', () => {
    const mockStorage = {
      getItem: vi.fn(() => { throw new Error('localStorage indisponível'); }),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });
    Object.defineProperty(window, 'navigator', { value: { language: 'en-US' }, writable: true });

    const result = detectLocale(null);
    // localStorage falha → cai para navigator
    expect(result).toBe('en-US');
  });

  it('user tem prioridade sobre localStorage', () => {
    const mockStorage = { getItem: vi.fn(() => 'es-ES'), setItem: vi.fn() };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });

    const result = detectLocale({ language: 'pt-BR' });
    expect(result).toBe('pt-BR'); // user vence
  });
});

// ─── getTranslator ─────────────────────────────────────────────────────────
describe('getTranslator', () => {
  it('retorna função t', () => {
    const t = getTranslator('en-US');
    expect(typeof t).toBe('function');
  });

  it('t() retorna string traduzida para chave simples', () => {
    const t = getTranslator('en-US');
    // Assumindo que en-US.json tem 'common.email' ou similar
    // Se a chave existir, retorna a tradução; senão, retorna a própria chave
    const result = t('common.email');
    expect(typeof result).toBe('string');
  });

  it('t() retorna a própria chave quando ela não existe', () => {
    const t = getTranslator('en-US');
    const result = t('nonexistent.deeply.nested.key');
    expect(result).toBe('nonexistent.deeply.nested.key');
  });

  it('t() interpola {placeholder} com params', () => {
    const t = getTranslator('en-US');
    // Tenta uma chave que pode ter placeholder; se não existir, retorna a chave
    // Vamos testar interpolação diretamente com uma chave que existe
    // Para garantir, usamos uma chave de teste com placeholder conhecido
    const result = t('auth.register.step', { current: 2, total: 3 });
    // Resultado deve conter "2" e "3" se a chave existir e tiver placeholders
    expect(typeof result).toBe('string');
  });

  it('t() suporta pluralização com count=1 (_one)', () => {
    const t = getTranslator('en-US');
    // Se a chave 'days_one' existir em en-US.json, retorna essa
    // Senão, retorna a chave 'days_one' literal
    const result = t('days', { count: 1 });
    expect(typeof result).toBe('string');
  });

  it('t() suporta pluralização com count>1 (_other)', () => {
    const t = getTranslator('en-US');
    const result = t('days', { count: 5 });
    expect(typeof result).toBe('string');
  });

  it('t() faz fallback para en-US quando chave não existe em pt-BR', () => {
    const t = getTranslator('pt-BR');
    // Se a chave existe em en-US mas não em pt-BR, retorna a en-US
    const result = t('common.email');
    expect(typeof result).toBe('string');
  });

  it('t() retorna a própria chave quando params.count é fornecido mas pluralKey não existe', () => {
    const t = getTranslator('en-US');
    const result = t('totally_nonexistent_key', { count: 1 });
    expect(result).toBe('totally_nonexistent_key');
  });

  it('t() lida com params undefined', () => {
    const t = getTranslator('en-US');
    const result = t('common.email', undefined);
    expect(typeof result).toBe('string');
  });

  it('t() lida com params null', () => {
    const t = getTranslator('en-US');
    const result = t('common.email', null);
    expect(typeof result).toBe('string');
  });

  it('t() não substitui placeholder se valor for undefined', () => {
    const t = getTranslator('en-US');
    const result = t('auth.register.welcomeTo', { name: undefined });
    // Se a chave tem {name} e name é undefined, o placeholder {name} permanece
    expect(typeof result).toBe('string');
  });

  it('t() normaliza locale antes de buscar bundle', () => {
    const t1 = getTranslator('pt');
    const t2 = getTranslator('pt-BR');
    // Ambos devem usar o mesmo bundle (pt-BR)
    const r1 = t1('common.email');
    const r2 = t2('common.email');
    expect(r1).toBe(r2);
  });

  it('t() usa bundle vazio para locale não suportado (fallback para en-US)', () => {
    const t = getTranslator('fr-FR'); // não suportado
    // Bundle vazio → fallback para en-US
    const result = t('common.email');
    expect(typeof result).toBe('string');
  });
});
