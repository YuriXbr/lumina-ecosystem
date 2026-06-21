// Command to restart the bot

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    permission: 'admin',
    category: 'staff',
    cooldown: 15,
	data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the bot.'),
        
        async execute(interaction) {
            await interaction.reply({content: 'Stopping...', ephemeral: true});
            process.exit(0);
        }
}