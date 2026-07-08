/**
 * src/logger/logger.js
 *
 * Sistema central de logging da Lumina API.
 *
 * Cada evento — requisição, erro, ação de negócio, bloqueio de rate limit —
 * é:
 *   1. Impresso no console (stdout/stderr)
 *   2. Persistido no MongoDB via LogService (rastreabilidade permanente)
 *   3. Enviado como embed ao webhook do Discord quando o nível exige
 *
 * Serverless-safe: o setInterval do buffer original foi removido. Toda escrita
 * agora é fire-and-forget via LogService, que grava diretamente no MongoDB
 * sem acumular nada em memória de processo.
 */

'use strict';

const axios   = require('axios');
const metrics = require('./metrics');

// LogService importado com lazy-require para evitar ciclo de dependência
// (LogService → DataBaseService → mongoose, que não depende do logger)
function getLogService() {
    try { return require('../database/services/LogService'); } catch { return null; }
}

// ─── Formatação de timestamp ─────────────────────────────────────────────────

function timestamp() {
    return new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).replace(',', '');
}

// ─── addLog: log genérico de evento (info / debug / negócio) ─────────────────

/**
 * Registra um evento no console e no MongoDB.
 *
 * @param {string} type    - Categoria (API, DB, AUTH, GACHA…)
 * @param {string} action  - Ação (ex: login.success, skin.roll)
 * @param {string} message - Mensagem legível
 * @param {object} [ctx]   - Contexto extra: { requestId, ip, userEmail, userId, extra }
 */
const addLog = (type, action, message, ctx = {}) => {
    const entry = `[${timestamp()}] [${type}<${action}>]: ${message}`;
    console.log(entry);

    // Persiste no MongoDB (fire-and-forget, não bloqueia)
    const ls = getLogService();
    if (ls) {
        ls.write({
            level: 'info', type, action, message,
            requestId: ctx.requestId || '',
            ip:        ctx.ip        || '',
            userEmail: ctx.userEmail || '',
            userId:    ctx.userId    || '',
            extra:     ctx.extra     || {},
        }).catch(() => {});
    }
};

// ─── Compatibilidade com código legado que usa forceSendLogs ─────────────────
// O buffer em memória foi removido. forceSendLogs agora é no-op.
const forceSendLogs = async () => {};

// ─── sendErrorEmbed: embed de erro para o Discord ────────────────────────────

/**
 * Envia um embed rico de erro ao webhook do Discord.
 * Mantido separado do LogService para compatibilidade com código existente.
 */
const sendErrorEmbed = async ({
    title = 'Erro Interno', origin, file, errorCode, error, extra = {},
    requestId, route, method, statusCode, durationMs, ip, userEmail, userId,
} = {}) => {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) return;

    const ts    = timestamp();
    const stack = error?.stack || String(error || '');
    const truncatedStack = stack.length > 900 ? stack.slice(0, 897) + '...' : stack;

    const fields = [
        { name: '📁 Arquivo / Rota', value: `\`${file || route || 'desconhecido'}\``, inline: true },
        { name: '🏷️ Origem',        value: `\`${origin || 'API'}\``,                 inline: true },
        { name: '🔖 Código',         value: `\`${errorCode || 'N/A'}\``,              inline: true },
        { name: '🕐 Horário',        value: `\`${ts}\``,                              inline: true },
    ];

    if (requestId) fields.push({ name: '🆔 Request ID', value: requestId,             inline: true });
    if (statusCode) fields.push({ name: '📊 Status',    value: String(statusCode),     inline: true });
    if (ip)         fields.push({ name: '🌐 IP',         value: ip,                    inline: true });
    if (userEmail)  fields.push({ name: '👤 Usuário',    value: userEmail,              inline: true });
    if (durationMs) fields.push({ name: '⏱️ Duração',   value: `${durationMs.toFixed(1)}ms`, inline: true });

    if (error?.message) {
        fields.push({ name: '💬 Mensagem', value: `\`${String(error.message).slice(0, 1024)}\``, inline: false });
    }
    if (truncatedStack) {
        fields.push({ name: '📋 Stack Trace', value: `\`\`\`\n${truncatedStack}\n\`\`\``, inline: false });
    }

    for (const [label, value] of Object.entries(extra)) {
        fields.push({ name: String(label), value: String(value).slice(0, 1024), inline: true });
    }

    const embed = {
        title:     `❌ ${title}`,
        color:     0xFF3636,
        fields,
        footer:    { text: `Lumina API • ${process.env.NODE_ENV || 'dev'}` },
        timestamp: new Date().toISOString(),
    };

    try {
        await axios.post(webhookUrl, { embeds: [embed] }, { timeout: 5000 });
    } catch (err) {
        console.error(`[logger] Falha ao enviar embed de erro: ${err.message}`);
    }
};

