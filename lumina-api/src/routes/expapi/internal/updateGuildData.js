const GuildService   = require('../../../database/services/GuildService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/updateguilddata';

// Whitelist de campos que o bot pode atualizar em uma guilda.
// Qualquer campo fora desta lista é silenciosamente ignorado (defense-in-depth
// contra mass assignment — mesmo que o internal key vaze, não permite
// sobrescrever _id, guildOwnerId, etc.).
const ALLOWED_GUILD_FIELDS = new Set([
    'guildReferenceName',
    'muteRoleId',
    'banRoleId',
    'moderationChannelId',
    'memberCount',
    'memberWelcomeToggle',
    'memberJoinChannelId',
    'memberJoinMessage',
    'memberLeaveChannelId',
    'memberLeaveMessage',
    'memberJoinDmMessage',
    'memberDmToggle',
    'prefix',
    'djEnabled',
    'djRoleId',
    'persistentMute',
    'persistentWarns',
    'warnsToMute',
    'warnsToTimeOut',
    'warnsToKick',
    'warnsToBan',
    'autoWarnPunishment',
    'botInfoChannelId',
    'eventLogChannelId',
    'guildLocale',
    'canPunishStaff',
    'blockedChannels',
    'gachaRolls',
    'gachaMaxRolls',
    'gachaGameMode',
    'gachaRollsRefreshInterval',
    'gachaRollsLastRefresh',
    'gachaEnabled',
    'gachaChestsEnabled',
    'commandsEnabled',
    'autoMessages',
    'blockedUsers',
    'blockedRoles',
]);

module.exports = {
    route: '/expapi/internal/updateguilddata',
    description: "Atualiza os dados da guilda (apenas campos whitelistados)",
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { guildId, ...rawData } = req.body || {};
        if (!guildId)
            return res.status(400).json({ error: 'Parámetro guildId é obrigatório.', code: 'MISSING_GUILD_ID' });

        // Filtra apenas campos permitidos
        const data = {};
        for (const key of Object.keys(rawData)) {
            if (ALLOWED_GUILD_FIELDS.has(key)) {
                data[key] = rawData[key];
            }
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                error: 'Nenhum campo válido para atualização.',
                code: 'NO_VALID_FIELDS',
            });
        }

        try {
            const updatedGuild = await GuildService.updateGuildData(guildId, data);
            return res.status(200).json({
                message: 'Dados da guilda atualizados com sucesso.',
                updatedFields: Object.keys(data),
                updatedGuild,
            });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'UPDATE_GUILD_ERROR',
                userMsg: 'Erro ao atualizar dados da guilda.', extra: { guildId } });
        }
    },
};
