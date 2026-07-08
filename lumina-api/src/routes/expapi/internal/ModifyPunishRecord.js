const BanListService  = require('../../../database/services/BanListService');
const MuteListService = require('../../../database/services/MuteListService');
const WarnListService = require('../../../database/services/WarnListService');
const { routeError }  = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/modifypunishrecord';

module.exports = {
    route: '/expapi/internal/modifypunishrecord',
    description: "Modify a punishment record",
    apiKeyNeeded: false, 
    internalKeyNeeded: true, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'post',

    async execute(req, res) {
        const { type, guildId, targetId, updateData } = req.body;
        if (!type || !guildId || !targetId || !updateData)
            return res.status(400).json({ error: 'Parámetros type, guildId, targetId e updateData são obrigatórios.', code: 'MISSING_PARAMS' });

        const VALID_TYPES = ['ban','mute','warn'];
        if (!VALID_TYPES.includes(type))
            return res.status(400).json({ error: 'Tipo de punição inválido.', code: 'INVALID_TYPE' });

        try {
            let result;
            if (type === 'ban')       result = await BanListService.updateBan(guildId, targetId, updateData);
            else if (type === 'mute') result = await MuteListService.updateMute(guildId, targetId, updateData);
            else                      result = await WarnListService.update(updateData, { guildId, targetId });
            return res.status(200).json(result);
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'MODIFY_PUNISH_ERROR',
                userMsg: 'Erro ao modificar registro de punição.', extra: { type, guildId, targetId } });
        }
    },
};
