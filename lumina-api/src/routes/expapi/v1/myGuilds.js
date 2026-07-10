const axios                     = require('axios');
const DashboardAccountService   = require('../../../database/services/DashboardAccountService');
const GuildService              = require('../../../database/services/GuildService');
const { routeError }            = require('../../../logger/logger');

const ROUTE = 'GET /expapi/v1/my-guilds';

// Bitflags de permissões do Discord relevantes para "gerenciar servidor"
const PERM_MANAGE_GUILD = 0x20;     // 32
const PERM_ADMINISTRATOR = 0x8;     // 8

/**
 * Lista as guildas (servidores) do usuário logado que ele compartilha com o bot,
 * marcando quais têm o Lumina Bot e quais o usuário tem permissão de gerenciar.
 *
 * Fluxo:
 *   1. Pega o token OAuth2 do Discord guardado na conta do usuário
 *   2. Chama GET /users/@me/guilds no Discord (lista guildas do usuário)
 *   3. Lista guildas do bot no banco (GuildService.getAll)
 *   4. Cruza: cada guilda do usuário recebe hasBot=true|false
 *   5. Permissão: owner=true OU (permissions & (MANAGE_GUILD | ADMINISTRATOR))
 */
module.exports = {
    route: '/expapi/v1/my-guilds',
    description: 'Lista guildas do usuário logado com indicador de presença do bot',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
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
                return res.status(400).json({
                    error: 'Conta Discord não vinculada. Conecte sua conta Discord para ver seus servidores.',
                    code: 'DISCORD_NOT_LINKED'
                });

            // Refresh token se expirado
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
                    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', params.toString(),
                        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
                    account = await DashboardAccountService.update({ email: decoded.email }, {
                        $set: {
                            discordOauth2Token: tokenRes.data.access_token,
                            discordOauth2RefreshToken: tokenRes.data.refresh_token,
                            discordOauth2TokenExpiresAt: new Date(Date.now() + tokenRes.data.expires_in * 1000),
                            discordOauth2TokenType: 'Bearer',
                            discordOauth2TokenScope: 'identify email guilds'
                        }
                    });
                } catch (refreshError) {
                    return routeError({
                        res, error: refreshError, route: ROUTE,
                        errorCode: 'DISCORD_TOKEN_REFRESH_ERROR',
                        userMsg: 'Erro ao atualizar token do Discord. Reconecte sua conta.',
                        extra: { email: decoded.email }
                    });
                }
            }

            // Busca guildas do usuário no Discord
            let userGuildsRes;
            try {
                userGuildsRes = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
                    headers: { Authorization: `Bearer ${account.discordOauth2Token}` }
                });
            } catch (err) {
                // Token sem escopo guilds — recoloca erro específico
                if (err.response?.status === 403) {
                    return res.status(403).json({
                        error: 'Seu token Discord não tem permissão para listar servidores. Reconecte sua conta.',
                        code: 'DISCORD_MISSING_GUILDS_SCOPE'
                    });
                }
                throw err;
            }

            // Busca guildas que o bot gerencia no banco
            const botGuildsRaw = await GuildService.getAll();
            const botGuildIds = new Set(botGuildsRaw.map(g => g.guildId));
            const botGuildsMap = new Map(botGuildsRaw.map(g => [g.guildId, g]));

            // Monta resposta
            const guilds = (userGuildsRes.data || []).map(g => {
                const permissions = parseInt(g.permissions || '0', 10);
                const canManage = !!g.owner || (permissions & PERM_ADMINISTRATOR) !== 0 || (permissions & PERM_MANAGE_GUILD) !== 0;
                const hasBot = botGuildIds.has(g.id);
                const botData = hasBot ? botGuildsMap.get(g.id) : null;

                return {
                    id: g.id,
                    name: g.name,
                    icon: g.icon,
                    banner: g.banner || null,
                    hasBot,
                    canManage,
                    // Dados extras só fazem sentido quando o bot está no servidor
                    botConfig: hasBot && botData ? {
                        prefix: botData.prefix || 'l!',
                        language: botData.guildLocale || 'en-US',
                        welcomeEnabled: !!botData.memberWelcomeToggle,
                        moderationEnabled: !!botData.moderationChannelId,
                        musicEnabled: !!botData.djEnabled,
                        memberCount: botData.memberCount || 0,
                    } : null,
                };
            });

            // Ordena: com bot primeiro, depois por canManage, depois alfabético
            guilds.sort((a, b) => {
                if (a.hasBot !== b.hasBot) return a.hasBot ? -1 : 1;
                if (a.canManage !== b.canManage) return a.canManage ? -1 : 1;
                return (a.name || '').localeCompare(b.name || '');
            });

            return res.status(200).json({ guilds });
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'FETCH_MY_GUILDS_ERROR',
                userMsg: 'Erro ao buscar seus servidores do Discord.',
                extra: { email: decoded?.email }
            });
        }
    }
};
