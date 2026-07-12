/**
 * vitest.config.js
 *
 * Configuração do Vitest para o Lumina Dashboard.
 *
 * - Ambiente: jsdom (para simular o browser)
 * - Setup: setupTests.js (aplica jest-dom matchers e mocks globais)
 * - Coverage: v8 provider, coleta apenas arquivos em src/
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setupTests.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/test/**',
        'src/locales/**',
        'src/pages/assets/**',
        'src/pages/**/assets/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
