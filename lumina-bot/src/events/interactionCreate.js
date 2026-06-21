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
		
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) {
			commandErrorWarning(interaction, 'No command matching the name was found.', 'No command matching the name was found.');
			return;
		}

        client.user.setActivity({
            name: botConfigService.bot.activityName,
            type: ActivityType[botConfigService.bot.activityType],
			url: botConfigService.bot.activityUrl || undefined
        });


		if (!await permissionsService.isBotStaff(interaction.user.id, 'owner') && command.permission == 'owner') return noPermission(command, interaction, 'InteractionCreate');
		if (!await permissionsService.isBotStaff(interaction.user.id, 'admin') && (command.permission == 'admin' )) return noPermission(command, interaction, 'InteractionCreate');
		if (!await permissionsService.isBotStaff(interaction.user.id, 'moderator') && command.permission == 'moderator') return noPermission(command, interaction, 'InteractionCreate');

		

		try {
			let buffer = interaction;
			await command.execute(interaction);
			eventLogEmbed(buffer, 'InteractionCreate', `Command ${interaction.commandName} was executed by ${interaction.user.tag} in ${interaction.guild.name} in ${interaction.lang}.`);
			buffer = null;
		} catch (error) {
			await commandErrorWarning(interaction, error, 'An error occurred while executing the command.');
		}
	},
};