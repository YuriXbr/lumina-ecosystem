const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');
const axios = require('axios');

const GIFS = [
    'https://cdn.nekotina.com/images/_HYJYgYI.gif',
    'https://cdn.nekotina.com/images/iWLinJMe.gif',
    'https://cdn.nekotina.com/images/1hMECwJO.gif',
    'https://cdn.nekotina.com/images/9SSh8_ON.gif',
    'https://cdn.nekotina.com/images/34RE2EWe.gif',
];

module.exports = {
    permission: 'everyone',
    category: 'social',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Hug someone!')
        .setDescriptionLocalizations(loc('Abraça alguém!', '¡Abraza a alguien!'))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to hug')
                .setDescriptionLocalizations(loc('O usuário para abraçar', 'El usuario para abrazar'))
                .setRequired(true))
        .setContexts(0, 1, 2),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const target = interaction.options.getUser('user');
        //const gif = GIFS[Math.floor(Math.random() * GIFS.length)];
        const result = await axios.get('https://api.otakugifs.xyz/gif?reaction=hug&format=gif');

        const embed = new EmbedBuilder()
            .setColor(0xff69b4)
            .setDescription(translator('cmd.social.hug.actionText', { author: interaction.user.username, target: target.username }))
            .setImage(result.data.url)
            .setFooter({ text: 'Lumina Bot • Social' });

        await interaction.reply({ embeds: [embed] });
    },
};
