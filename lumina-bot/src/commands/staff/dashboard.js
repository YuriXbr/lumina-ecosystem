const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    permission: 'admin',
    category: 'staff',
    cooldown: 15,
	data: new SlashCommandBuilder()
		.setName('dashboard')
		.setDescription('Reply with the website dashboard link.'),

	execute(interaction) {
			interaction.reply({ content: `**Acesse nosso dashboard em ${process.env.DASHBOARD_HOST}**`, ephemeral: true });
            return;
	},
};