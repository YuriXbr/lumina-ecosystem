const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const GuildService              = require('../../../../database/services/GuildService');
const { routeError }            = require('../../../../logger/logger');

const ROUTE = 'PUT /expapi/v1/admin/guilds/:guildId';
const ACCESS_LEVELS = { 
    user:0,
    vipUser:1,
    enterpriseUser:2,
    contentCreator:3,
    tester:4,
    support:5,
    moderator:6,
    admin:7,
    headadmin:8,
    developer:9,
    coowner:10,
    owner:11 
};

module.exports = {
    route: '/expapi/v1/admin/guilds/:guildId',
    description: "Atualiza configurações de uma guilda específica",
    apiKeyNeeded: false, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: true,
    checkAuthNeeded: false, 
    method: 'put',

    async execute(req, res) {
        const { verifyRequestAuth } = require('../../../../utils/authHelpers');
        const { user: decoded, error: authError } = verifyRequestAuth(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            const { guildId } = req.params;
            const adminAccount = await DashboardAccountService.getDashboardAccountByEmail(decoded.email);
            if (!adminAccount) return res.status(404).json({ error: 'Conta de administrador não encontrada.', code: 'ACCOUNT_NOT_FOUND' });

            const adminLevel = ACCESS_LEVELS[adminAccount.accessType] || 0;
            if (adminLevel < 7) return res.status(403).json({ error: 'Permissão insuficiente.', code: 'INSUFFICIENT_PERMISSION' });

            const guild = await GuildService.getGuildData(guildId);
            if (!guild) return res.status(404).json({ error: 'Guilda não encontrada.', code: 'GUILD_NOT_FOUND' });

            const allowedFields = {};
            if (adminLevel >= 7) Object.assign(allowedFields, { 
                djEnabled:true,
                memberWelcomeToggle:true,
                memberDmToggle:true,
                persistentMute:true,
                persistentWarns:true,
                autoWarnPunishment:true,
                canPunishStaff:true 
            });
            if (adminLevel >= 8) Object.assign(allowedFields, { 
                memberJoinChannelId:true,
                memberLeaveChannelId:true,
                moderationChannelId:true,
                botInfoChannelId:true,
                eventLogChannelId:true,
                djRoleId:true,
                muteRoleId:true,
                banRoleId:true,
                prefix:true,
                guildLocale:true,
                memberJoinMessage:true,
                memberLeaveMessage:true,
                memberJoinDmMessage:true 
            });
            if (adminLevel >= 9) Object.assign(allowedFields, { 
                blockedChannels:true,
                warnsToMute:true,
                warnsToTimeOut:true,
                warnsToKick:true,
                warnsToBan:true,
                warnDuration:true,
                gachaMaxRolls:true,
                gachaGameMode:true,
                gachaEnabled:true,
                gachaChestsEnabled:true,
                gachaRollsRefreshInterval:true,
                commandsEnabled:true,
                autoMessages:true,
                blockedUsers:true,
                blockedRoles:true 
            });

            const filteredData = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowedFields[k]));
            if (!Object.keys(filteredData).length)
                return res.status(403).json({ error: 'Nenhum campo permitido para alteração.', code: 'NO_ALLOWED_FIELDS' });

            await GuildService.updateGuildData(guildId, filteredData);
            return res.status(200).json({ 
                message: 'Guilda atualizada com sucesso.', 
                updatedFields: Object.keys(filteredData) 
            });
        } catch (error) {
            return routeError({ 
                res, 
                error, 
                route: ROUTE, 
                errorCode: 'UPDATE_GUILD_ADMIN_ERROR',
                userMsg: 'Erro ao atualizar guilda.', 
                extra: { 
                    email: decoded?.email, 
                    guildId: req.params?.guildId 
                } 
            });
        }
    }
};
