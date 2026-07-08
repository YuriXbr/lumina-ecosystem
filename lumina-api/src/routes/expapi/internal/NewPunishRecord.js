const BanListService  = require('../../../database/services/BanListService');
const MuteListService = require('../../../database/services/MuteListService');
const WarnListService = require('../../../database/services/WarnListService');
const { routeError }  = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/newpunishrecord';

module.exports = {
    route: '/expapi/internal/newpunishrecord',
    description: "Create a new punishment record",
    apiKeyNeeded: false, 
    internalKeyNeeded: true, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'post',

    async execute(req, res) {
        const { type, guildId, targetId, staffId, reason, endTime } = req.body;
        if (!type || !guildId || !targetId || !staffId)
            return res.status(400).json({ error: 'Parámetros type, guildId, targetId e staffId são obrigatórios.', code: 'MISSING_PARAMS' });

        const VALID_TYPES = ['ban','mute','warn'];
        if (!VALID_TYPES.includes(type))
            return res.status(400).json({ error: 'Tipo de punição inválido.', code: 'INVALID_TYPE' });

        try {
            let result;
            if (type === 'ban')       result = await BanListService.addBan(guildId, targetId, staffId, reason, endTime);
            else if (type === 'mute') result = await MuteListService.addMute(guildId, targetId, staffId, reason, endTime);
            else                      result = await WarnListService.addWarn(guildId, targetId, staffId, reason, endTime);
            return res.status(200).json(result);
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'CREATE_PUNISH_ERROR',
                userMsg: 'Erro ao criar registro de punição.',
                extra: { type, guildId, targetId, staffId, reason, endTime } });
        }
    },
};
