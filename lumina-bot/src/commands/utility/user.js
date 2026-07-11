const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Provides information about the user.')
        .setDescriptionLocalizations(loc('Fornece informações sobre o usuário.', 'Proporciona información sobre el usuario.')),

    execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));

        const embed = new EmbedBuilder()
            .setTitle(`${translator('cmd.user.title')} — ${interaction.user.username}`)
            .setColor('Blue')
            .setThumbnail(interaction.user.avatarURL())
            .addFields(
                { name: translator('cmd.user.usernameField'),        value: interaction.user.username, inline: true },
                { name: translator('cmd.user.idField'),              value: interaction.user.id, inline: true },
                { name: translator('cmd.user.accountCreatedField'),  value: interaction.user.createdAt.toDateString(), inline: true },
                { name: translator('cmd.user.joinedField'),          value: interaction.member?.joinedAt?.toDateString() ?? 'N/A', inline: true },
            );

        interaction.reply({ embeds: [embed] });
    },
};
