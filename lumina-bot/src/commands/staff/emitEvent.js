const { SlashCommandBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    permission: 'admin',
    category: 'staff',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Emit a custom event.')
        .setDescriptionLocalizations(loc('Emite um evento personalizado.', 'Emite un evento personalizado.'))
        .addStringOption(option =>
            option.setName('event')
                .setDescription('The event to emit.')
                .setDescriptionLocalizations(loc('O evento para emitir.', 'El evento para emitir.'))
                .setRequired(true))
        .addStringOption(option =>
            option.setName('data')
                .setDescription('The data to emit.')
                .setDescriptionLocalizations(loc('Os dados para emitir.', 'Los datos para emitir.'))
                .setRequired(false)),

    execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const { client } = interaction;

        try {
            const eventName = interaction.options.getString('event');
            const eventData = interaction.options.getString('data') || client;
            // Whitelist of safe events that can be emitted
        const ALLOWED_EVENTS = new Set(['reloadRPC', 'guildCreate', 'guildDelete']);
        if (!ALLOWED_EVENTS.has(eventName)) {
            return interaction.editReply({ content: `Event "${eventName}" is not in the allowed list. Allowed: ${[...ALLOWED_EVENTS].join(', ')}`, ephemeral: true });
        }
        client.emit(eventName, eventData);
            interaction.reply({
                content: translator('cmd.event.emitted', { event: eventName, data: eventData === client ? 'client' : eventData }),
                ephemeral: true,
            });
        } catch (error) {
            console.log(error);
            interaction.reply({
                content: translator('cmd.event.error', { error: String(error) }),
                ephemeral: true,
            });
        }
    },
};
