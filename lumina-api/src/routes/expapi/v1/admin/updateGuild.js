const jwt = require('jsonwebtoken');
const DashboardAccountService = require('../../../../database/services/DashboardAccountService');
const GuildService = require('../../../../database/services/GuildService');

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
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const email = decoded.email;
            const guildId = req.params.guildId;
            const updateData = req.body;

            // Busca a conta do administrador
            const adminAccount = await DashboardAccountService.getDashboardAccountByEmail(email);
            if (!adminAccount) {
                return res.status(404).json({ error: 'Conta de administrador não encontrada' });
            }

            // Verifica permissões
            const accessLevels = {
                user: 0, vipUser: 1, enterpriseUser: 2, contentCreator: 3, tester: 4,
                support: 5, moderator: 6, admin: 7, headadmin: 8, developer: 9, coowner: 10, owner: 11
            };

            const adminLevel = accessLevels[adminAccount.accessType] || 0;
            if (adminLevel < 7) {
                return res.status(403).json({ error: 'Permissão insuficiente para modificar guildas' });
            }

            // Busca a guilda
            const guild = await GuildService.getGuildData(guildId);
            if (!guild) {
                return res.status(404).json({ error: 'Guilda não encontrada' });
            }

            // Define campos permitidos baseado no nível
            const allowedFields = {};

            // Admins+ podem alterar configurações básicas
            if (adminLevel >= 7) {
                Object.assign(allowedFields, {
                    djEnabled: true,
                    memberWelcomeToggle: true,
                    memberDmToggle: true,
                    persistentMute: true,
                    persistentWarns: true,
                    autoWarnPunishment: true,
                    canPunishStaff: true
                });
            }

            // HeadAdmins+ podem alterar configurações avançadas
            if (adminLevel >= 8) {
                Object.assign(allowedFields, {
                    memberJoinChannelId: true,
                    memberLeaveChannelId: true,
                    moderationChannelId: true,
                    botInfoChannelId: true,
                    eventLogChannelId: true,
                    djRoleId: true,
                    muteRoleId: true,
                    banRoleId: true,
                    prefix: true,
                    guildLocale: true,
                    memberJoinMessage: true,
                    memberLeaveMessage: true,
                    memberJoinDmMessage: true
                });
            }

            // Developers+ podem alterar qualquer configuração
            if (adminLevel >= 9) {
                Object.assign(allowedFields, {
                    blockedChannels: true,
                    warnsToMute: true,
                    warnsToTimeOut: true,
                    warnsToKick: true,
                    warnsToBan: true,
                    warnDuration: true,
                    gachaMaxRolls: true,
                    gachaGameMode: true
                });
            }

            // Filtra apenas campos permitidos
            const filteredData = {};
            Object.keys(updateData).forEach(key => {
                if (allowedFields[key]) {
                    filteredData[key] = updateData[key];
                }
            });

            if (Object.keys(filteredData).length === 0) {
                return res.status(403).json({ error: 'Nenhum campo permitido para alteração' });
            }

            // Atualiza a guilda
            await GuildService.updateGuildData(guildId, filteredData);

            return res.status(200).json({ 
                message: 'Guilda atualizada com sucesso',
                updatedFields: Object.keys(filteredData)
            });
        } catch (error) {
            console.error('Erro ao atualizar guilda:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};
