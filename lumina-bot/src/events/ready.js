const { Events  } = require('discord.js');
const logger = require('../utils/logger/logger.js');
const { startPunishmentScheduler } = require('../utils/services/PunishmentScheduler');
const autoMessageService = require('../utils/services/AutoMessageService');

module.exports = {
        name: Events.ClientReady,
        once: true,
        async execute(client) {

                client.emit('reloadRPC', client);
                logger.sendStartMessage(client);

                try {
                        startPunishmentScheduler(client);
                } catch (err) {
                        console.error('[Ready] Failed to start punishment scheduler:', err.message);
                }

                try {
                        autoMessageService.start(client);
                } catch (err) {
                        console.error('[Ready] Failed to start auto message service:', err.message);
                }
        },
};
