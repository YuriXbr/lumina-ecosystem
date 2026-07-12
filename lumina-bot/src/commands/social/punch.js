const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');
const axios = require('axios');

const GIFS = [
    'https://cdn.nekotina.com/images/hvjmXGym.gif',
    'https://cdn.nekotina.com/images/hvjmXGym.gif',
    'https://cdn.nekotina.com/images/qOshsEr2.gif',
    'https://cdn.nekotina.com/images/P30Z6tF6.gif',
    'https://cdn.nekotina.com/images/3-SXpRYQz.gif',
    'https://cdn.nekotina.com/images/KGzscWyAu.gif'
];

module.exports = {
    permission: 'everyone',
    category: 'social',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('punch')
        .setDescription('Punch someone!')
        .setDescriptionLocalizations(loc('Soca alguém!', '¡Golpea a alguien!'))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to punch')
                .setDescriptionLocalizations(loc('O usuário para socar', 'El usuario para golpear'))
                .setRequired(true))
        .setContexts(0, 1, 2),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const target = interaction.options.getUser('user');
        //const gif = GIFS[Math.floor(Math.random() * GIFS.length)];
        const result = await axios.get('https://api.otakugifs.xyz/gif?reaction=punch&format=gif');


        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription(translator('cmd.social.punch.actionText', { author: interaction.user.username, target: target.username }))
            .setImage(result.data.url)
            .setFooter({ text: 'Lumina Bot • Social' });

        await interaction.reply({ embeds: [embed] });
    },
};
