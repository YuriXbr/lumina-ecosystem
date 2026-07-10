const { Events  } = require('discord.js');
const logger = require('../utils/logger/logger.js');
const { startPunishmentScheduler } = require('../utils/services/PunishmentScheduler');

module.exports = {
        name: Events.ClientReady,
        once: true,
        async execute(client) {

                client.emit('reloadRPC', client);
                logger.sendStartMessage(client);

                // Inicia o scheduler de punições persistente (MongoDB-based)
                // Resolve o problema de punições temporárias perdidas em restart
                try {
                        startPunishmentScheduler(client);
                } catch (err) {
                        console.error('[Ready] Failed to start punishment scheduler:', err.message);
                }
        },
};
