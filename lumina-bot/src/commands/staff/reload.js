// A command to reload a specific command, event or config
const { SlashCommandBuilder } = require('discord.js');
const { execute } = require('../league/leagueMatchHistory');

module.exports = {
    permission: 'admin',
    category: 'staff',
    cooldown: 15,
	data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload a specific section.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('command')
                .setDescription('Reload a command.')
                .addStringOption(option =>
                    option.setName('command')
                        .setDescription('The command to reload.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('event')
                .setDescription('Reload an event.')
                .addStringOption(option =>
                    option.setName('event')
                        .setDescription('The event to reload.')
                        .setRequired(true)
                )
        ),

        execute(interaction) {

        const client = interaction.client;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'command') {
            const commandName = interaction.options.getString('command');
            const command = client.commands.get(commandName);
            
            if (!command) {
                return interaction.reply({content: `There is no command with name \`${commandName}\``, ephemeral: true});
            }

            delete require.cache[require.resolve(`../${command.category}/${commandName}.js`)];
            const newCommand = require(`../${command.category}/${commandName}.js`);
            client.commands.set(newCommand.data.name, newCommand);

            interaction.reply({content: `Command \`${commandName}\` was reloaded!`, ephemeral: true});
        } else if (subcommand === 'event') {
            const eventName = interaction.options.getString('event');
            const event = client.events.get(eventName);
            
            if (!event) {
                return interaction.reply({content: `There is no event with name \`${eventName}\``, ephemeral: true});
            }

            delete require.cache[require.resolve(`../events/${eventName}.js`)];
            const newEvent = require(`../events/${eventName}.js`);
            if(!newEvent) return interaction.reply({content: `Event \`${eventName}\` doesn't exist!`, ephemeral: true});

            if( !newEvent.execute || typeof newEvent.execute !== 'function') {
                return interaction.reply({content: `Event \`${eventName}\` doesn't have an execute function!`, ephemeral: true});
            }

            client.events.set(newEvent.name, newEvent);

            interaction.reply({content: `Event \`${eventName}\` was reloaded!`, ephemeral: true});
        }
        }
}
