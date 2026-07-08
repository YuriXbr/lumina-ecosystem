const { EmbedBuilder } = require('discord.js');
const colorCodes = require('../../colorCodes.js');
const botConfigService = require('../../services/EncryptionService.js');

const mainGuild    = botConfigService.bot.mainGuild;
const eventsChannel = botConfigService.bot.logEventsChannel;
const allChannel   = botConfigService.bot.logAllChannel;

/**
 * Notifica o usuário e loga que tentou usar um comando sem permissão.
 * @param {object} command          - Objeto do comando
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string} eventCaller      - Nome do evento que disparou
 */
async function noPermission(command, interaction, eventCaller) {
    const ts = new Date().toLocaleString('pt-BR').replace(',', '');

    console.log(colorCodes.arrow + colorCodes.alerta(
        `[NO PERMISSION] ${ts} | ${interaction.user.tag} (${interaction.user.id}) tentou usar /${command.data.name} sem permissão | Guild: ${interaction.guild?.name} (${interaction.guild?.id})`
    ));

    // Embed de resposta ao usuário
    const userEmbed = new EmbedBuilder()
        .setTitle('🚫 Sem permissão')
        .setDescription(`Você não tem permissão para usar o comando \`/${command.data.name}\`.`)
        .setColor(0xFF9800);

    // Log no canal de eventos
    try {
        const client  = interaction.client;
        const guild   = client.guilds.cache.get(mainGuild);
        const channel = guild?.channels.cache.get(eventsChannel || allChannel);

        if (channel) {
            const logEmbed = new EmbedBuilder()
                .setTitle(`🚫 Sem Permissão — \`/${command.data.name}\``)
                .setColor(0xFF9800)
                .addFields(
                    { name: '👤 Usuário',  value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                    { name: '🏠 Guild',    value: `${interaction.guild?.name ?? 'N/A'} (${interaction.guild?.id ?? 'N/A'})`, inline: true },
                    { name: '📣 Evento',   value: eventCaller, inline: true },
                    { name: '🕐 Horário', value: `\`${ts}\``, inline: true },
                )
                .setTimestamp();

            await channel.send({ embeds: [logEmbed] });
        }
    } catch (err) {
        console.error('[noPermission] Falha ao enviar embed:', err.message);
    }

    if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ embeds: [userEmbed], ephemeral: true });
    } else {
        return interaction.reply({ embeds: [userEmbed], ephemeral: true });
    }
}

module.exports = { noPermission };
