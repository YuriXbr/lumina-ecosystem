'use strict';
const { redeemBadge } = require('../../../utils/badgeRedemption');
const { routeError } = require('../../../logger/logger');
module.exports = {
    route: '/expapi/internal/redeembadge', enabled: true, method: 'post', internalKeyNeeded: true, csrfProtectionNeeded: false,
    async execute(req,res) {
        try {
            const { discordUserId, code } = req.body || {};
            if (typeof discordUserId !== 'string' || !/^\d{16,20}$/.test(discordUserId)) return res.status(400).json({ code: 'INVALID_DISCORD_ID', error: 'Discord ID inválido.' });
            const account = await require('../../../database/services/DashboardAccountService').getOne({ discordOauth2Id: discordUserId });
            const badge = await redeemBadge(account, code, 'bot');
            return res.json({ message: 'Badge resgatada com sucesso!', badge });
        } catch(error) {
            if (error.status) return res.status(error.status).json({ code: error.code, error: error.message });
            return routeError({ res, error, route: '/expapi/internal/redeembadge', errorCode: 'REDEEM_BADGE_ERROR', userMsg: 'Erro ao resgatar badge.' });
        }
    }
};
