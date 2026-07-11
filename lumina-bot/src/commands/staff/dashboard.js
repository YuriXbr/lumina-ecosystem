const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    permission: 'admin',
    category: 'staff',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Reply with the website dashboard link.')
        .setDescriptionLocalizations(loc(
            'Responde com o link do dashboard do site.',
            'Responde con el link del dashboard del sitio.'
        )),

    execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const url = `${process.env.DASHBOARD_PROTOCOL || 'https'}://${process.env.DASHBOARD_HOST || 'luminasink.com'}`;

        const embed = new EmbedBuilder()
            .setTitle(translator('cmd.dashboard.title'))
            .setDescription(translator('cmd.dashboard.description', { url }))
            .setColor('Purple')
            .setURL(url);

        interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
