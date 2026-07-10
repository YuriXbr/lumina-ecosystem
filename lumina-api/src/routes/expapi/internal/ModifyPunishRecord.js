const BanListService  = require('../../../database/services/BanListService');
const MuteListService = require('../../../database/services/MuteListService');
const WarnListService = require('../../../database/services/WarnListService');
const { routeError }  = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/modifypunishrecord';

// Whitelist de campos que o bot pode modificar em um registro de punição.
// Defesa contra mass assignment — mesmo com internal key, não permite
// sobrescrever _id, guildId, targetId, startTime, etc.
const ALLOWED_PUNISH_FIELDS = new Set(['reason', 'endTime', 'staffId']);

function sanitizeUpdateData(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const clean = {};
    for (const key of Object.keys(raw)) {
        if (ALLOWED_PUNISH_FIELDS.has(key)) {
            clean[key] = raw[key];
        }
    }
    return clean;
}

module.exports = {
    route: '/expapi/internal/modifypunishrecord',
    description: "Modify a punishment record (apenas campos whitelistados)",
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { type, guildId, targetId, updateData } = req.body || {};
        if (!type || !guildId || !targetId || !updateData)
            return res.status(400).json({ error: 'Parámetros type, guildId, targetId e updateData são obrigatórios.', code: 'MISSING_PARAMS' });

        const VALID_TYPES = ['ban','mute','warn'];
        if (!VALID_TYPES.includes(type))
            return res.status(400).json({ error: 'Tipo de punição inválido.', code: 'INVALID_TYPE' });

        // Filtra apenas campos permitidos
        const safeData = sanitizeUpdateData(updateData);
        if (Object.keys(safeData).length === 0) {
            return res.status(400).json({
                error: 'Nenhum campo válido para atualização. Campos permitidos: reason, endTime, staffId.',
                code: 'NO_VALID_FIELDS',
            });
        }

        try {
            let result;
            if (type === 'ban')       result = await BanListService.updateBan(guildId, targetId, safeData);
            else if (type === 'mute') result = await MuteListService.updateMute(guildId, targetId, safeData);
            else                      result = await WarnListService.update(safeData, { guildId, targetId });
            return res.status(200).json(result);
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'MODIFY_PUNISH_ERROR',
                userMsg: 'Erro ao modificar registro de punição.', extra: { type, guildId, targetId } });
        }
    },
};
