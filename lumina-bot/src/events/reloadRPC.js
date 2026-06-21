const { ActivityType } = require('discord.js');
const botConfigService = require('../utils/services/EncryptionService.js');

module.exports = {
	name: 'reloadRPC',
	execute(client) {

		 client.user.setActivity({
		 	name: botConfigService.bot.activityName,
			type: ActivityType[botConfigService.bot.activityType],
			url: botConfigService.bot.activityUrl || undefined
		});

		//console.log('RPC reloaded. Activity:', config.bot.activity.name);
	},
};