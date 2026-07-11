const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Provides information about the server.')
        .setDescriptionLocalizations(loc('Fornece informações sobre o servidor.', 'Proporciona información sobre el servidor.')),

    execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        try {
            const embed = new EmbedBuilder()
                .setTitle(`${translator('cmd.server.title')} — ${interaction.guild.name}`)
                .setColor('Aqua')
                .setThumbnail(interaction.guild.iconURL())
                .addFields(
                    { name: translator('cmd.server.nameField'),    value: interaction.guild.name, inline: true },
                    { name: translator('cmd.server.idField'),      value: interaction.guild.id, inline: true },
                    { name: translator('cmd.server.createdField'), value: interaction.guild.createdAt.toLocaleDateString(translator === i18n.getTranslator('en-US') ? 'en-US' : (translator === i18n.getTranslator('pt-BR') ? 'pt-BR' : 'es-ES')), inline: true },
                    { name: translator('cmd.server.membersField'), value: interaction.guild.memberCount.toString(), inline: true },
                    { name: translator('cmd.server.boostLevelField'), value: interaction.guild.premiumTier?.toString() || '0', inline: true },
                );

            interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            interaction.reply({ content: translator('common.commandError'), ephemeral: true });
        }
    },
};
