const { EmbedBuilder } = require('discord.js');
const colorCodes = require('../../colorCodes.js');
const botConfigService = require('../../services/EncryptionService.js');
const i18n = require('../../i18n/index.js');

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
    const locale = i18n.resolveFromInteraction(interaction);
    const t = i18n.getTranslator(locale);
    const ts = new Date().toLocaleString('pt-BR').replace(',', '');

    console.log(colorCodes.arrow + colorCodes.alerta(
        `[NO PERMISSION] ${ts} | ${interaction.user.tag} (${interaction.user.id}) tentou usar /${command.data.name} sem permissão | Guild: ${interaction.guild?.name} (${interaction.guild?.id})`
    ));

    // Embed de resposta ao usuário (traduzido)
    const userEmbed = new EmbedBuilder()
        .setTitle(t('logModal.noPermissionTitle'))
        .setDescription(`${t('logModal.noPermissionDesc')} \`/${command.data.name}\`.`)
        .setColor(0xFF9800);

    // Log no canal de eventos (campos traduzidos)
    try {
        const client  = interaction.client;
        const guild   = client.guilds.cache.get(mainGuild);
        const channel = guild?.channels.cache.get(eventsChannel || allChannel);

        if (channel) {
            const logEmbed = new EmbedBuilder()
                .setTitle(`${t('logModal.noPermissionTitle')} — \`/${command.data.name}\``)
                .setColor(0xFF9800)
                .addFields(
                    { name: t('logModal.fieldUser'),  value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                    { name: t('logModal.fieldGuild'), value: `${interaction.guild?.name ?? 'N/A'} (${interaction.guild?.id ?? 'N/A'})`, inline: true },
                    { name: t('logModal.fieldEvent'), value: eventCaller, inline: true },
                    { name: t('logModal.fieldTime'),  value: `\`${ts}\``, inline: true },
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
