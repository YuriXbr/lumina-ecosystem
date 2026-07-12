const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

const GIFS = [
    'https://cdn.nekotina.com/images/8JfApwdl.gif',
    'https://cdn.nekotina.com/images/4Sb07sLJ.gif',
    'https://cdn.nekotina.com/images/VPPZWBin.gif',
    'https://cdn.nekotina.com/images/M_zDzwCH.gif',
    'https://cdn.nekotina.com/images/EQQ-TVAt.gif',
    'https://cdn.nekotina.com/images/rN2hDir2.gif',
    'https://cdn.nekotina.com/images/g2FiClix.gif',
    'https://cdn.nekotina.com/images/dUTutY96.gif',
    'https://cdn.nekotina.com/images/nxraD3S-.gif',
    'https://cdn.nekotina.com/images/qK2nkbkH.gif',
    'https://cdn.nekotina.com/images/-libdSfxB.gif',
    'https://cdn.nekotina.com/images/JXuZ1DpJ9.gif',
    'https://cdn.nekotina.com/images/9p3BSQ4R.gif'
];

module.exports = {
    permission: 'everyone',
    category: 'social',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Kiss someone!')
        .setDescriptionLocalizations(loc('Beija alguém!', '¡Besa a alguien!'))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kiss')
                .setDescriptionLocalizations(loc('O usuário para beijar', 'El usuario para besar'))
                .setRequired(true))
        .setContexts(0, 1, 2),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const target = interaction.options.getUser('user');
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setColor(0xff69b4)
            .setDescription(translator('cmd.social.kiss.actionText', { author: interaction.user.username, target: target.username }))
            .setImage(gif)
            .setFooter({ text: 'Lumina Bot • Social' });

        await interaction.reply({ embeds: [embed] });
    },
};
