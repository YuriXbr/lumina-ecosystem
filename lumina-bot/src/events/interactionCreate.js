const { Events } = require('discord.js');
const { noPermission, dashboardLog, eventLogEmbed, commandErrorWarning } = require('../utils/logger/logger.js');
const { ActivityType } = require('discord.js');
const permissionsService = require('../utils/services/PermissionsService.js');
const botConfigService = require('../utils/services/EncryptionService.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;
        const { client } = interaction;

        const command = client.commands.get(interaction.commandName);
        if (!command) {
            await commandErrorWarning(
                interaction,
                new Error(`Comando /${interaction.commandName} não encontrado na coleção do bot.`),
                'Este comando não foi encontrado. Tente novamente ou contate um administrador.'
            );
            return;
        }

        client.user.setActivity({
            name: botConfigService.bot.activityName,
            type: ActivityType[botConfigService.bot.activityType],
            url: botConfigService.bot.activityUrl || undefined,
        });

        if (!await permissionsService.isBotStaff(interaction.user.id, 'owner') && command.permission === 'owner')
            return noPermission(command, interaction, 'InteractionCreate');
        if (!await permissionsService.isBotStaff(interaction.user.id, 'admin') && command.permission === 'admin')
            return noPermission(command, interaction, 'InteractionCreate');
        if (!await permissionsService.isBotStaff(interaction.user.id, 'moderator') && command.permission === 'moderator')
            return noPermission(command, interaction, 'InteractionCreate');

        try {
            await command.execute(interaction);
            // Log de sucesso — guarda uma referência rasa para não vazar memória
            eventLogEmbed(interaction, 'InteractionCreate',
                `/${interaction.commandName} executado por ${interaction.user.tag} em ${interaction.guild?.name ?? 'N/A'}`
            );
        } catch (error) {
            // error.apiContext é anexado pelo LuminaApiService quando a falha vem de uma chamada HTTP
            await commandErrorWarning(
                interaction,
                error,
                'Ocorreu um erro ao executar o comando. Nossa equipe foi notificada.',
                error.apiContext ?? null
            );
        }
    },
};
