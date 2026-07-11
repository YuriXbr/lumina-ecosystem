const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const GuildService              = require('../../../../database/services/GuildService');
const BotService                = require('../../../../database/services/BotService');
const { routeError, addLog }    = require('../../../../logger/logger');
const axios                     = require('axios');

const ROUTE = 'GET /expapi/v1/admin/guilds';
const ACCESS_LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,
    support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };

module.exports = {
    route: '/expapi/v1/admin/guilds',
    description: "Busca lista de guildas para administração (inclui guildas do bot não registradas no DB)",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        const { verifyRequestAuthWithAccountCheck } = require('../../../../utils/authHelpers');
        const { user: decoded, account: adminAccount, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            if (!adminAccount) return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });
            if (adminAccount.banned || adminAccount.blocked)
                return res.status(403).json({ error: 'Conta suspensa.', code: 'ACCOUNT_SUSPENDED' });

            if ((ACCESS_LEVELS[adminAccount.accessType] || 0) < 7)
                return res.status(403).json({ error: 'Permissão insuficiente.', code: 'INSUFFICIENT_PERMISSION' });

            const page = Math.max(parseInt(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
            const search = req.query.search || '';

            // ── 1. Busca guildas registradas no banco ──────────────────────
            const dbGuilds = (await GuildService.getAll()) || [];
            const dbGuildMap = new Map(dbGuilds.map(g => [g.guildId, g]));

            // ── 2. Busca guildas do bot via Discord API ─────────────────────
            let discordGuilds = [];
            try {
                let botToken = process.env.DISCORD_BOT_TOKEN;
                if (!botToken) {
                    const bot = await BotService.getBot();
                    botToken = bot?.token;
                }
                if (botToken) {
                    const discordRes = await axios.get(
                        'https://discord.com/api/v10/users/@me/guilds',
                        { headers: { Authorization: `Bot ${botToken}` }, timeout: 8000 }
                    );
                    discordGuilds = discordRes.data || [];
                }
            } catch (err) {
                addLog('API', 'admin.guilds.discord.fetch', `Erro ao buscar guildas do bot: ${err.message}`);
                // Continua com apenas as guildas do banco
            }

            // ── 3. Combina: guildas do banco + guildas do Discord ───────────
            // Guildas que estão no Discord mas não no banco aparecem como "não configuradas"
            const allGuildsMap = new Map();

            // Adiciona guildas do banco primeiro
            for (const guild of dbGuilds) {
                allGuildsMap.set(guild.guildId, {
                    guildId: guild.guildId,
                    guildName: guild.guildReferenceName || 'Desconhecido',
                    icon: null,
                    memberCount: guild.memberCount || 0,
                    configured: true,
                    botEnabled: true,
                    welcomeEnabled: guild.memberWelcomeToggle || false,
                    moderationEnabled: !!guild.moderationChannelId,
                    musicEnabled: guild.djEnabled || false,
                    addedDate: guild.createdAt || new Date(),
                    lastActivity: guild.updatedAt || new Date(),
                    prefix: guild.prefix || 'l!',
                    language: guild.guildLocale || 'en-US',
                    djEnabled: guild.djEnabled || false,
                    memberDmToggle: guild.memberDmToggle || false,
                    persistentMute: guild.persistentMute || false,
                    autoWarnPunishment: guild.autoWarnPunishment || false,
                    warnsToMute: guild.warnsToMute || 3,
                    warnsToTimeOut: guild.warnsToTimeOut || 5,
                    warnsToKick: guild.warnsToKick || 6,
                    warnsToBan: guild.warnsToBan || 7,
                    persistentWarns: guild.persistentWarns ?? true,
                    gachaEnabled: guild.gachaEnabled ?? true,
                    gachaChestsEnabled: guild.gachaChestsEnabled ?? true,
                    gachaMaxRolls: guild.gachaMaxRolls || 8,
                    gachaRefreshInterval: guild.gachaRollsRefreshInterval || 10800000,
                    commandsEnabled: guild.commandsEnabled || {},
                    autoMessages: guild.autoMessages || [],
                    blockedUsers: guild.blockedUsers || [],
                    blockedRoles: guild.blockedRoles || [],
                    blockedChannels: guild.blockedChannels || [],
                });
            }

            // Adiciona guildas do Discord que não estão no banco
            for (const dg of discordGuilds) {
                if (!allGuildsMap.has(dg.id)) {
                    allGuildsMap.set(dg.id, {
                        guildId: dg.id,
                        guildName: dg.name || 'Desconhecido',
                        icon: dg.icon,
                        memberCount: dg.approximate_member_count || 0,
                        configured: false, // Não configurada no banco
                        botEnabled: true,
                        welcomeEnabled: false,
                        moderationEnabled: false,
                        musicEnabled: false,
                        addedDate: new Date(),
                        lastActivity: new Date(),
                        prefix: 'l!',
                        language: 'en-US',
                        djEnabled: false,
                        memberDmToggle: false,
                        persistentMute: true,
                        autoWarnPunishment: false,
                        warnsToMute: 3,
                        warnsToTimeOut: 5,
                        warnsToKick: 6,
                        warnsToBan: 7,
                        persistentWarns: true,
                        gachaEnabled: true,
                        gachaChestsEnabled: true,
                        gachaMaxRolls: 8,
                        gachaRefreshInterval: 10800000,
                        commandsEnabled: {},
                        autoMessages: [],
                        blockedUsers: [],
                        blockedRoles: [],
                        blockedChannels: [],
                    });
                } else {
                    // Guilda existe no banco — adiciona o icon do Discord
                    const existing = allGuildsMap.get(dg.id);
                    existing.icon = dg.icon;
                    if (!existing.memberCount && dg.approximate_member_count) {
                        existing.memberCount = dg.approximate_member_count;
                    }
                }
            }

            // Converte para array e aplica busca
            let allGuilds = Array.from(allGuildsMap.values());
            if (search) {
                const searchLower = search.toLowerCase();
                allGuilds = allGuilds.filter(g =>
                    g.guildName?.toLowerCase().includes(searchLower) ||
                    g.guildId?.includes(search)
                );
            }

            // Ordena: configuradas primeiro, depois por nome
            allGuilds.sort((a, b) => {
                if (a.configured !== b.configured) return a.configured ? -1 : 1;
                return (a.guildName || '').localeCompare(b.guildName || '');
            });

            const startIndex = (page - 1) * limit;
            const guilds = allGuilds.slice(startIndex, startIndex + limit);

            return res.status(200).json({
                guilds,
                pagination: {
                    page, limit,
                    total: allGuilds.length,
                    hasMore: startIndex + limit < allGuilds.length,
                    configured: allGuilds.filter(g => g.configured).length,
                    unconfigured: allGuilds.filter(g => !g.configured).length,
                },
            });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_GUILDS_ERROR',
                userMsg: 'Erro ao buscar guildas.', extra: { email: decoded?.email } });
        }
    }
};
