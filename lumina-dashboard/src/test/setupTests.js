/**
 * src/test/setupTests.js
 *
 * Setup global executado antes de cada arquivo de teste do Vitest.
 *
 * Aplica:
 *   - @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 *   - Mock de matchMedia (usado por Headless UI)
 *   - Mock de IntersectionObserver (usado por componentes de scroll infinito)
 *   - Mock de scrollTo (jsdom não implementa)
 *   - Limpa localStorage/sessionStorage entre testes
 *   - Mock de import.meta.env (VITE_API_BASE_URL)
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// ─── Match media (Headless UI usa para breakpoints) ────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// ─── IntersectionObserver ──────────────────────────────────────────────────
class MockIntersectionObserver {
  constructor(callback) { this.callback = callback; }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
window.IntersectionObserver = MockIntersectionObserver;
global.IntersectionObserver = MockIntersectionObserver;

// ─── scrollTo (jsdom não implementa) ───────────────────────────────────────
window.scrollTo = vi.fn();
window.scroll = vi.fn();

// ─── ResizeObserver ────────────────────────────────────────────────────────
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = MockResizeObserver;
global.ResizeObserver = MockResizeObserver;

// ─── import.meta.env (garante VITE_API_BASE_URL consistente em testes) ─────
// Vitest já carrega .env se existir, mas garantimos um fallback.
if (!import.meta.env.VITE_API_BASE_URL) {
  import.meta.env.VITE_API_BASE_URL = 'http://localhost:3000/';
}

// ─── Limpa entre testes ────────────────────────────────────────────────────
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Limpa localStorage e sessionStorage
  window.localStorage.clear();
  window.sessionStorage.clear();
  // Reseta window.location para não vazar estado entre testes
  window.history.replaceState({}, '', '/');
});
