'use strict';

const LogService = require('../../../database/services/LogService');
const { routeError, addLog } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/commandlog';

/**
 * Recebe um evento de execução de comando Discord do bot e persiste no MongoDB
 * via LogService. Isso integra o tracking de métricas do bot ao mesmo sistema
 * de logs da API — consultável em GET /expapi/v1/admin/logs?type=COMMAND.
 */
module.exports = {
    route: '/expapi/internal/commandlog',
    description: 'Recebe log de execução de comando Discord do bot (interno)',
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { level = 'info', type = 'COMMAND', action, message, durationMs, userId, guildId, extra = {} } = req.body;

        if (!action || !message) {
            return res.status(400).json({ error: 'Campos action e message são obrigatórios.', code: 'MISSING_FIELDS' });
        }

        try {
            // Fire-and-forget — o bot não precisa aguardar a persistência
            LogService.write({
                level,
                type: type || 'COMMAND',
                action: String(action).slice(0, 200),
                message: String(message).slice(0, 2000),
                durationMs: typeof durationMs === 'number' ? durationMs : 0,
                userId:  String(userId  || '').slice(0, 100),
                route:   String(action  || '').slice(0, 200),
                extra:   { guildId: String(guildId || ''), ...extra },
            }).catch(e => addLog('DB', 'log.write.fail', `Falha ao persistir log de comando: ${e.message}`));

            return res.status(200).json({ ok: true });
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'COMMANDLOG_ERROR',
                userMsg: 'Erro ao registrar log de comando.',
            });
        }
    },
};
