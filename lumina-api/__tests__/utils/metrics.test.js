/**
 * __tests__/utils/metrics.test.js
 *
 * Suite para src/logger/metrics.js
 *
 * Testa:
 *   - recordRequest: contagem por rota, status codes, duração
 *   - recordError: buffer circular (MAX_RECENT_ERRORS)
 *   - getSnapshot: uptime, totalRequests, errorRate, routes, recentErrors
 *   - _resetForTests: reseta estado entre suítes
 */

'use strict';

const metrics = require('../../src/logger/metrics');

beforeAll(() => {
    process.env.NODE_ENV = 'test';
});

beforeEach(() => {
    metrics._resetForTests();
});

afterEach(() => {
    metrics._resetForTests();
});

describe('MAX_RECENT_ERRORS', () => {
    it('é 50', () => {
        expect(metrics.MAX_RECENT_ERRORS).toBe(50);
    });
});

describe('recordRequest', () => {
    it('incrementa totalRequests', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/test', status: 200, durationMs: 10 });
        const snap = metrics.getSnapshot();
        expect(snap.totalRequests).toBe(1);
    });

    it('cria entrada para nova rota', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/new', status: 200, durationMs: 5 });
        const snap = metrics.getSnapshot();
        expect(snap.routes).toHaveProperty('GET /new');
        expect(snap.routes['GET /new'].count).toBe(1);
    });

    it('incrementa contador de rota existente', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/x', status: 200, durationMs: 5 });
        metrics.recordRequest({ id: '2', method: 'GET', routePattern: '/x', status: 200, durationMs: 10 });
        const snap = metrics.getSnapshot();
        expect(snap.routes['GET /x'].count).toBe(2);
    });

    it('acumula duração total para avgDurationMs', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/x', status: 200, durationMs: 10 });
        metrics.recordRequest({ id: '2', method: 'GET', routePattern: '/x', status: 200, durationMs: 30 });
        const snap = metrics.getSnapshot();
        expect(snap.routes['GET /x'].avgDurationMs).toBe(20); // (10+30)/2
    });

    it('rastreia status codes por rota', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/x', status: 200, durationMs: 5 });
        metrics.recordRequest({ id: '2', method: 'GET', routePattern: '/x', status: 404, durationMs: 5 });
        metrics.recordRequest({ id: '3', method: 'GET', routePattern: '/x', status: 500, durationMs: 5 });
        const snap = metrics.getSnapshot();
        expect(snap.routes['GET /x'].statusCodes[200]).toBe(1);
        expect(snap.routes['GET /x'].statusCodes[404]).toBe(1);
        expect(snap.routes['GET /x'].statusCodes[500]).toBe(1);
    });

    it('incrementa errorCount para status >= 500', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/x', status: 500, durationMs: 5 });
        const snap = metrics.getSnapshot();
        expect(snap.routes['GET /x'].errorCount).toBe(1);
        expect(snap.totalErrors).toBe(1);
    });

    it('NÃO incrementa errorCount para status 4xx', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/x', status: 404, durationMs: 5 });
        const snap = metrics.getSnapshot();
        expect(snap.routes['GET /x'].errorCount).toBe(0);
        expect(snap.totalErrors).toBe(0);
    });

    it('atualiza lastCalledAt', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/x', status: 200, durationMs: 5 });
        const snap = metrics.getSnapshot();
        expect(snap.routes['GET /x'].lastCalledAt).toBeTruthy();
    });

    it('diferencia por método (GET /x != POST /x)', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/x', status: 200, durationMs: 5 });
        metrics.recordRequest({ id: '2', method: 'POST', routePattern: '/x', status: 200, durationMs: 5 });
        const snap = metrics.getSnapshot();
        expect(snap.routes).toHaveProperty('GET /x');
        expect(snap.routes).toHaveProperty('POST /x');
    });

    it('default method é GET quando não especificado', () => {
        metrics.recordRequest({ id: '1', routePattern: '/x', status: 200, durationMs: 5 });
        const snap = metrics.getSnapshot();
        expect(snap.routes).toHaveProperty('GET /x');
    });
});

