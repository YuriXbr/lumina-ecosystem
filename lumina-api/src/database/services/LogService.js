/**
 * src/database/services/LogService.js
 *
 * Persiste entradas de log no MongoDB (coleção `apilogs`) com TTL de 30 dias
 * via índice { expiresAt: 1 }. Cada requisição, evento de negócio, erro ou
 * ação de segurança deve gerar uma entrada aqui — a rastreabilidade completa
 * depende disso.
 *
 * Serverless-safe: zero estado em memória. Cada invocação escreve diretamente
 * no MongoDB. Não há fila/buffer em memória — se o DB estiver indisponível,
 * a escrita do log falha silenciosamente (console.error) sem impactar a
 * resposta da rota.
 */

'use strict';

const DatabaseService = require('./DataBaseService');
const { mongoSchema }  = require('../schema');
const axios            = require('axios');

// ─── Configurações de nível e cor para Discord ───────────────────────────────
const LEVEL_META = {
    debug:    { color: 0x95a5a6, emoji: '🔍', minDiscord: false },
    info:     { color: 0x3498db, emoji: 'ℹ️',  minDiscord: false },
    warn:     { color: 0xf39c12, emoji: '⚠️',  minDiscord: true  },
    error:    { color: 0xe74c3c, emoji: '❌',  minDiscord: true  },
    critical: { color: 0x992d22, emoji: '🔥',  minDiscord: true  },
    security: { color: 0x8e44ad, emoji: '🔐',  minDiscord: true  },
    auth:     { color: 0x27ae60, emoji: '🔑',  minDiscord: false },
    gacha:    { color: 0xf1c40f, emoji: '🎰',  minDiscord: false },
    ratelimit:{ color: 0xe67e22, emoji: '🚫',  minDiscord: true  },
};

// ─── Rate limiting simples para o webhook Discord ────────────────────────────
// O Discord limita webhooks a ~30 req/min por URL. Quando a API gera muitos
// erros em sequência (ex: bug em loop), cada erro tenta enviar um embed,
// causando uma cascata de 429 que piora o problema.
//
// Solução: janela deslizante simples em memória.
// Em serverless, cada invocação começa com o contador zerado — isso é aceitável
// porque cada invocação já processa poucas requisições por definição.
const DISCORD_RATE_LIMIT_WINDOW_MS = 60_000; // 1 minuto
const DISCORD_RATE_LIMIT_MAX       = 20;      // máx 20 embeds por minuto (margem de segurança)
let _discordSendCount = 0;
let _discordWindowStart = Date.now();

function _canSendDiscord() {
    const now = Date.now();
    if (now - _discordWindowStart > DISCORD_RATE_LIMIT_WINDOW_MS) {
        _discordSendCount = 0;
        _discordWindowStart = now;
    }
    if (_discordSendCount >= DISCORD_RATE_LIMIT_MAX) return false;
    _discordSendCount++;
    return true;
}

class LogService extends DatabaseService {
    constructor() {
        super('apilogs', mongoSchema.apiLogs);
        this._webhookUrl = process.env.WEBHOOK_URL || '';
        this._env        = process.env.NODE_ENV || 'development';
        this._indexesEnsured = false;
    }

    /**
     * Garante que os índices TTL e compostos existem.
     * Chamado uma vez por cold-start (idempotente no MongoDB).
     */
    async _ensureIndexes() {
        if (this._indexesEnsured) return;
        try {
            await this.connect();
            await this.model.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
            await this.model.collection.createIndex({ requestId: 1 });
            await this.model.collection.createIndex({ level: 1, createdAt: -1 });
            await this.model.collection.createIndex({ route: 1, createdAt: -1 });
            this._indexesEnsured = true;
        } catch (e) {
            console.error('[LogService] Falha ao criar índices:', e.message);
        }
    }

