const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');
const axios = require('axios');

const GIFS = [
    'https://cdn.nekotina.com/images/ofuNeQ6H.gif',
    'https://cdn.nekotina.com/images/Pn5n5DCBN.gif',
    'https://cdn.nekotina.com/images/D_8WdHnM.gif',
    'https://cdn.nekotina.com/images/TuULy3JrM.gif',
    'https://cdn.nekotina.com/images/NIgXAhW7x.gif',
    'https://cdn.nekotina.com/images/k-olFZUW.gif',
    'https://cdn.nekotina.com/images/mY1rKkV5.gif'
];

module.exports = {
    permission: 'everyone',
    category: 'social',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('laugh')
        .setDescription('Laugh at someone!')
        .setDescriptionLocalizations(loc('Ri de alguém!', '¡Ríete de alguien!'))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to laugh at')
                .setDescriptionLocalizations(loc('O usuário para rir', 'El usuario para reírse'))
                .setRequired(true))
        .setContexts(0, 1, 2),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const target = interaction.options.getUser('user');
        const result = await axios.get('https://api.otakugifs.xyz/gif?reaction=laugh&format=gif');
        //const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription(translator('cmd.social.laugh.actionText', { author: interaction.user.username, target: target.username }))
            .setImage(result.data.url)
            .setFooter({ text: 'Lumina Bot • Social' });

        await interaction.reply({ embeds: [embed] });
    },
};
