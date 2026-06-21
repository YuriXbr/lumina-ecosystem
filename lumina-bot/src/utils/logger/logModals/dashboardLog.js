const colorCodes = require('../../colorCodes.js');
const botConfigService = require('../../services/EncryptionService.js');


const mainGuild = botConfigService.bot.mainGuild;
const dashboardChannel = botConfigService.bot.logDashboardChannel;
const allChannel = botConfigService.bot.logAllChannel;


    /** Dashboard Log
     * @param {object} receivedClient - The client object
     * @param {string} message - The message that will be displayed in the embed
     * @param {boolean} silent - If the message won't be sent to the logs channel (default: true)
     * @param {boolean} clogSilent - If the console log will be silent (default: true)
     */
async function dashboardLog(receivedClient, message, silent, clogSilent) {
    client = receivedClient;

    const embed = {
        title: 'Dashboard',
        description: message
    }
    if(!clogSilent) console.log(colorCodes.arrow + colorCodes.alerta(`[DASHBOARD]: ${message}`));
    if (!silent) {
        const guild = client.guilds.cache.get(mainGuild);
        const channel = guild.channels.cache.get(dashboardChannel || allChannel);
        channel.send({ embeds: [embed] });
    }

}

module.exports = {
    dashboardLog
};