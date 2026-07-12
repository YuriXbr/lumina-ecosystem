/**
 *
 * Middleware de rate limiting por IP por rota, com backoff exponencial entre
 * bloqueios. Totalmente serverless-safe: o estado é persistido no MongoDB,
 * sem nenhuma memória de processo.
 *
 * ─── Comportamento ───────────────────────────────────────────────────────────
 * Cada combinação (IP, rota) tem sua própria janela de tempo e contador.
 * Quando o limite de requisições da janela é atingido:
 *   - O IP é bloqueado por BASE_BLOCK_MS × 2^(blockCount - 1)
 *   - blockCount aumenta a cada bloqueio
 *   - O bloqueio máximo é 24h (após ~10 bloqueios com base de 60s)
 *
 * Durante um bloqueio, cada nova tentativa retorna 429 com headers:
 *   Retry-After: <segundos restantes>
 *   X-RateLimit-Reset: <timestamp ISO>
 *
 * ─── Uso nas rotas ───────────────────────────────────────────────────────────
 * Em qualquer arquivo de rota:
 *   const { ipRateLimiter } = require('../../../utils/ipRateLimiter');
 *
 *   module.exports = {
 *     route: '/expapi/internal/fetchinventory',
 *     rateLimiter: ipRateLimiter({ max: 60, windowMs: 60_000 }),
 *     // ...
 *   };
 *
 * O index.js verifica se `route.rateLimiter` existe e o adiciona como
 * middleware antes do execute().
 */

'use strict';

const DatabaseService = require('../database/services/DataBaseService');
const { mongoSchema } = require('../database/schema');

// ─── Constantes de backoff ────────────────────────────────────────────────────
const BASE_BLOCK_MS  = 60 * 1000;          // 1 minuto (primeiro bloqueio)
const MAX_BLOCK_MS   = 24 * 60 * 60 * 1000; // 24 horas (máximo)
// CORREÇÃO #2: removido MAX_BLOCKS_CAP — era a causa do bug onde a duração
// nunca atingia 24h. O cap agora é feito pelo Math.min(duration, MAX_BLOCK_MS)
// na função abaixo, que ativa quando 2^blockCount * BASE_BLOCK_MS >= 24h,
// ou seja, a partir de blockCount=11 (2^11=2048 min > 1440 min = 24h).

/**
 * Calcula a duração do próximo bloqueio com backoff exponencial.
 * blockCount = número de bloqueios JÁ sofridos (antes do novo).
 */
/**
 * CORREÇÃO #2: antes o exponent era capado em MAX_BLOCKS_CAP-1 (=9), o que
 * limitava a duração a 2^9 = 512 min = 8.5h, nunca atingindo 24h. Agora o
 * exponent cresce livremente e o cap é feito pelo Math.min(duration, MAX_BLOCK_MS),
 * garantindo que a duração atinge 24h a partir de blockCount=11.
 */
function calcBlockDuration(blockCount) {
    const exponent = Math.max(0, blockCount);
    return Math.min(BASE_BLOCK_MS * Math.pow(2, exponent), MAX_BLOCK_MS);
}

// ─── Service de acesso ao MongoDB ────────────────────────────────────────────
class IpRateLimitService extends DatabaseService {
    constructor() {
        super('ipRateLimits', mongoSchema.ipRateLimits);
        this._indexEnsured = false;
    }

    async _ensureIndexes() {
        if (this._indexEnsured) return;
        try {
            await this.connect();
            await this.model.collection.createIndex(
                { ip: 1, route: 1 },
                { unique: true, background: true }
            );
            // Limpeza automática de entradas inativas há 7 dias
            await this.model.collection.createIndex(
                { updatedAt: 1 },
                { expireAfterSeconds: 7 * 24 * 60 * 60, background: true }
            );
            this._indexEnsured = true;
        } catch (e) {
            console.error('[IpRateLimiter] Falha ao criar índices:', e.message);
        }
    }
}

const rateLimitService = new IpRateLimitService();

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {number} opts.max       - Número máximo de requisições por janela
 * @param {number} opts.windowMs  - Duração da janela em milissegundos
 * @returns {import('express').RequestHandler}
 */
