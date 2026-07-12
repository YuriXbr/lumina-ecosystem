const DashboardAccountService = require('../../../../database/services/DashboardAccountService');
const GuildService = require('../../../../database/services/GuildService');
const BotService = require('../../../../database/services/BotService');
const { routeError, addLog } = require('../../../../logger/logger');
const { verifyRequestAuthWithAccountCheck } = require('../../../../utils/authHelpers');
const axios = require('axios');

const ROUTE = 'GET /expapi/v1/discord/guild/:guildId';

// Bitflags de permissões do Discord
const PERM_MANAGE_GUILD = 0x20;
const PERM_ADMINISTRATOR = 0x8;

// Discord channel types — apenas 0 (GUILD_TEXT) é exposto no dropdown de canais.
const CHANNEL_TYPE_GUILD_TEXT = 0;

/**
 * Busca o token do bot. Ordem de precedência:
 *   1. process.env.DISCORD_BOT_TOKEN (padrão do lumina-bot/index.js)
 *   2. campo `token` no documento do bot no banco (BotService) — se existir
 *
 * Retorna string vazia se não houver token disponível.
 */
async function resolveBotToken() {
    try {
        if (process.env.DISCORD_BOT_TOKEN?.trim())
            return process.env.DISCORD_BOT_TOKEN.trim();

        const bot = await BotService.getBot();
        if (bot && typeof bot.token === 'string' && bot.token.trim())
            return bot.token.trim();
    } catch (err) {
        addLog('API', 'discord.bot.token.resolve', `Falha ao resolver bot token: ${err.message}`);
    }
    return '';
}

/**
 * Busca canais de texto (type 0) e cargos (excluindo @everyone e managed)
 * usando o token do bot. Retorna { channels, roles } com arrays vazios em
 * caso de falha — nunca propaga o erro para o caller.
 */
async function fetchGuildChannelsAndRoles(guildId, botToken) {
    const out = { channels: [], roles: [], botRolePosition: 0 };
    if (!botToken) return out;

    const headers = { Authorization: `Bot ${botToken}` };

    // ─── Buscar membro do bot para saber sua position ─────────────────────
    let botMember = null;
    try {
        const botMemberRes = await axios.get(
            `https://discord.com/api/v10/guilds/${guildId}/members/@me`,
            { headers, timeout: 8000 }
        );
        botMember = botMemberRes.data;
    } catch (e) {
        addLog('API', 'discord.botmember.fail', `Falha ao buscar membro do bot: ${e.message}`);
    }

    // ─── Canais ────────────────────────────────────────────────────────────
    try {
        const channelsRes = await axios.get(
            `https://discord.com/api/v10/guilds/${guildId}/channels`,
            { headers, timeout: 8000 }
        );
        if (Array.isArray(channelsRes.data)) {
            out.channels = channelsRes.data
                .filter(c => c.type === CHANNEL_TYPE_GUILD_TEXT)
                .map(c => {
                    // Determinar se o bot pode enviar mensagens no canal
                    // verificando permission_overwrites
                    let canSendMessages = true; // default = @everyone perms
                    if (c.permission_overwrites && botMember) {
                        const botRoles = new Set(botMember.roles || []);
                        // PERM_SEND_MESSAGES = 0x800 = 2048
                        const PERM_SEND_MESSAGES = 2048;
                        let allow = 0, deny = 0;
                        for (const ow of c.permission_overwrites) {
                            if (ow.type === 0 && ow.id === guildId) {
                                // @everyone overwrite
                                allow |= parseInt(ow.allow || '0');
                                deny |= parseInt(ow.deny || '0');
                            }
                            if (ow.type === 0 && botRoles.has(ow.id)) {
                                // Bot's role overwrite
                                allow |= parseInt(ow.allow || '0');
                                deny |= parseInt(ow.deny || '0');
                            }
                        }
                        // Start with @everyone, apply role overwrites
                        const everyoneCanSend = !(deny & PERM_SEND_MESSAGES);
                        canSendMessages = everyoneCanSend;
                        // If role explicitly allows, override
                        if (allow & PERM_SEND_MESSAGES) canSendMessages = true;
                        // If role explicitly denies, override
                        if (deny & PERM_SEND_MESSAGES && !(allow & PERM_SEND_MESSAGES)) canSendMessages = false;
                    }
                    return { id: c.id, name: c.name, canSendMessages };
                })
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        }
    } catch (channelsErr) {
        if (channelsErr.response?.status === 429) {
            addLog('API', 'discord.channels.ratelimit', `Rate limit ao buscar canais da guilda ${guildId}`);
        } else {
            addLog('API', 'discord.channels.fail', `Falha ao buscar canais da guilda ${guildId}: ${channelsErr.message}`);
        }
    }

    // ─── Cargos ───────────────────────────────────────────────────────────
    try {
        const rolesRes = await axios.get(
            `https://discord.com/api/v10/guilds/${guildId}/roles`,
            { headers, timeout: 8000 }
        );
        if (Array.isArray(rolesRes.data)) {
            // Descobrir a posição do cargo mais alto do bot
            if (botMember && botMember.roles) {
                const allRoles = rolesRes.data;
                const botRoleIds = new Set(botMember.roles);
                let maxPos = 0;
                for (const r of allRoles) {
                    if (botRoleIds.has(r.id)) {
                        maxPos = Math.max(maxPos, r.position || 0);
                    }
                }
                out.botRolePosition = maxPos;
            }

            out.roles = rolesRes.data
                .filter(r =>
                    r.id !== guildId &&        // exclui @everyone
                    !r.managed                 // exclui cargos de bots/integrações
                )
                .map(r => ({
                    id: r.id,
                    name: r.name,
                    color: r.color || 0,
                    position: r.position || 0,
                    // Bot can manage this role if its position is higher
                    botCanManage: (r.position || 0) < out.botRolePosition,
                }))
                .sort((a, b) => (b.position || 0) - (a.position || 0)); // Higher roles first
        }
    } catch (rolesErr) {
        if (rolesErr.response?.status === 429) {
            addLog('API', 'discord.roles.ratelimit', `Rate limit ao buscar cargos da guilda ${guildId}`);
        } else {
            addLog('API', 'discord.roles.fail', `Falha ao buscar cargos da guilda ${guildId}: ${rolesErr.message}`);
        }
    }

    return out;
}

