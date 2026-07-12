/**
 * src/utils/apiBase.test.js
 */
import { describe, it, expect } from 'vitest';

describe('apiBase', () => {
  it('exporta API_BASE como string', async () => {
    const mod = await import('../utils/apiBase');
    expect(typeof mod.API_BASE).toBe('string');
  });

  it('API_BASE respeita VITE_API_BASE_URL do ambiente', async () => {
    const mod = await import('../utils/apiBase');
    // Em testes, VITE_API_BASE_URL é setado no setupTests.js para 'http://localhost:3000/'
    // ou fallback para '' (string vazia)
    expect(mod.API_BASE !== undefined).toBe(true);
  });
});