function ipRateLimiter({ max = 60, windowMs = 60_000 } = {}) {
    return async function ipRateLimitMiddleware(req, res, next) {
        // Em ambiente de teste, nunca bloqueia (para não interferir nos testes).
        if (process.env.NODE_ENV === 'test') return next();

        const ip    = req.ip || req.connection?.remoteAddress || 'unknown';
        // Normaliza a rota para usar o padrão Express quando disponível
        const route = (req.route && req.route.path) || req.path || req.originalUrl.split('?')[0];

        try {
            await rateLimitService._ensureIndexes();

            const now       = new Date();
            const windowEnd = new Date(now.getTime() + windowMs);

            // Busca ou cria o registro do IP para essa rota
            let record = await rateLimitService.model.findOne({ ip, route }).lean();

            // ── Verificar bloqueio ativo ────────────────────────────────────
            if (record?.blockedUntil && record.blockedUntil > now) {
                const retryAfterSec = Math.ceil((record.blockedUntil - now) / 1000);
                res.setHeader('Retry-After', retryAfterSec);
                res.setHeader('X-RateLimit-Limit', max);
                res.setHeader('X-RateLimit-Remaining', '0');
                res.setHeader('X-RateLimit-Reset', record.blockedUntil.toISOString());

                return res.status(429).json({
                    error:   'Muitas requisições. Tente novamente mais tarde.',
                    code:    'RATE_LIMIT_BLOCKED',
                    retryAfterSeconds: retryAfterSec,
                    blockedUntil: record.blockedUntil.toISOString(),
                    blockCount:   record.blockCount,
                });
            }

            // ── Resetar janela expirada ─────────────────────────────────────
            const windowExpired = !record?.windowStart ||
                (now - new Date(record.windowStart)) > windowMs;

            if (windowExpired) {
                // Upsert: recria/reinicia a janela, preserva blockCount
                await rateLimitService.model.findOneAndUpdate(
                    { ip, route },
                    {
                        $set:      { windowStart: now, requestCount: 1, blockedUntil: null, updatedAt: now },
                        $setOnInsert: { blockCount: 0 },
                    },
                    { upsert: true, new: true }
                );
                res.setHeader('X-RateLimit-Limit', max);
                res.setHeader('X-RateLimit-Remaining', max - 1);
                return next();
            }

            // ── Verificar se excedeu o limite ───────────────────────────────
            const currentCount = (record?.requestCount || 0) + 1;

            if (currentCount > max) {
                // Novo bloqueio — calcula duração com backoff exponencial
                const currentBlockCount = (record?.blockCount || 0);
                const blockDuration     = calcBlockDuration(currentBlockCount);
                const blockedUntil      = new Date(now.getTime() + blockDuration);

                await rateLimitService.model.findOneAndUpdate(
                    { ip, route },
                    {
                        $set: { blockedUntil, updatedAt: now },
                        $inc: { blockCount: 1, requestCount: 1 },
                    },
                    { upsert: true }
                );

                const retryAfterSec = Math.ceil(blockDuration / 1000);
                res.setHeader('Retry-After', retryAfterSec);
                res.setHeader('X-RateLimit-Limit', max);
                res.setHeader('X-RateLimit-Remaining', '0');
                res.setHeader('X-RateLimit-Reset', blockedUntil.toISOString());

                // Loga o bloqueio para rastreabilidade
                try {
                    const LogService = require('../database/services/LogService');
                    await LogService.write({
                        level: 'ratelimit', type: 'RATE_LIMIT',
                        action: 'ip.blocked',
                        message: `IP ${ip} bloqueado em ${route} por ${retryAfterSec}s (bloqueio #${currentBlockCount + 1})`,
                        ip, route,
                        extra: { max, windowMs, blockCount: currentBlockCount + 1, blockDurationMs: blockDuration },
                    });
                } catch (_) { /* não bloquear se log falhar */ }

                return res.status(429).json({
                    error:   'Muitas requisições. Tente novamente mais tarde.',
                    code:    'RATE_LIMIT_EXCEEDED',
                    retryAfterSeconds: retryAfterSec,
                    blockedUntil: blockedUntil.toISOString(),
                    blockCount:   currentBlockCount + 1,
                });
            }

            // ── Incrementar contador normalmente ────────────────────────────
            await rateLimitService.model.findOneAndUpdate(
                { ip, route },
                { $inc: { requestCount: 1 }, $set: { updatedAt: now } },
                { upsert: true }
            );

            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', max - currentCount);
            next();

        } catch (error) {
            // Nunca deixa um erro de rate limiting derrubar a requisição
            console.error('[IpRateLimiter] Erro interno:', error.message);
            next();
        }
    };
}

module.exports = { ipRateLimiter, calcBlockDuration, BASE_BLOCK_MS, MAX_BLOCK_MS };