describe('recordError', () => {
    it('adiciona erro ao buffer', () => {
        metrics.recordError({ id: '1', route: '/x', method: 'GET', status: 500, message: 'boom' });
        const snap = metrics.getSnapshot();
        expect(snap.recentErrors).toHaveLength(1);
        expect(snap.recentErrors[0].message).toBe('boom');
    });

    it('limita buffer a MAX_RECENT_ERRORS (50)', () => {
        for (let i = 0; i < 100; i++) {
            metrics.recordError({ id: String(i), route: '/x', method: 'GET', status: 500, message: `err-${i}` });
        }
        const snap = metrics.getSnapshot();
        expect(snap.recentErrors).toHaveLength(50);
    });

    it('ordena recentErrors mais recente primeiro', () => {
        metrics.recordError({ id: '1', route: '/x', method: 'GET', status: 500, message: 'first' });
        metrics.recordError({ id: '2', route: '/x', method: 'GET', status: 500, message: 'second' });
        const snap = metrics.getSnapshot();
        expect(snap.recentErrors[0].message).toBe('second');
        expect(snap.recentErrors[1].message).toBe('first');
    });

    it('trunca mensagem para 500 chars', () => {
        const longMsg = 'x'.repeat(1000);
        metrics.recordError({ id: '1', route: '/x', method: 'GET', status: 500, message: longMsg });
        const snap = metrics.getSnapshot();
        expect(snap.recentErrors[0].message.length).toBe(500);
    });

    it('lida com message undefined', () => {
        metrics.recordError({ id: '1', route: '/x', method: 'GET', status: 500 });
        const snap = metrics.getSnapshot();
        expect(snap.recentErrors[0].message).toBe('');
    });
});

describe('getSnapshot', () => {
    it('retorna uptimeSeconds > 0', () => {
        const snap = metrics.getSnapshot();
        expect(snap.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('retorna memory = process.memoryUsage()', () => {
        const snap = metrics.getSnapshot();
        expect(snap.memory).toBeDefined();
        expect(snap.memory).toHaveProperty('rss');
        expect(snap.memory).toHaveProperty('heapTotal');
        expect(snap.memory).toHaveProperty('heapUsed');
    });

    it('errorRate é 0 quando não há requests', () => {
        const snap = metrics.getSnapshot();
        expect(snap.errorRate).toBe(0);
    });

    it('errorRate calculado corretamente', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/x', status: 200, durationMs: 5 });
        metrics.recordRequest({ id: '2', method: 'GET', routePattern: '/x', status: 500, durationMs: 5 });
        const snap = metrics.getSnapshot();
        expect(snap.errorRate).toBe(50); // 1/2 = 50%
    });

    it('retorna cópias (não referências) de routes e recentErrors', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/x', status: 200, durationMs: 5 });
        const snap1 = metrics.getSnapshot();
        const snap2 = metrics.getSnapshot();
        expect(snap1.routes).toEqual(snap2.routes);
        expect(snap1.routes).not.toBe(snap2.routes);
    });
});

describe('_resetForTests', () => {
    it('reseta totalRequests para 0', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/x', status: 200, durationMs: 5 });
        metrics._resetForTests();
        const snap = metrics.getSnapshot();
        expect(snap.totalRequests).toBe(0);
    });

    it('limpa routes', () => {
        metrics.recordRequest({ id: '1', method: 'GET', routePattern: '/x', status: 200, durationMs: 5 });
        metrics._resetForTests();
        const snap = metrics.getSnapshot();
        expect(Object.keys(snap.routes)).toHaveLength(0);
    });

    it('limpa recentErrors', () => {
        metrics.recordError({ id: '1', route: '/x', method: 'GET', status: 500, message: 'x' });
        metrics._resetForTests();
        const snap = metrics.getSnapshot();
        expect(snap.recentErrors).toHaveLength(0);
    });
});
