const axios = require('axios');
const DashboardAccountService = require('../database/services/DashboardAccountService');

/**
 * Resolve a conta do dashboard + discordId a partir do email presente no JWT (req.user.email).
 * Reaproveita a mesma lógica de refresh de token usada em /expapi/v1/discordinfo,
 * para manter os dois fluxos (info do Discord e roll de baú) sempre consistentes.
 *
 * @param {string} email - email decodificado do JWT (req.user.email)
 * @returns {Promise<{ account: object, discordId: string }>}
 * @throws {Object} erro com { status, message } pronto para responder ao cliente
 */
async function resolveDiscordAccount(email) {
    let account = await DashboardAccountService.getDashboardAccountByEmail(email);

    if (!account) {
        throw { status: 404, message: 'Conta não encontrada' };
    }

    if (!account.discordOauth2Token || account.discordOauth2Token.trim() === '') {
        throw { status: 400, message: 'Conta Discord não vinculada' };
    }

    // Refresh do token OAuth2 se expirado
    if (new Date() >= new Date(account.discordOauth2TokenExpiresAt)) {
        try {
            const params = new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: account.discordOauth2RefreshToken,
                redirect_uri: process.env.DISCORD_REDIRECT_URI,
                scope: 'identify email messages.read'
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
                        discordOauth2TokenScope: 'identify email messages.read'
                    }
                },
            );
        } catch (refreshError) {
            console.error('Erro ao atualizar o token OAuth2:', refreshError);
            throw { status: 500, message: 'Erro durante refresh do token' };
        }
    }

    // Busca o ID atual do Discord (garante que está sincronizado, igual ao /discordinfo)
    let discordId;
    try {
        const discordResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${account.discordOauth2Token}` }
        });
        discordId = discordResponse.data.id;
    } catch (discordError) {
        console.error('Erro ao buscar informações do Discord:', discordError);
        throw { status: 500, message: 'Erro interno ao obter informações do Discord' };
    }

    return { account, discordId };
}

module.exports = { resolveDiscordAccount };
