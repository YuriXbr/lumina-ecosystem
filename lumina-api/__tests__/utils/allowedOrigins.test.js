/**
 * __tests__/utils/allowedOrigins.test.js
 *
 * Suite para src/config/allowedOrigins.js
 */

'use strict';

const { isAllowedOrigin, getAllowedOrigins, ALLOWED_ORIGINS } = require('../../src/config/allowedOrigins');

beforeAll(() => {
    process.env.NODE_ENV = 'test';
});

describe('ALLOWED_ORIGINS', () => {
    it('é um array não-vazio', () => {
        expect(Array.isArray(ALLOWED_ORIGINS)).toBe(true);
        expect(ALLOWED_ORIGINS.length).toBeGreaterThan(0);
    });

    it('inclui origens de produção', () => {
        expect(ALLOWED_ORIGINS).toContain('https://luminasink.me');
        expect(ALLOWED_ORIGINS).toContain('https://www.luminasink.me');
    });

    it('inclui origens de desenvolvimento', () => {
        expect(ALLOWED_ORIGINS).toContain('http://localhost:3000');
        expect(ALLOWED_ORIGINS).toContain('http://localhost:5173');
    });
});

describe('isAllowedOrigin', () => {
    it('true para https://luminasink.me', () => {
        expect(isAllowedOrigin('https://luminasink.me')).toBe(true);
    });

    it('true para https://www.luminasink.me', () => {
        expect(isAllowedOrigin('https://www.luminasink.me')).toBe(true);
    });

    it('true para https://bot.luminasink.com', () => {
        expect(isAllowedOrigin('https://bot.luminasink.com')).toBe(true);
    });

    it('true para http://localhost:3000', () => {
        expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    });

    it('true para http://localhost:5173', () => {
        expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    });

    it('true para http://127.0.0.1:3000', () => {
        expect(isAllowedOrigin('http://127.0.0.1:3000')).toBe(true);
    });

    it('true para http://127.0.0.1:5173', () => {
        expect(isAllowedOrigin('http://127.0.0.1:5173')).toBe(true);
    });

    it('true para https://lumina-api-tau.vercel.app', () => {
        expect(isAllowedOrigin('https://lumina-api-tau.vercel.app')).toBe(true);
    });

    it('false para https://evil.com', () => {
        expect(isAllowedOrigin('https://evil.com')).toBe(false);
    });

    it('false para https://luminasink.me.evil.com (subdomain spoofing)', () => {
        expect(isAllowedOrigin('https://luminasink.me.evil.com')).toBe(false);
    });

    it('false para string vazia', () => {
        expect(isAllowedOrigin('')).toBe(false);
    });

    it('false para null', () => {
        expect(isAllowedOrigin(null)).toBe(false);
    });

    it('false para undefined', () => {
        expect(isAllowedOrigin(undefined)).toBe(false);
    });

    it('false para origin sem protocolo', () => {
        expect(isAllowedOrigin('luminasink.me')).toBe(false);
    });

    // ─── Vercel preview (apenas em não-produção) ─────────────────────────
    it('true para Vercel preview em NODE_ENV=test', () => {
        expect(isAllowedOrigin('https://my-branch-yurixbrs-projects.vercel.app')).toBe(true);
    });

    it('false para Vercel preview com formato errado', () => {
        expect(isAllowedOrigin('https://evil.vercel.app')).toBe(false);
    });

    it('false para Vercel preview com subdomínio malicioso', () => {
        expect(isAllowedOrigin('https://evil-yurixbrs-projects.vercel.app.evil.com')).toBe(false);
    });
});

describe('getAllowedOrigins', () => {
    it('retorna uma cópia do array (não a referência)', () => {
        const list1 = getAllowedOrigins();
        const list2 = getAllowedOrigins();
        expect(list1).toEqual(list2);
        expect(list1).not.toBe(list2); // referências diferentes

        // Modificar list1 não deve afetar list2
        list1.push('https://evil.com');
        expect(list2).not.toContain('https://evil.com');
    });
});

// ─── Em produção, Vercel previews são rejeitados ───────────────────────────
describe('Em NODE_ENV=production', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        process.env.NODE_ENV = 'production';
        // Limpa o cache do módulo para re-avaliar a função
        jest.resetModules();
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        jest.resetModules();
    });

    it('Vercel preview é rejeitado em produção', () => {
        const { isAllowedOrigin: prodIsAllowed } = require('../../src/config/allowedOrigins');
        expect(prodIsAllowed('https://my-branch-yurixbrs-projects.vercel.app')).toBe(false);
    });

    it('origens oficiais continuam aceitas em produção', () => {
        const { isAllowedOrigin: prodIsAllowed } = require('../../src/config/allowedOrigins');
        expect(prodIsAllowed('https://luminasink.me')).toBe(true);
    });
});