    /**
     * Persiste uma entrada de log no MongoDB e, se o nível exigir, envia
     * embed ao webhook do Discord — tudo de forma não-bloqueante.
     *
     * @param {object} opts
     * @param {string} opts.level        - debug|info|warn|error|critical|security|auth|gacha|ratelimit
     * @param {string} opts.type         - Categoria (API, DB, AUTH, OAUTH, GACHA, RATE_LIMIT…)
     * @param {string} opts.action       - Ação específica (ex: login.success, roll.skin)
     * @param {string} opts.message      - Mensagem legível
     * @param {string} [opts.requestId]  - ID de correlação da requisição
     * @param {string} [opts.route]      - Rota Express (ex: POST /expapi/v1/login)
     * @param {string} [opts.method]     - Método HTTP
     * @param {number} [opts.statusCode] - Status HTTP da resposta
     * @param {number} [opts.durationMs] - Tempo de resposta em ms
     * @param {string} [opts.ip]         - IP do cliente
     * @param {string} [opts.userEmail]  - Email do usuário autenticado
     * @param {string} [opts.userId]     - Discord ID ou similar
     * @param {string} [opts.userAgent]  - User-Agent do cliente
     * @param {object} [opts.extra]      - Campos extras arbitrários
     */
    async write(opts) {
        const {
            level = 'info', type = 'API', action = '', message = '',
            requestId = '', route = '', method = '', statusCode = 0,
            durationMs = 0, ip = '', userEmail = '', userId = '',
            userAgent = '', extra = {},
        } = opts;

        const entry = {
            requestId, level, type, action, message, route, method,
            statusCode, durationMs, ip, userEmail, userId, userAgent,
            extra, environment: this._env,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };

        // Escrita no DB de forma não-bloqueante — não propaga exceção para a rota
        this._writeToDb(entry);

        // Discord webhook para níveis relevantes, com rate limiting interno
        const meta = LEVEL_META[level] || LEVEL_META.info;
        if (meta.minDiscord && this._webhookUrl && _canSendDiscord()) {
            this._sendDiscordEmbed(entry, meta);
        } else if (meta.minDiscord && this._webhookUrl) {
            // Rate limit atingido — apenas loga no console, não perde o evento
            console.warn(`[LogService] Discord rate limit atingido, embed suprimido: ${level} ${action}`);
        }
    }

    async _writeToDb(entry) {
        try {
            await this._ensureIndexes();
            await this.create(entry);
        } catch (e) {
            console.error('[LogService] Falha ao persistir log no DB:', e.message);
        }
    }

    /**
     * Monta e envia um Discord embed rico com todos os campos disponíveis.
     * Fire-and-forget — nunca lança exceção para o chamador.
     */
    async _sendDiscordEmbed(entry, meta) {
        try {
            const fields = [
                { name: '🆔 Request ID', value: entry.requestId || 'n/a', inline: true },
                { name: '🛣️ Rota',       value: `\`${entry.method} ${entry.route}\``.slice(0, 1024) || 'n/a', inline: true },
                { name: '📊 Status',     value: String(entry.statusCode || 'n/a'), inline: true },
            ];

            if (entry.durationMs) fields.push({ name: '⏱️ Duração', value: `${entry.durationMs.toFixed(1)}ms`, inline: true });
            if (entry.ip)         fields.push({ name: '🌐 IP',      value: entry.ip, inline: true });
            if (entry.userEmail)  fields.push({ name: '👤 Usuário', value: entry.userEmail, inline: true });
            if (entry.userId)     fields.push({ name: '🆔 UserID',  value: entry.userId, inline: true });

            if (entry.extra && Object.keys(entry.extra).length > 0) {
                const extraStr = JSON.stringify(entry.extra, null, 2).slice(0, 900);
                fields.push({ name: '📋 Extra', value: `\`\`\`json\n${extraStr}\n\`\`\``, inline: false });
            }

            const embed = {
                title:       `${meta.emoji} [${entry.type}] ${entry.action || entry.level.toUpperCase()}`,
                description: entry.message.slice(0, 4096),
                color:       meta.color,
                fields,
                footer:      { text: `Lumina API • ${this._env} • ${new Date(entry.createdAt).toLocaleString('pt-BR')}` },
                timestamp:   new Date(entry.createdAt).toISOString(),
            };

            await axios.post(this._webhookUrl, { embeds: [embed] }, { timeout: 5000 });
        } catch (e) {
            // Falha no Discord nunca deve bloquear a API
            console.error('[LogService] Falha ao enviar embed Discord:', e.message);
        }
    }

    /**
     * Busca logs recentes com filtros. Usado pela rota GET /expapi/v1/admin/logs.
     */
    async queryLogs({ level, type, route, requestId, startDate, endDate, limit = 50, page = 1 }) {
        await this.connect();
        const filter = {};
        if (level)     filter.level     = level;
        if (type)      filter.type      = type;
        if (route) {
            // Escapa regex para evitar ReDoS
            const escaped = String(route).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.route = { $regex: escaped, $options: 'i' };
        }
        if (requestId) filter.requestId = requestId;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate)   filter.createdAt.$lte = new Date(endDate);
        }

        const safePage  = Math.max(1, parseInt(page)  || 1);
        const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));
        const skip      = (safePage - 1) * safeLimit;

        const [logs, total] = await Promise.all([
            this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
            this.model.countDocuments(filter),
        ]);

        return { logs, total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) };
    }
}

module.exports = new LogService();
