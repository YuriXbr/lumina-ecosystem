const { EmbedBuilder } = require('discord.js');
const colorCodes = require('../../colorCodes.js');
const botConfigService = require('../../services/EncryptionService.js');
const mainGuild = botConfigService.bot.mainGuild;
const errorChannel = botConfigService.bot.logErrorChannel;
const allChannel = botConfigService.bot.logAllChannel;

    /** Command Error Warning
     * @param {object} interaction - The interaction object
     * @param {string} error - The error message
     * @param {string} message - The message that will be displayed in the embed
     */
async function commandErrorWarning(interaction, error, message = 'No message provided') {
    const embed = {
        title: 'Erro',
        description: message
    }
    const client = interaction.client;
    const guild = client.guilds.cache.get(mainGuild);
    const channel = guild.channels.cache.get(errorChannel || allChannel);

    const errorLogEmbed = new EmbedBuilder()
        .setTitle(`ERRO EM \`${interaction.commandName}\``)
        .setDescription(`\`\`\`${error}\`\`\``)
        .setTimestamp()
        .addFields([
            { name: 'Usuário', value: `${interaction.user.tag}(${interaction.user.id})`, inline: true },
            { name: 'Servidor', value: `${guild.name} - ${guild.id}`, inline: true },
            { name: 'Canal', value: `${interaction.channel.name}(${interaction.channel.id})`, inline: true },
            { name: 'UserLocale', value: `${interaction.locale}`, inline: true },
            { name: 'guildLocale', value: `${interaction.guildLocale}`, inline: true },
            { name: 'deferred', value: `${interaction.deferred}`, inline: true },
            { name: 'replied', value: `${interaction.replied}`, inline: true },
            { name: 'ephemeral', value: `${interaction.ephemeral}`, inline: true },
            { name: 'commandId', value: `${interaction.commandId}`, inline: true },
            { name: 'commandType', value: `${interaction.commandType}`, inline: true },
        ])

    console.log(colorCodes.arrow + colorCodes.alerta(`[COMMAND ERROR]: ${interaction.user.tag} tentou usar o comando \`${interaction.commandName}\` e ocorreu um erro:`));
    console.log(colorCodes.error + colorCodes.alerta(error));
    channel.send({ embeds: [errorLogEmbed] });
    if(interaction.replied || interaction.deferred || !interaction) {
        return interaction.followUp({ embeds: [embed], ephemeral: true });
    } else {
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
 
}

module.exports = {
    commandErrorWarning
};