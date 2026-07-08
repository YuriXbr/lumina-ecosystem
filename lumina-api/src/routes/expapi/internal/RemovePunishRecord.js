const BanListService  = require('../../../database/services/BanListService');
const MuteListService = require('../../../database/services/MuteListService');
const WarnListService = require('../../../database/services/WarnListService');
const { routeError }  = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/removepunishrecord';

module.exports = {
    route: '/expapi/internal/removepunishrecord',
    description: "Remove a punishment record",
    apiKeyNeeded: false, 
    internalKeyNeeded: true, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { type, guildId, targetId } = req.body;
        if (!type || !guildId || !targetId)
            return res.status(400).json({ error: 'Parámetros type, guildId e targetId são obrigatórios.', code: 'MISSING_PARAMS' });

        const VALID_TYPES = ['ban','mute','warn'];
        if (!VALID_TYPES.includes(type))
            return res.status(400).json({ error: 'Tipo de punição inválido.', code: 'INVALID_TYPE' });

        try {
            let result;
            if (type === 'ban')       result = await BanListService.removeBan(guildId, targetId);
            else if (type === 'mute') result = await MuteListService.removeMute(guildId, targetId);
            else                      result = await WarnListService.removeWarn(guildId, targetId);
            return res.status(200).json(result);
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'REMOVE_PUNISH_ERROR',
                userMsg: 'Erro ao remover registro de punição.', extra: { type, guildId, targetId } });
        }
    },
};
