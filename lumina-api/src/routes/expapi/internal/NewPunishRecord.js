const BanListService = require('../../../database/services/BanListService');
const MuteListService = require('../../../database/services/MuteListService');
const WarnListService = require('../../../database/services/WarnListService');

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
        try {
            let result;
            if (type === 'ban') {
                result = await BanListService.addBan(guildId, targetId, staffId, reason, endTime);
            } else if (type === 'mute') {
                result = await MuteListService.addMute(guildId, targetId, staffId, reason, endTime);
            } else if (type === 'warn') {
                result = await WarnListService.addWarn(guildId, targetId, staffId, reason, endTime);
            } else {
                return res.status(400).json({ error: 'Tipo de punição inválido' });
            }
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
};