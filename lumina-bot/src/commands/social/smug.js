const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');
const axios = require('axios');

const actionName = 'smug';

module.exports = {
    permission: 'everyone',
    category: 'social',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName(actionName)
        .setDescription('Perform the smug action!')
        .setDescriptionLocalizations(loc('Realize a ação smug!', '¡Realiza la acción smug!'))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to smug')
                .setDescriptionLocalizations(loc('O usuário para smug', 'El usuario para smug'))
                .setRequired(true))
        .setContexts(0, 1, 2),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const target = interaction.options.getUser('user');
        const result = await axios.get('https://api.otakugifs.xyz/gif?reaction=smug&format=gif');

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setDescription(translator(`cmd.social.${actionName}.actionText`, { author: interaction.user.username, target: target.username }))
            .setImage(result.data.url)
            .setFooter({ text: 'Lumina Bot • Social' });

        await interaction.reply({ embeds: [embed] });
    },
};