const { decryptSecret, encryptSecret } = require('../../../utils/secretEncryption');
const axios                     = require('axios');
const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const { routeError }            = require('../../../logger/logger');

const ROUTE = 'GET /expapi/v1/discordinfo';

module.exports = {
    route: '/expapi/v1/discordinfo',
    description: "Busca informações públicas do Discord se a conta estiver vinculada",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        const { verifyRequestAuthWithAccountCheck } = require('../../../utils/authHelpers');
        const { user: decoded, account, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });
            if (!account.discordOauth2Token?.trim())
                return res.status(400).json({ error: 'Conta Discord não vinculada.', code: 'DISCORD_NOT_LINKED' });

            const accessToken = await require('../../../utils/discordAccess').discordToken(account);

            let discordRes;
            try {
                discordRes = await axios.get('https://discord.com/api/users/@me',
                    { headers: { Authorization: `Bearer ${accessToken}` } });
            } catch (err) {
                if (err.response?.status === 429) {
                    const retryAfter = parseFloat(err.response?.headers?.['retry-after'] || '2');
                    res.set('Retry-After', String(Math.ceil(retryAfter) || 2));
                    return res.status(429).json({
                        error: 'O Discord está limitando requisições. Tente novamente em alguns segundos.',
                        code: 'DISCORD_RATE_LIMITED',
                        retryAfter: Math.ceil(retryAfter) || 2,
                    });
                }
                throw err;
            }
            const { avatar, username, id, banner, accent_color, global_name } = discordRes.data;
            return res.status(200).json({ avatar, username, id, banner, accentColor: accent_color, globalName: global_name });
        } catch (error) {
            if (error.status) return res.status(error.status).json({error:error.message,code:error.code});
            return routeError({
                res,
                error,
                route: ROUTE,
                errorCode: 'FETCH_DISCORD_INFO_ERROR',
                userMsg: 'Erro ao buscar informações do Discord.',
                extra: { email: decoded?.email }
            });
        }
    }
};