// ─── routeError: erro de rota padronizado ────────────────────────────────────

/**
 * Loga um erro de rota no console, no MongoDB e no Discord.
 * Retorna a resposta HTTP padronizada com requestId para rastreabilidade.
 */
const routeError = async ({
    res, error, route,
    errorCode = 'SERVER_ERROR',
    userMsg   = 'Erro interno do servidor.',
    status    = 500,
    extra     = {},
    requestId,
} = {}) => {
    const ts  = timestamp();
    const rid = requestId || res?.req?.id || '';
    const rid_prefix = rid ? `[${rid}] ` : '';
    const req = res?.req;

    console.error(`[${ts}] [ROUTE ERROR] ${rid_prefix}${route} | ${errorCode} | ${error?.message || error}`);
    if (error?.stack) console.error(error.stack);

    // Registrar nas métricas em memória
    metrics.recordError({
        id: rid, route,
        method: route?.split(' ')?.[0] || req?.method,
        status, message: error?.message || String(error),
    });

    // Persiste no MongoDB (fire-and-forget)
    const ls = getLogService();
    if (ls) {
        ls.write({
            level:      status >= 500 ? 'error' : 'warn',
            type:       'API',
            action:     `route.error.${errorCode.toLowerCase()}`,
            message:    `${route} → ${errorCode}: ${error?.message || error}`,
            requestId:  rid,
            route,
            method:     route?.split(' ')?.[0] || req?.method || '',
            statusCode: status,
            ip:         req?.ip || '',
            userEmail:  req?.user?.email || '',
            extra:      { errorCode, ...extra },
        }).catch(() => {});
    }

    // Discord embed (fire-and-forget)
    setImmediate(() =>
        sendErrorEmbed({
            title:      `Erro em ${route}`,
            origin:     'API',
            file:       route,
            errorCode,  error, requestId: rid,
            route,
            method:     route?.split(' ')?.[0] || req?.method,
            statusCode: status,
            ip:         req?.ip,
            userEmail:  req?.user?.email,
            extra,
        })
    );

    return res.status(status).json({ error: userMsg, code: errorCode, requestId: rid });
};

// ─── Middleware de logging por rota ──────────────────────────────────────────

/**
 * Middleware Express que loga TODA requisição no MongoDB e no console.
 * Deve ser registrado uma vez no index.js como app.use(requestLogger()).
 * Logging de nível 'info' para respostas normais, 'warn' para 4xx, 'error' para 5xx.
 */
function requestLogger() {
    return function requestLoggerMiddleware(req, res, next) {
        const startedAt = process.hrtime.bigint();

        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
            const status     = res.statusCode;
            const route      = (req.route && req.route.path) || req.path || req.originalUrl.split('?')[0];
            const level      = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
            const rid        = req.id || '';

            const entry = `[${timestamp()}] [API<request>] [${rid}] ${req.method} ${req.originalUrl} → ${status} (${durationMs.toFixed(1)}ms)`;
            if (status >= 400) console.log(entry);

            // Métricas em memória
            metrics.recordRequest({ id: rid, method: req.method, routePattern: route, status, durationMs });
            if (status >= 500) metrics.recordError({ id: rid, route, method: req.method, status, message: '' });

            // Persiste no MongoDB
            const ls = getLogService();
            if (ls) {
                ls.write({
                    level, type: 'API', action: 'request',
                    message: `${req.method} ${req.originalUrl} → ${status} (${durationMs.toFixed(1)}ms)`,
                    requestId: rid,
                    route,
                    method:     req.method,
                    statusCode: status,
                    durationMs,
                    ip:         req.ip         || '',
                    userEmail:  req.user?.email || '',
                    userId:     req.user?.id    || '',
                    userAgent:  req.headers?.['user-agent'] || '',
                }).catch(() => {});
            }
        });

        next();
    };
}

module.exports = { addLog, forceSendLogs, sendErrorEmbed, routeError, requestLogger };
