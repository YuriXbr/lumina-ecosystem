/**
 * src/logger/metrics.js
 *
 * Coleta leve, em memória, de métricas de uso das rotas: contagem de
 * requisições, status codes, tempo de resposta e erros por rota.
 *
 * Objetivo: dar visibilidade (rastreabilidade) de uso/erros da API sem
 * depender de um serviço externo de observabilidade. Pensado para ser
 * exposto via uma rota administrativa protegida (ver admin/getMetrics.js).
 *
 * Cuidado de memória: o número de rotas é finito e conhecido em build-time
 * (definido pelos arquivos em src/routes), então o Map de métricas por rota
 * tem tamanho limitado e não cresce sem controle. Já o log de "últimos erros"
 * é limitado por MAX_RECENT_ERRORS para nunca crescer indefinidamente (evita
 * pressão desnecessária no garbage collector em processos de longa duração).
 */

const MAX_RECENT_ERRORS = 50;

const startedAt = Date.now();

/** @type {Map<string, { count: number, errorCount: number, totalDurationMs: number, statusCodes: Record<string, number>, lastCalledAt: number|null }>} */
const routeStats = new Map();

/** @type {Array<{ id: string, route: string, method: string, status: number, message: string, at: string }>} */
const recentErrors = [];

let totalRequests = 0;
let totalErrors = 0;

function keyFor(method, routePattern) {
    return `${(method || 'GET').toUpperCase()} ${routePattern}`;
}

function recordRequest({ id, method, routePattern, status, durationMs }) {
    totalRequests += 1;

    const key = keyFor(method, routePattern);
    let stats = routeStats.get(key);
    if (!stats) {
        stats = { count: 0, errorCount: 0, totalDurationMs: 0, statusCodes: {}, lastCalledAt: null };
        routeStats.set(key, stats);
    }

    stats.count += 1;
    stats.totalDurationMs += durationMs;
    stats.lastCalledAt = new Date().toISOString();
    stats.statusCodes[status] = (stats.statusCodes[status] || 0) + 1;

    if (status >= 500) {
        stats.errorCount += 1;
        totalErrors += 1;
    }
}

function recordError({ id, route, method, status, message }) {
    recentErrors.push({
        id, route, method, status,
        message: String(message || '').slice(0, 500),
        at: new Date().toISOString(),
    });
    // Mantém o buffer limitado — remove os mais antigos quando excede o teto.
    while (recentErrors.length > MAX_RECENT_ERRORS) {
        recentErrors.shift();
    }
}

function getSnapshot() {
    const routes = {};
    for (const [key, stats] of routeStats.entries()) {
        routes[key] = {
            count: stats.count,
            errorCount: stats.errorCount,
            avgDurationMs: stats.count ? Math.round((stats.totalDurationMs / stats.count) * 100) / 100 : 0,
            statusCodes: stats.statusCodes,
            lastCalledAt: stats.lastCalledAt,
        };
    }

    return {
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        totalRequests,
        totalErrors,
        errorRate: totalRequests ? Math.round((totalErrors / totalRequests) * 10000) / 100 : 0,
        routes,
        recentErrors: [...recentErrors].reverse(), // mais recente primeiro
        memory: process.memoryUsage(),
    };
}

/** Usado apenas em testes, para isolar cada suíte. */
function _resetForTests() {
    routeStats.clear();
    recentErrors.length = 0;
    totalRequests = 0;
    totalErrors = 0;
}

module.exports = { recordRequest, recordError, getSnapshot, _resetForTests, MAX_RECENT_ERRORS };
