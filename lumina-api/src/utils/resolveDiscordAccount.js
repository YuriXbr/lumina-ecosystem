const axios = require('axios');
const DashboardAccountService = require('../database/services/DashboardAccountService');
const { addLog } = require('../logger/logger');

/**
 * Resolve a conta do dashboard + discordId a partir do email presente no JWT.
 *
 * @param {string} email - email decodificado do JWT (req.user.email)
 * @returns {Promise<{ account: object, discordId: string }>}
 * @throws {Object} erro com { status, message, code } pronto para responder ao cliente
 */
async function resolveDiscordAccount(email) {
    let account = await DashboardAccountService.getDashboardAccountByEmail(email);

    if (!account) {
        throw { status: 404, message: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' };
    }

    if (!account.discordOauth2Token || account.discordOauth2Token.trim() === '') {
        throw {
            status: 400,
            message: 'Sua conta Discord não está vinculada. Conecte sua conta Discord nas configurações para acessar esta funcionalidade.',
            code: 'DISCORD_NOT_LINKED'
        };
    }

    // Refresh do token OAuth2 se expirado
    if (new Date() >= new Date(account.discordOauth2TokenExpiresAt)) {
        try {
            const params = new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: account.discordOauth2RefreshToken,
                redirect_uri: process.env.DISCORD_AUTH_REDIRECT_URI,
                scope: 'identify email guilds guilds.members.read'
            });

            const tokenResponse = await axios.post(
                'https://discord.com/api/oauth2/token',
                params.toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const newAccessToken = tokenResponse.data.access_token;
            const newRefreshToken = tokenResponse.data.refresh_token;
            const expiresIn = tokenResponse.data.expires_in;

            account = await DashboardAccountService.update(
                { email },
                {
                    $set: {
                        discordOauth2Token: newAccessToken,
                        discordOauth2RefreshToken: newRefreshToken,
                        discordOauth2TokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
                        discordOauth2TokenType: 'Bearer',
                        discordOauth2TokenScope: 'identify email guilds guilds.members.read'
                    }
                },
            );

            addLog('API', 'discord.tokenRefresh', `Token Discord atualizado para ${email}`);
        } catch (refreshError) {
            addLog('API', 'discord.tokenRefresh.error', `Erro ao atualizar token OAuth2 para ${email}: ${refreshError.message}`);
            throw {
                status: 403,
                message: 'Sua conexão com o Discord expirou. Reconecte sua conta nas configurações.',
                code: 'DISCORD_TOKEN_EXPIRED'
            };
        }
    }

    let discordId;
    try {
        const discordResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${account.discordOauth2Token}` }
        });
        discordId = discordResponse.data.id;
    } catch (discordError) {
        if (discordError.response?.status === 401) {
            throw {
                status: 403,
                message: 'Sua conexão com o Discord expirou. Reconecte sua conta nas configurações.',
                code: 'DISCORD_TOKEN_EXPIRED'
            };
        }
        addLog('API', 'discord.resolve.error', `Erro ao buscar info do Discord para ${email}: ${discordError.message}`);
        throw {
            status: 502,
            message: 'Erro ao comunicar com o Discord. Tente novamente.',
            code: 'DISCORD_API_ERROR'
        };
    }

    return { account, discordId };
}

module.exports = { resolveDiscordAccount };
