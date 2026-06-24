const axios = require('axios');

/**
 * Provider OAuth2 para Discord.
 * Implementa o contrato comum usado por src/oauthProviders/index.js e pelas
 * rotas em src/routes/oauth/: getAuthorizationUrl(state), exchangeCode(code),
 * getProfile(accessToken).
 *
 * Para adicionar um novo provedor (Google, GitHub, etc.), crie um arquivo
 * com a mesma forma e registre em src/oauthProviders/index.js.
 */
module.exports = {
    name: 'discord',

    getAuthorizationUrl(state) {
        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            // IMPORTANTE: redirect_uri dedicado para o fluxo de login/cadastro,
            // diferente do usado para "vincular Discord a uma conta já logada"
            // (DISCORD_REDIRECT_URI). Configure DISCORD_AUTH_REDIRECT_URI no .env
            // apontando para /expapi/oauth2/discord/auth/callback e registre essa
            // URL no painel de developer do Discord.
            redirect_uri: process.env.DISCORD_AUTH_REDIRECT_URI,
            response_type: 'code',
            scope: 'identify email',
            state
        });
        return `https://discord.com/oauth2/authorize?${params.toString()}`;
    },

    async exchangeCode(code) {
        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.DISCORD_AUTH_REDIRECT_URI,
            scope: 'identify email'
        });

        const { data } = await axios.post(
            'https://discord.com/api/oauth2/token',
            params.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
            scope: data.scope,
            tokenType: data.token_type
        };
    },

    async getProfile(accessToken) {
        const { data } = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        return {
            providerId: data.id,
            email: data.email || null,
            emailVerified: !!data.verified,
            username: data.global_name || data.username,
            avatar: data.avatar
                ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
                : null,
            raw: data
        };
    }
};
