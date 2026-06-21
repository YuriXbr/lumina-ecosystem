const axios = require('axios');
const url = require('url');
const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../database/services/DashboardAccountService');

module.exports = {
    route: '/expapi/oauth2/discord/redirect',
    description: "Discord oauth2 redirect route",
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        // Extrai os parâmetros da query string

        console.log('Received request for Discord OAuth2 redirect');
        console.log('Query parameters:', req.query);
        const { code, state, error } = req.query;

        if (!code || !state) {
            return res.status(400).send('Código ou estado ausente. '+ error);
        }

        let stateObject;
        try {
            stateObject = JSON.parse(state);
        } catch (error) {
            return res.status(400).send('Estado inválido');
        }

        const { origin, accountId } = stateObject;

        try {
            // Trocar o código pelo token de acesso do Discord
            const params = new url.URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI,
                scope: 'identify email guilds' // Escopo reduzido e válido
            });

            const tokenResponse = await axios.post(
                'https://discord.com/api/oauth2/token',
                params.toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const accessToken = tokenResponse.data.access_token;
            const refreshToken = tokenResponse.data.refresh_token;
            const expiresIn = tokenResponse.data.expires_in;

            // Obter informações sobre o usuário no Discord
            const userInfoResponse = await axios.get('https://discord.com/api/users/@me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            const userData = userInfoResponse.data;

            // Atualize a conta no banco de dados utilizando o accountId extraído do state
            await DashboardAccountService.update(
                { accountId },
                {
                    $set: {
                        discordOauth2Id: userData.id,
                        discordOauth2Token: accessToken,
                        discordOauth2RefreshToken: refreshToken,
                        discordOauth2TokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
                        discordOauth2TokenScope: 'identify email guilds ',
                        discordOauth2TokenType: 'Bearer',
                        discordOauth2TokenRequestDate: new Date(),
                        discordOauth2TokenRequestIp: req.ip
                    }
                },
                { upsert: true, new: true }
            ).then(updatedDoc => {
                console.log('Conta atualizada com sucesso');
            }).catch(err => {
                console.error('Erro ao atualizar a conta:', err);
            });

            // Redireciona de volta para a origem que foi passada no state
            res.redirect(origin);
        } catch (error) {
            console.error('Erro durante o processo OAuth2:', error);
            res.status(500).send('Erro durante o processo OAuth2');
        }
    }
};