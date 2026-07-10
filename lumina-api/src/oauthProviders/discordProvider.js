const axios = require('axios');

/**
 * Provider OAuth2 para Discord.
 *
 * Scopes solicitados:
 *   identify              → username, avatar, id
 *   email                 → email (verified)
 *   guilds                → lista de servidores do usuário (GET /users/@me/guilds)
 *   guilds.members.read   → dados de membro em guilda específica (GET /users/@me/guilds/{guildId}/member)
 *
 * Com esses 4 scopes, o dashboard consegue TUDO sem precisar do bot token:
 *   - Listar servidores do usuário (my-guilds)
 *   - Verificar permissões (MANAGE_GUILD / ADMINISTRATOR)
 *   - Buscar info básica da guilda (nome, ícone, features)
 *   - Buscar roles do usuário na guilda
 *
 * O bot token só é necessário para operações administrativas no bot
 * (ex: atualizar config do bot, que é feita via rotas internas).
 */
module.exports = {
    name: 'discord',

    getAuthorizationUrl(state) {
        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            redirect_uri: process.env.DISCORD_AUTH_REDIRECT_URI,
            response_type: 'code',
            scope: 'identify email guilds guilds.members.read',
            // prompt=consent força o Discord a pedir autorização novamente
            // (necessário para atualizar scopes de contas que autorizaram antes
            // com scopes menores). Sem isso, o Discord reutiliza a autorização
            // anterior e retorna o scope antigo.
            prompt: 'consent',
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
            scope: 'identify email guilds guilds.members.read'
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
