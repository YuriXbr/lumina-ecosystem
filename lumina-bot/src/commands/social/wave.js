const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

const GIFS = [
    'https://media.tenor.com/iYe5Yfw0J6kAAAAC/anime-hug.gif',
    'https://media.tenor.com/7V9OjX0-q0kAAAAC/anime-hug.gif',
    'https://media.tenor.com/wr3Jx0V2USwAAAAC/anime-hug.gif',
    'https://media.tenor.com/N-HMmABoF00AAAAC/anime-hug.gif',
    'https://media.tenor.com/x8YYr3qDhEAAAAAC/anime-hug.gif',
];

module.exports = {
    permission: 'everyone',
    category: 'social',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('wave')
        .setDescription('Wave at someone!')
        .setDescriptionLocalizations(loc('Acena para alguém!', '¡Saluda a alguien!'))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to wave at')
                .setDescriptionLocalizations(loc('O usuário para acenar', 'El usuario para saludar'))
                .setRequired(true))
        .setContexts(0, 1, 2),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const target = interaction.options.getUser('user');
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setDescription(translator('cmd.social.wave.actionText', { author: interaction.user.username, target: target.username }))
            .setImage(gif)
            .setFooter({ text: 'Lumina Bot • Social' });

        await interaction.reply({ embeds: [embed] });
    },
};