/**
 * Busca informações da guilda usando o TOKEN DO USUÁRIO (OAuth2 Bearer),
 * sem precisar do bot token.
 *
 * Fluxo:
 *   1. Verifica se o usuário tem Discord vinculado
 *   2. Verifica membership do usuário na guilda (GET /users/@me/guilds)
 *   3. Busca info do membro (GET /users/@me/guilds/{guildId}/member) se o scope permitir
 *   4. Busca canais (type 0) e cargos via bot token (para popular dropdowns no dashboard)
 *   5. Combina com config do bot no banco (GuildService)
 *
 * O bot token só é necessário para a listagem de canais/cargos (passo 4).
 * Se não houver bot token ou a chamada falhar, retornamos arrays vazios
 * — o resto da request continua funcionando normalmente.
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
        const { user: decoded, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        const { guildId } = req.params;
        if (!guildId || !/^\d{17,19}$/.test(guildId))
            return res.status(400).json({ error: 'Guild ID inválido.', code: 'INVALID_GUILD_ID' });

        try {
            // ─── 1. Verificar Discord vinculado ─────────────────────────────
            // account já vem populado pelo verifyRequestAuthWithAccountCheck, mas
            // pegamos uma cópia fresca para podermos atualizar em caso de refresh.
            let account = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
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
                if (userGuildsErr.response?.status === 429) {
                    const retryAfter = parseFloat(userGuildsErr.response?.headers?.['retry-after'] || '2');
                    res.set('Retry-After', String(Math.ceil(retryAfter) || 2));
                    return res.status(429).json({
                        error: 'O Discord está limitando requisições. Tente novamente em alguns segundos.',
                        code: 'DISCORD_RATE_LIMITED',
                        retryAfter: Math.ceil(retryAfter) || 2,
                    });
                }
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
                    if (memberErr.response?.status === 429) {
                        const retryAfter = parseFloat(memberErr.response?.headers?.['retry-after'] || '2');
                        res.set('Retry-After', String(Math.ceil(retryAfter) || 2));
                        return res.status(429).json({
                            error: 'O Discord está limitando requisições. Tente novamente em alguns segundos.',
                            code: 'DISCORD_RATE_LIMITED',
                            retryAfter: Math.ceil(retryAfter) || 2,
                        });
                    }
                    // Se falhar (scope insuficiente, etc), continua sem memberInfo
                    addLog('API', 'discord.member.fetch', `Não foi possível buscar member info (provavelmente scope antigo): ${memberErr.message}`);
                }
            }

            // ─── 5. Buscar canais e cargos via bot token ────────────────────
            // Usado pelo dashboard para popular dropdowns de canais/cargos nas
            // configurações da guilda. Se o bot não estiver na guilda, o token
            // não estiver disponível ou o Discord rate-limitar, retornamos
            // arrays vazios — a request principal não falha.
            const botToken = await resolveBotToken();
            const { channels, roles, botRolePosition } = await fetchGuildChannelsAndRoles(guildId, botToken);

            // ─── 6. Buscar config do bot no banco (se bot estiver na guilda) ─
            // Audit #18: campos sensíveis (config de moderação, listas de bloqueio)
            // são retornados apenas se canManage for true. Usuários comuns recebem
            // apenas a config básica (prefix, language, toggles).
            let botConfig = null;
            try {
                const guildData = await GuildService.getGuildData(guildId);
                if (guildData) {
                    // Config pública (qualquer membro pode ver)
                    botConfig = {
                        prefix: guildData.prefix || 'l!',
                        language: guildData.guildLocale || 'en-US',
                        welcomeEnabled: !!guildData.memberWelcomeToggle,
                        moderationEnabled: !!guildData.moderationChannelId,
                        musicEnabled: !!guildData.djEnabled,
                        memberCount: guildData.memberCount || 0,
                        gachaEnabled: guildData.gachaEnabled ?? true,
                        gachaChestsEnabled: guildData.gachaChestsEnabled ?? true,
                        gachaMaxRolls: guildData.gachaMaxRolls || 8,
                        gachaRefreshInterval: guildData.gachaRollsRefreshInterval || 10800000,
                    };

                    // Config de gerenciamento — só para quem pode administrar a guilda
                    if (canManage) {
                        botConfig.warnsToMute = guildData.warnsToMute || 3;
                        botConfig.warnsToTimeOut = guildData.warnsToTimeOut || 5;
                        botConfig.warnsToKick = guildData.warnsToKick || 6;
                        botConfig.warnsToBan = guildData.warnsToBan || 7;
                        botConfig.persistentMute = guildData.persistentMute ?? true;
                        botConfig.persistentWarns = guildData.persistentWarns ?? true;
                        botConfig.autoWarnPunishment = guildData.autoWarnPunishment || false;
                        botConfig.commandsEnabled = guildData.commandsEnabled || {};
                        botConfig.autoMessages = guildData.autoMessages || [];
                        botConfig.blockedUsers = guildData.blockedUsers || [];
                        botConfig.blockedRoles = guildData.blockedRoles || [];
                        botConfig.blockedChannels = guildData.blockedChannels || [];
                        // Campos de IDs de canal/cargo — necessários para o dashboard
                        // pré-selecionar o valor atual nos dropdowns.
                        botConfig.memberJoinChannelId = guildData.memberJoinChannelId || '';
                        botConfig.memberLeaveChannelId = guildData.memberLeaveChannelId || '';
                        botConfig.moderationChannelId = guildData.moderationChannelId || '';
                        botConfig.botInfoChannelId = guildData.botInfoChannelId || '';
                        botConfig.eventLogChannelId = guildData.eventLogChannelId || '';
                        botConfig.muteRoleId = guildData.muteRoleId || '';
                        botConfig.banRoleId = guildData.banRoleId || '';
                        botConfig.djRoleId = guildData.djRoleId || '';
                    }
                }
            } catch (dbErr) {
                addLog('DB', 'guild.fetch.fail', `Falha ao buscar config da guilda ${guildId}: ${dbErr.message}`);
            }

            // ─── 7. Montar resposta ─────────────────────────────────────────
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
                channels,
                roles,
                botRolePosition: botRolePosition || 0,
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
