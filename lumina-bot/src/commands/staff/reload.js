// A command to reload a specific command, event or config
const { SlashCommandBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    permission: 'admin',
    category: 'staff',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload a specific section.')
        .setDescriptionLocalizations(loc('Recarrega uma seção específica.', 'Recarga una sección específica.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('command')
                .setDescription('Reload a command.')
                .setDescriptionLocalizations(loc('Recarrega um comando.', 'Recarga un comando.'))
                .addStringOption(option =>
                    option.setName('command')
                        .setDescription('The command to reload.')
                        .setDescriptionLocalizations(loc('O comando para recarregar.', 'El comando para recargar.'))
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('event')
                .setDescription('Reload an event.')
                .setDescriptionLocalizations(loc('Recarrega um evento.', 'Recarga un evento.'))
                .addStringOption(option =>
                    option.setName('event')
                        .setDescription('The event to reload.')
                        .setDescriptionLocalizations(loc('O evento para recarregar.', 'El evento para recargar.'))
                        .setRequired(true))),

    execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const client = interaction.client;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'command') {
            const commandName = interaction.options.getString('command');
            const command = client.commands.get(commandName);

            if (!command) {
                return interaction.reply({
                    content: translator('cmd.reload.notFound', {
                        type: translator('cmd.reload.typeCommand'),
                        name: commandName,
                    }),
                    ephemeral: true,
                });
            }

            // Validate commandName to prevent path traversal
        if (!/^[a-zA-Z0-9_-]+$/.test(commandName)) {
            return interaction.reply({content: 'Invalid command name.', ephemeral: true});
        }
        delete require.cache[require.resolve(`../${command.category}/${commandName}.js`)];
            const newCommand = require(`../${command.category}/${commandName}.js`);
            client.commands.set(newCommand.data.name, newCommand);

            return interaction.reply({
                content: translator('cmd.reload.description', {
                    type: translator('cmd.reload.typeCommand'),
                    name: commandName,
                }),
                ephemeral: true,
            });
        } else if (subcommand === 'event') {
            const eventName = interaction.options.getString('event');
            const event = client.events?.get(eventName);

            if (!event) {
                return interaction.reply({
                    content: translator('cmd.reload.notFound', {
                        type: translator('cmd.reload.typeEvent'),
                        name: eventName,
                    }),
                    ephemeral: true,
                });
            }

            delete require.cache[require.resolve(`../../events/${eventName}.js`)];
            const newEvent = require(`../../events/${eventName}.js`);
            if (!newEvent) {
                return interaction.reply({
                    content: translator('cmd.reload.notFound', {
                        type: translator('cmd.reload.typeEvent'),
                        name: eventName,
                    }),
                    ephemeral: true,
                });
            }

            if (!newEvent.execute || typeof newEvent.execute !== 'function') {
                return interaction.reply({
                    content: translator('cmd.reload.notFound', {
                        type: translator('cmd.reload.typeEvent'),
                        name: eventName,
                    }),
                    ephemeral: true,
                });
            }

            client.events.set(newEvent.name, newEvent);

            return interaction.reply({
                content: translator('cmd.reload.description', {
                    type: translator('cmd.reload.typeEvent'),
                    name: eventName,
                }),
                ephemeral: true,
            });
        }
    },
};
