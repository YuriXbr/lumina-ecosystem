const colorCodes = require('../../colorCodes.js');

    
    /** No Permission Message Embed
     * @param {object} command - The command object
     * @param {object} interaction - The interaction object
     * @param {string} eventCaller - The event that called this function
     */
    async function noPermission(command, interaction, eventCaller) {
        const embed = {
            title: 'Sem permissão',
            description: `Você não tem permissão para usar o comando \`${command.data.name}\`.`
        }
        console.log(colorCodes.arrow + colorCodes.alerta(`[NO PERMISSION]: ${interaction.user.tag} tentou usar o comando ${command.data.name} sem permissão`));
        const client = interaction.client;
        const guild = client.guilds.cache.get(mainGuild);
        const channel = guild.channels.cache.get(eventsChannel || allChannel);
    
        const eventLogEmbed = {
            title: `Evento ${eventCaller}`,
            description: `O usuário ${interaction.user.tag} tentou usar o comando ${command.data.name} sem permissão.`
        }
        
        channel.send({ embeds: [eventLogEmbed] });
        if(interaction.replied || interaction.deferred) {
            return interaction.followUp({ embeds: [embed], ephemeral: true });
        } else {
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

module.exports = {
    noPermission
};