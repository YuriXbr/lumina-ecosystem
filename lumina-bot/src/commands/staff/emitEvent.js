const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    permission: 'admin',
    category: 'staff',
    cooldown: 15,
	data: new SlashCommandBuilder()
		.setName('event')
		.setDescription('Emit a custom event.')
        .addStringOption(option =>
            option.setName('event')
                .setDescription('The event to emit.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('data')
                .setDescription('The data to emit.')
                .setRequired(false)
        ),

	execute(interaction) {

        ({ client } = interaction);

		try {
            client.emit(interaction.options.getString('event'), (interaction.options.getString('data') || client));
            interaction.reply({content: `Event ${interaction.options.getString('event')} emitted with data: ${interaction.options.getString('data')}`, ephemeral: true});
        } catch (error) {
            console.log(error);
            interaction.reply({content: `There was an error emitting the event: ${error}`, ephemeral: true});
        }
			
	},
};