const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');
const axios = require('axios');

const GIFS = [
    'https://cdn.nekotina.com/images/OZVkjHDww.gif',
    'https://cdn.nekotina.com/images/rVOW9p7O.gif',
    'https://cdn.nekotina.com/images/h1hCPYp_.gif',
    'https://cdn.nekotina.com/images/wnB3gF-XL.gif',
    'https://cdn.nekotina.com/images/VXdDkx2a2.gif',
    'https://cdn.nekotina.com/images/v3mAv8OMR.gif'
];

module.exports = {
    permission: 'everyone',
    category: 'social',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('smile')
        .setDescription('Smile at someone!')
        .setDescriptionLocalizations(loc('Sorri para alguém!', '¡Sonríe a alguien!'))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to smile at')
                .setDescriptionLocalizations(loc('O usuário para sorrir', 'El usuario para sonreír'))
                .setRequired(true))
        .setContexts(0, 1, 2),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const target = interaction.options.getUser('user');
        //const gif = GIFS[Math.floor(Math.random() * GIFS.length)];
        const result = await axios.get('https://api.otakugifs.xyz/gif?reaction=smile&format=gif');

        const embed = new EmbedBuilder()
            .setColor(0xffdf00)
            .setDescription(translator('cmd.social.smile.actionText', { author: interaction.user.username, target: target.username }))
            .setImage(gif)
            .setFooter({ text: 'Lumina Bot • Social' });

        await interaction.reply({ embeds: [embed] });
    },
};
