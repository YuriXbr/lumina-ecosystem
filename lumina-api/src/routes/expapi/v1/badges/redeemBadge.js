'use strict';
const { redeemBadge } = require('../../../../utils/badgeRedemption');
const { routeError } = require('../../../../logger/logger');
module.exports = {
    route: '/expapi/v1/badges/redeem', enabled: true, method: 'post', internalKeyNeeded: false, csrfProtectionNeeded: true,
    async execute(req,res) {
        try {
            const { account, error } = await require('../../../../utils/authHelpers').verifyRequestAuthWithAccountCheck(req);
            if (error) return res.status(error.status).json({ error: error.message, code: error.code });
            const { code } = req.body || {};
            const badge = await redeemBadge(account, code, 'dashboard');
            return res.json({ message: 'Badge resgatada com sucesso!', badge });
        } catch(error) {
            if (error.status) return res.status(error.status).json({ code: error.code, error: error.message });
            return routeError({ res, error, route: '/expapi/v1/badges/redeem', errorCode: 'REDEEM_BADGE_ERROR', userMsg: 'Erro ao resgatar badge.' });
        }
    }
};
