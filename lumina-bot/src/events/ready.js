const { Events  } = require('discord.js');
const logger = require('../utils/logger/logger.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {

		client.emit('reloadRPC', client);
		logger.sendStartMessage(client);
	},
};