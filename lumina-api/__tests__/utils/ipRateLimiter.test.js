/**
 * __tests__/utils/ipRateLimiter.test.js
 *
 * Suite para src/utils/ipRateLimiter.js
 *
 * Em NODE_ENV=test, o middleware é bypassado (retorna next() direto).
 * Testamos:
 *   - Bypass em test env
 *   - calcBlockDuration: backoff exponencial (2^n, cap 24h)
 *   - Constantes BASE_BLOCK_MS, MAX_BLOCK_MS
 */

'use strict';

const express = require('express');
const request = require('supertest');

const { ipRateLimiter, calcBlockDuration, BASE_BLOCK_MS, MAX_BLOCK_MS } = require('../../src/utils/ipRateLimiter');

beforeAll(() => {
    process.env.NODE_ENV = 'test';
});

// ─── Constantes ────────────────────────────────────────────────────────────
describe('Constantes', () => {
    it('BASE_BLOCK_MS é 1 minuto (60_000)', () => {
        expect(BASE_BLOCK_MS).toBe(60 * 1000);
    });

    it('MAX_BLOCK_MS é 24 horas', () => {
        expect(MAX_BLOCK_MS).toBe(24 * 60 * 60 * 1000);
    });
});

// ─── calcBlockDuration ─────────────────────────────────────────────────────
describe('calcBlockDuration', () => {
    it('blockCount=0 → 60s (BASE × 2^0)', () => {
        expect(calcBlockDuration(0)).toBe(60 * 1000);
    });

    it('blockCount=1 → 120s (BASE × 2^1)', () => {
        expect(calcBlockDuration(1)).toBe(2 * 60 * 1000);
    });

    it('blockCount=2 → 240s (BASE × 2^2)', () => {
        expect(calcBlockDuration(2)).toBe(4 * 60 * 1000);
    });

    it('blockCount=3 → 480s (BASE × 2^3)', () => {
        expect(calcBlockDuration(3)).toBe(8 * 60 * 1000);
    });

    it('blockCount=5 → 1920s (BASE × 2^5)', () => {
        expect(calcBlockDuration(5)).toBe(32 * 60 * 1000);
    });

    it('blockCount=9 → 512 min (BASE × 2^9)', () => {
        // exponent = max(0, 9) = 9; 2^9 = 512; 512 * 60000 = 30,720,000
        // Ainda abaixo de 24h (1,440 min), então Math.min não ativa
        expect(calcBlockDuration(9)).toBe(512 * 60 * 1000);
    });

    it('blockCount=10 → 1024 min (BASE × 2^10, ainda abaixo de 24h)', () => {
        // CORREÇÃO #2: antes do fix, o cap de exponent limitava a 512 min.
        // Agora 2^10 = 1024 min = 17h, ainda abaixo de 24h.
        expect(calcBlockDuration(10)).toBe(1024 * 60 * 1000);
    });

    it('blockCount=11 → 24h (MAX_BLOCK_MS — cap finalmente ativa)', () => {
        // CORREÇÃO #2: 2^11 = 2048 min = 34h, que excede 24h.
        // Math.min(2048*60000, MAX_BLOCK_MS) = MAX_BLOCK_MS = 24h.
        expect(calcBlockDuration(11)).toBe(MAX_BLOCK_MS);
    });

    it('blockCount=20 → 24h (cap)', () => {
        expect(calcBlockDuration(20)).toBe(MAX_BLOCK_MS);
    });

    it('blockCount=100 → 24h (cap)', () => {
        expect(calcBlockDuration(100)).toBe(MAX_BLOCK_MS);
    });

    it('blockCount=0 → 60s (BASE × 2^0)', () => {
        expect(calcBlockDuration(0)).toBe(60 * 1000);
    });

    it('blockCount negativo → 60s (Math.max(0, n) protege)', () => {
        // CORREÇÃO #2: Math.max(0, blockCount) evita 2^negativo = fração
        expect(calcBlockDuration(-5)).toBe(60 * 1000);
        expect(calcBlockDuration(-1)).toBe(60 * 1000);
    });
});

// ─── ipRateLimiter middleware ──────────────────────────────────────────────
describe('ipRateLimiter middleware', () => {
    it('em NODE_ENV=test, bypassa e chama next() direto', async () => {
        const app = express();
        app.use('/limited', ipRateLimiter({ max: 10, windowMs: 60_000 }));
        app.get('/limited', (req, res) => res.json({ ok: true }));

        // Mesmo chamando 100x, não deve rate limitar em test env
        for (let i = 0; i < 15; i++) {
            const res = await request(app).get('/limited');
            expect(res.status).toBe(200);
        }
    });

    it('aceita opções default (max=60, windowMs=60000)', () => {
        const middleware = ipRateLimiter();
        expect(typeof middleware).toBe('function');
    });

    it('aceita opções customizadas', () => {
        const middleware = ipRateLimiter({ max: 100, windowMs: 120000 });
        expect(typeof middleware).toBe('function');
    });
});

// ─── Em NODE_ENV != test, o middleware faria rate limiting ────────────────
// Nota: não testamos o comportamento real de rate limiting porque depende
// do MongoDB (MongoMock sería necessário). O comportamento real é testado
// em integração.
describe('Fora de test env (documentação)', () => {
    it('documenta que em production, o middleware faz rate limiting via MongoDB', () => {
        // Em NODE_ENV=production:
        // - Verifica IP+rota no MongoDB
        // - Se bloqueado, retorna 429 com Retry-After
        // - Se excedeu max, bloqueia com backoff exponencial
        // - Loga no LogService
        // Este teste é só documentação — comportamento real requer MongoDB.
        expect(typeof ipRateLimiter).toBe('function');
    });
});
