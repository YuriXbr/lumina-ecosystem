const colorCodes = require('../../colorCodes.js');
const botConfigService = require('../../services/EncryptionService.js');
const mainGuild = botConfigService.bot.mainGuild;
const errorChannel = botConfigService.bot.logErrorChannel;
const allChannel = botConfigService.bot.logAllChannel;


/** Send Error Messages
 * @param {string} error - The error message
 */
async function sendErrorMessages(error, client) {
    const guild = client.guilds.cache.get(mainGuild);
    const channel = guild.channels.cache.get(errorChannel || allChannel);
    console.log(colorCodes.arrow + colorCodes.vermelhobold(`ERRO: ${error}`));
    channel.send(`ERRO: ${error}`);
}

module.exports = {
    sendErrorMessages
};