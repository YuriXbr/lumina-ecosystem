const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const GuildService              = require('../../../../database/services/GuildService');
const { routeError }            = require('../../../../logger/logger');

const ROUTE = 'GET /expapi/v1/admin/guilds';
const ACCESS_LEVELS = { user:0,vipUser:1,enterpriseUser:2,contentCreator:3,tester:4,
    support:5,moderator:6,admin:7,headadmin:8,developer:9,coowner:10,owner:11 };

module.exports = {
    route: '/expapi/v1/admin/guilds',
    description: "Busca lista de guildas para administração",
    apiKeyNeeded: false, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'get',

    async execute(req, res) {
        const { verifyRequestAuth } = require('../../../../utils/authHelpers');
        const { user: decoded, error: authError } = verifyRequestAuth(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            const adminAccount = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!adminAccount) return res.status(404).json({ error: 'Conta não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            if ((ACCESS_LEVELS[adminAccount.accessType] || 0) < 7)
                return res.status(403).json({ error: 'Permissão insuficiente.', code: 'INSUFFICIENT_PERMISSION' });

            const page = Math.max(parseInt(req.query.page) || 1, 1);
            // CORRECAO: limit vindo direto do usuario sem teto permitia
            // ?limit=999999999 -> carregar a colecao inteira em memoria a cada
            // chamada (ataque de exaustao de recursos / DoS leve). Limitado a 100.
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
            const search = req.query.search || '';

            let allGuilds = (await GuildService.getAll()) || [];
            if (search) allGuilds = allGuilds.filter(g =>
                g.guildReferenceName?.toLowerCase().includes(search.toLowerCase()) || g.guildId?.includes(search));

            const startIndex = (page - 1) * limit;
            const guilds = allGuilds.slice(startIndex, startIndex + limit).map(guild => ({
                guildId: guild.guildId, guildName: guild.guildReferenceName,
                memberCount: guild.memberCount || 0, botEnabled: true,
                welcomeEnabled: guild.memberWelcomeToggle || false,
                moderationEnabled: !!guild.moderationChannelId,
                musicEnabled: guild.djEnabled || false,
                addedDate: guild.createdAt || new Date(), lastActivity: guild.updatedAt || new Date(),
                prefix: guild.prefix || 'l!', language: guild.guildLocale || 'en-US',
                djEnabled: guild.djEnabled || false, memberDmToggle: guild.memberDmToggle || false,
                persistentMute: guild.persistentMute || false,
                autoWarnPunishment: guild.autoWarnPunishment || false,
                warnsToMute: guild.warnsToMute || 3,
                warnsToTimeOut: guild.warnsToTimeOut || 5,
                warnsToKick: guild.warnsToKick || 6,
                warnsToBan: guild.warnsToBan || 7,
                persistentWarns: guild.persistentWarns || true,
                gachaEnabled: guild.gachaEnabled ?? true,
                gachaChestsEnabled: guild.gachaChestsEnabled ?? true,
                gachaMaxRolls: guild.gachaMaxRolls || 8,
                gachaRefreshInterval: guild.gachaRollsRefreshInterval || 10800000,
                commandsEnabled: guild.commandsEnabled || {},
                autoMessages: guild.autoMessages || [],
                blockedUsers: guild.blockedUsers || [],
                blockedRoles: guild.blockedRoles || [],
                blockedChannels: guild.blockedChannels || [],
            }));

            return res.status(200).json({ guilds, pagination: { page, limit, total: allGuilds.length, hasMore: startIndex + limit < allGuilds.length } });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_GUILDS_ERROR',
                userMsg: 'Erro ao buscar guildas.', extra: { email: decoded?.email } });
        }
    }
};
