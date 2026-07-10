const DashboardAccountService = require('../../../../database/services/DashboardAccountService');
const GuildService = require('../../../../database/services/GuildService');
const { routeError, addLog } = require('../../../../logger/logger');
const { verifyRequestAuth } = require('../../../../utils/authHelpers');
const axios = require('axios');

const ROUTE = 'GET /expapi/v1/discord/guild/:guildId';

// Bitflags de permissões do Discord
const PERM_MANAGE_GUILD = 0x20;
const PERM_ADMINISTRATOR = 0x8;

/**
 * Busca informações da guilda usando o TOKEN DO USUÁRIO (OAuth2 Bearer),
 * sem precisar do bot token.
 *
 * Fluxo:
 *   1. Verifica se o usuário tem Discord vinculado
 *   2. Verifica membership do usuário na guilda (GET /users/@me/guilds)
 *   3. Busca info do membro (GET /users/@me/guilds/{guildId}/member) se o scope permitir
 *   4. Combina com config do bot no banco (GuildService)
 *
 * O bot token NÃO é mais necessário para operações de leitura.
 */
module.exports = {
    route: '/expapi/v1/discord/guild/:guildId',
    description: "Busca informações da guilda usando o token OAuth2 do usuário (sem bot token)",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    method: 'get',
    checkAuthNeeded: false,

    async execute(req, res) {
        const { user: decoded, error: authError } = verifyRequestAuth(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        const { guildId } = req.params;
        if (!guildId || !/^\d{17,19}$/.test(guildId))
            return res.status(400).json({ error: 'Guild ID inválido.', code: 'INVALID_GUILD_ID' });

        try {
            // ─── 1. Verificar Discord vinculado ─────────────────────────────
            const account = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!account)
                return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            if (!account.discordOauth2Token?.trim())
                return res.status(403).json({
                    error: 'Você precisa vincular sua conta Discord para acessar esta funcionalidade.',
                    code: 'DISCORD_NOT_LINKED',
                });

            // ─── 2. Verificar/refresh do token OAuth do usuário ─────────────
            let userAccessToken = account.discordOauth2Token;
            let userScope = account.discordOauth2TokenScope || '';

            if (new Date() >= new Date(account.discordOauth2TokenExpiresAt)) {
                try {
                    const params = new URLSearchParams({
                        client_id: process.env.DISCORD_CLIENT_ID,
                        client_secret: process.env.DISCORD_CLIENT_SECRET,
                        grant_type: 'refresh_token',
                        refresh_token: account.discordOauth2RefreshToken,
                        redirect_uri: process.env.DISCORD_AUTH_REDIRECT_URI,
                        scope: 'identify email guilds guilds.members.read',
                    });
                    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', params.toString(),
                        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
                    const updated = await DashboardAccountService.update({ email: decoded.email }, {
                        $set: {
                            discordOauth2Token: tokenRes.data.access_token,
                            discordOauth2RefreshToken: tokenRes.data.refresh_token,
                            discordOauth2TokenExpiresAt: new Date(Date.now() + (tokenRes.data.expires_in || 3600) * 1000),
                            discordOauth2TokenType: 'Bearer',
                            discordOauth2TokenScope: tokenRes.data.scope || 'identify email guilds guilds.members.read',
                        }
                    });
                    userAccessToken = updated?.discordOauth2Token || tokenRes.data.access_token;
                    userScope = tokenRes.data.scope || 'identify email guilds guilds.members.read';
                } catch (refreshError) {
                    addLog('API', 'discord.token.refresh.fail', `Falha ao refrescar token do usuário: ${refreshError.message}`);
                    return res.status(403).json({
                        error: 'Sua conexão com o Discord expirou. Reconecte sua conta nas configurações.',
                        code: 'DISCORD_TOKEN_EXPIRED',
                    });
                }
            }

            // ─── 3. Verificar membership + pegar info básica da guilda ──────
            // GET /users/@me/guilds retorna todas as guildas do usuário com
            // { id, name, icon, banner, owner, permissions, features }
            let userGuildsRes;
            try {
                userGuildsRes = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
                    headers: { Authorization: `Bearer ${userAccessToken}` },
                    timeout: 8000,
                });
            } catch (userGuildsErr) {
                if (userGuildsErr.response?.status === 403) {
                    return res.status(403).json({
                        error: 'Seu token Discord não tem permissão para listar servidores. Reconecte sua conta.',
                        code: 'DISCORD_MISSING_GUILDS_SCOPE',
                        needsReauth: true,
                    });
                }
                addLog('API', 'discord.userguilds.fail', `Falha ao buscar guildas do usuário: ${userGuildsErr.message}`);
                return res.status(502).json({
                    error: 'Erro ao verificar seus servidores no Discord.',
                    code: 'DISCORD_API_ERROR',
                });
            }

            const guildInfo = (userGuildsRes.data || []).find(g => g.id === guildId);
            if (!guildInfo) {
                addLog('API', 'discord.guild.idor', `Usuário ${decoded.email} tentou acessar guilda ${guildId} sem ser membro`);
                return res.status(403).json({
                    error: 'Você não é membro desta guilda.',
                    code: 'NOT_GUILD_MEMBER',
                });
            }

            // Calcula permissões
            const permissions = parseInt(guildInfo.permissions || '0', 10);
            const canManage = !!guildInfo.owner || (permissions & PERM_ADMINISTRATOR) !== 0 || (permissions & PERM_MANAGE_GUILD) !== 0;

            // ─── 4. Buscar info do membro (se scope permitir) ───────────────
            // GET /users/@me/guilds/{guildId}/member retorna { nick, roles, joined_at, ... }
            // Requer scope guilds.members.read
            let memberInfo = null;
            if (userScope.includes('guilds.members.read')) {
                try {
                    const memberRes = await axios.get(
                        `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
                        { headers: { Authorization: `Bearer ${userAccessToken}` }, timeout: 8000 }
                    );
                    memberInfo = {
                        nick: memberRes.data.nick || null,
                        roles: memberRes.data.roles || [],
                        joinedAt: memberRes.data.joined_at || null,
                        premiumSince: memberRes.data.premium_since || null,
                    };
                } catch (memberErr) {
                    // Se falhar (scope insuficiente, etc), continua sem memberInfo
                    addLog('API', 'discord.member.fetch', `Não foi possível buscar member info (provavelmente scope antigo): ${memberErr.message}`);
                }
            }

            // ─── 5. Buscar config do bot no banco (se bot estiver na guilda) ─
            let botConfig = null;
            try {
                const guildData = await GuildService.getGuildData(guildId);
                if (guildData) {
                    botConfig = {
                        prefix: guildData.prefix || 'l!',
                        language: guildData.guildLocale || 'en-US',
                        welcomeEnabled: !!guildData.memberWelcomeToggle,
                        moderationEnabled: !!guildData.moderationChannelId,
                        musicEnabled: !!guildData.djEnabled,
                        memberCount: guildData.memberCount || 0,
                        // Extended config
                        warnsToMute: guildData.warnsToMute || 3,
                        warnsToTimeOut: guildData.warnsToTimeOut || 5,
                        warnsToKick: guildData.warnsToKick || 6,
                        warnsToBan: guildData.warnsToBan || 7,
                        persistentMute: guildData.persistentMute ?? true,
                        persistentWarns: guildData.persistentWarns ?? true,
                        autoWarnPunishment: guildData.autoWarnPunishment || false,
                        gachaEnabled: guildData.gachaEnabled ?? true,
                        gachaChestsEnabled: guildData.gachaChestsEnabled ?? true,
                        gachaMaxRolls: guildData.gachaMaxRolls || 8,
                        gachaRefreshInterval: guildData.gachaRollsRefreshInterval || 10800000,
                        commandsEnabled: guildData.commandsEnabled || {},
                        autoMessages: guildData.autoMessages || [],
                        blockedUsers: guildData.blockedUsers || [],
                        blockedRoles: guildData.blockedRoles || [],
                        blockedChannels: guildData.blockedChannels || [],
                    };
                }
            } catch (dbErr) {
                addLog('DB', 'guild.fetch.fail', `Falha ao buscar config da guilda ${guildId}: ${dbErr.message}`);
            }

            // ─── 6. Montar resposta ─────────────────────────────────────────
            return res.status(200).json({
                id: guildInfo.id,
                name: guildInfo.name,
                icon: guildInfo.icon,
                banner: guildInfo.banner || null,
                features: guildInfo.features || [],
                owner: !!guildInfo.owner,
                permissions: guildInfo.permissions,
                canManage,
                member: memberInfo,
                botConfig,
                hasBot: !!botConfig,
            });
        } catch (error) {
            return routeError({
                res, error, route: ROUTE,
                errorCode: 'FETCH_DISCORD_GUILD_ERROR',
                userMsg: 'Erro ao buscar dados da guilda no Discord.',
                extra: { guildId, email: decoded?.email },
            });
        }
    }
};
