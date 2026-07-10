const DashboardAccountService   = require('../../../../database/services/DashboardAccountService');
const GuildService              = require('../../../../database/services/GuildService');
const { routeError, addLog }    = require('../../../../logger/logger');

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

// Audit #9: tipos esperados para cada campo whitelistado. Permite validar
// que o valor recebido no body corresponde ao tipo esperado antes de
// repassar ao banco — evita que um campo booleano vire string "false"
// (truthy) ou que um número vire array, etc.
const FIELD_TYPES = {
    djEnabled: 'boolean',
    memberWelcomeToggle: 'boolean',
    memberDmToggle: 'boolean',
    persistentMute: 'boolean',
    persistentWarns: 'boolean',
    autoWarnPunishment: 'boolean',
    canPunishStaff: 'boolean',
    gachaEnabled: 'boolean',
    gachaChestsEnabled: 'boolean',
    memberJoinChannelId: 'string',
    memberLeaveChannelId: 'string',
    moderationChannelId: 'string',
    botInfoChannelId: 'string',
    eventLogChannelId: 'string',
    djRoleId: 'string',
    muteRoleId: 'string',
    banRoleId: 'string',
    prefix: 'string',
    guildLocale: 'string',
    memberJoinMessage: 'string',
    memberLeaveMessage: 'string',
    memberJoinDmMessage: 'string',
    blockedChannels: 'object',
    warnsToMute: 'number',
    warnsToTimeOut: 'number',
    warnsToKick: 'number',
    warnsToBan: 'number',
    warnDuration: 'number',
    gachaMaxRolls: 'number',
    gachaGameMode: 'string',
    gachaRollsRefreshInterval: 'number',
    commandsEnabled: 'object',
    autoMessages: 'object',
    blockedUsers: 'object',
    blockedRoles: 'object',
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
        const { verifyRequestAuthWithAccountCheck } = require('../../../../utils/authHelpers');
        const { user: decoded, account: adminAccount, error: authError } = await verifyRequestAuthWithAccountCheck(req);
        if (authError) return res.status(authError.status).json({ error: authError.message, code: authError.code });

        try {
            const { guildId } = req.params;
            if (!adminAccount) return res.status(404).json({ error: 'Conta de administrador não encontrada.', code: 'ACCOUNT_NOT_FOUND' });
            // Audit #4: bloqueia contas suspensas de usar rotas admin
            if (adminAccount.banned || adminAccount.blocked)
                return res.status(403).json({ error: 'Conta suspensa.', code: 'ACCOUNT_SUSPENDED' });

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

            // Audit #9: valida o TIPO de cada campo whitelistado presente no body.
            // Rejeita 400 imediatamente se houver mismatch (boolean virando string,
            // número virando array, etc.) — evita coerção silenciosa pelo MongoDB.
            const typeErrors = [];
            for (const [key, value] of Object.entries(req.body)) {
                if (!allowedFields[key]) continue;
                const expected = FIELD_TYPES[key];
                if (!expected) continue;
                // null é aceito como "limpar" para campos opcionais; checamos só
                // quando o valor não é null/undefined.
                if (value === null || value === undefined) continue;
                let actual = Array.isArray(value) ? 'object' : typeof value;
                if (actual !== expected) {
                    typeErrors.push({ field: key, expected, actual });
                }
            }
            if (typeErrors.length) {
                return res.status(400).json({
                    error: 'Tipo de campo inválido.',
                    code: 'INVALID_FIELD_TYPE',
                    details: typeErrors,
                });
            }

            const filteredData = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowedFields[k]));
            if (!Object.keys(filteredData).length)
                return res.status(403).json({ error: 'Nenhum campo permitido para alteração.', code: 'NO_ALLOWED_FIELDS' });

            await GuildService.updateGuildData(guildId, filteredData);

            // Audit #10: log de auditoria para toda alteração de config de guilda
            addLog('API', 'admin.guild.update', `Guilda ${guildId} atualizada por ${decoded.email}`, {
                userEmail: decoded.email,
                extra: { guildId, updatedFields: Object.keys(filteredData) },
            });

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
