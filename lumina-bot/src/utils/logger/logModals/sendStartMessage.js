const publicIp = require( 'public-ip' );
const { createReadyEmbed } = require('../../embeds/readyEmbed.js');
const {dashboardLog} = require('./dashboardLog.js');

const botConfigService = require('../../services/EncryptionService.js');

const colorCodes = require('../../colorCodes.js');


let client = null;

const mainGuild = botConfigService.bot.mainGuild;
const startChannel = botConfigService.bot.logStartChannel;
const allChannel = botConfigService.bot.logAllChannel;

/** Send Start Message
 * @param {object} receivedClient - The client object
 */
async function sendStartMessage(receivedClient) {
    client = receivedClient;

    const guild = client.guilds.cache.get(mainGuild);
    const channel = guild.channels.cache.get(startChannel || allChannel);
    await channel.send({ embeds: [await createReadyEmbed()] });

    console.log(colorCodes.arrow + colorCodes.verdebold(`BOT FOI INICIADO ${client.user.tag} (ID: ${client.user.id})`));
    console.log(colorCodes.arrow + colorCodes.verdebold(`GUILD: ${guild.name} (ID: ${guild.id})`));
    console.log(colorCodes.arrow + colorCodes.verdebold(`DATA DE CONEXÃO: ${new Date().toLocaleString()}`));
}

module.exports = {
    sendStartMessage,
    client
};

