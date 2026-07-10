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
        const { verifyRequestAuth } = require('../../../utils/authHelpers');
        const { user: decoded, error: authError } = verifyRequestAuth(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            let account = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });
            if (!account.discordOauth2Token?.trim())
                return res.status(400).json({ error: 'Conta Discord não vinculada.', code: 'DISCORD_NOT_LINKED' });

            if (new Date() >= new Date(account.discordOauth2TokenExpiresAt)) {
                try {
                    const params = new URLSearchParams({
                        client_id: process.env.DISCORD_CLIENT_ID,
                        client_secret: process.env.DISCORD_CLIENT_SECRET,
                        grant_type: 'refresh_token',
                        refresh_token: account.discordOauth2RefreshToken,
                        redirect_uri: process.env.DISCORD_AUTH_REDIRECT_URI, // CORRIGIDO: nome da env var estava inconsistente com resolveDiscordAccount.js
                        scope: 'identify email guilds guilds.members.read messages.read'
                    });
                    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', params.toString(),
                        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
                    account = await DashboardAccountService.update({ email: decoded.email }, {
                        $set: {
                            discordOauth2Token: tokenRes.data.access_token,
                            discordOauth2RefreshToken: tokenRes.data.refresh_token,
                            discordOauth2TokenExpiresAt: new Date(Date.now() + (tokenRes.data.expires_in || 3600) * 1000),
                            discordOauth2TokenType: 'Bearer',
                            discordOauth2TokenScope: 'identify email messages.read'
                        }
                    });
                    if (!account) {
                        return routeError({ res, error: new Error('Conta nao encontrada apos refresh'), route: ROUTE, errorCode: 'ACCOUNT_NOT_FOUND_AFTER_REFRESH', userMsg: 'Conta nao encontrada.', extra: { email: decoded.email } });
                    }
                } catch (refreshError) {
                    return routeError({ res, error: refreshError, route: ROUTE,
                        errorCode: 'DISCORD_TOKEN_REFRESH_ERROR',
                        userMsg: 'Erro ao atualizar token do Discord. Reconecte sua conta.',
                        extra: { email: decoded.email } });
                }
            }

            const discordRes = await axios.get('https://discord.com/api/users/@me',
                { headers: { Authorization: `Bearer ${account.discordOauth2Token}` } });
            const { avatar, username, id, banner, accent_color, global_name } = discordRes.data;
            return res.status(200).json({ avatar, username, id, banner, accentColor: accent_color, globalName: global_name });
        } catch (error) {
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
