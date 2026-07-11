const { SlashCommandBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc, PT, ES } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!')
        .setDescriptionLocalizations(loc('Responde com Pong!', '¡Responde con Pong!')),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const sent = await interaction.reply({ content: translator('common.loading'), fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        interaction.editReply(translator('cmd.ping.description', { latency, apiLatency: interaction.client.ws.ping }));
    },
};
