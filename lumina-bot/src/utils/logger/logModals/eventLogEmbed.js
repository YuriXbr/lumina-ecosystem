const botConfigService = require('../../services/EncryptionService.js');


const mainGuild = botConfigService.bot.mainGuild;
const eventsChannel = botConfigService.bot.logEventsChannel;
const allChannel = botConfigService.bot.logAllChannel;

    /** This function is used to log events in the events channel
     * @param {object} interaction - The interaction object
     * @param {string} eventCaller - The name of the event
     * @param {string} message - The message that will be displayed in the embed
     */
function eventLogEmbed(interaction, eventCaller, message) {
    const embed = {
        title: `Evento ${eventCaller}`,
        description: message
    }
    const client = interaction.client;
    const guild = client.guilds.cache.get(mainGuild);
    const channel = guild.channels.cache.get(eventsChannel || allChannel);
    channel.send({ embeds: [embed] });
}

module.exports = {
    eventLogEmbed,
};