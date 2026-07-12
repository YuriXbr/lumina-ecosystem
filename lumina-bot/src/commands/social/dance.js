const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

const GIFS = [
    'https://cdn.nekotina.com/images/ZZZw2sjb.gif',
    'https://cdn.nekotina.com/images/NbH15ArU7.gif',
    'https://cdn.nekotina.com/images/_spoSXrl.gif',
    'https://cdn.nekotina.com/images/vWClT8qB.gif',
    'https://cdn.nekotina.com/images/6hTLRo33.gif',
    'https://cdn.nekotina.com/images/Sb9nDPI_.gif'
];

module.exports = {
    permission: 'everyone',
    category: 'social',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('dance')
        .setDescription('Dance with someone!')
        .setDescriptionLocalizations(loc('Dança com alguém!', '¡Baila con alguien!'))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to dance with')
                .setDescriptionLocalizations(loc('O usuário para dançar', 'El usuario para bailar'))
                .setRequired(true))
        .setContexts(0, 1, 2),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const target = interaction.options.getUser('user');
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setDescription(translator('cmd.social.dance.actionText', { author: interaction.user.username, target: target.username }))
            .setImage(gif)
            .setFooter({ text: 'Lumina Bot • Social' });

        await interaction.reply({ embeds: [embed] });
    },
};
