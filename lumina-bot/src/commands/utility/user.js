const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Provides information about the user.'),
	
	execute(interaction) {

		const embed = new EmbedBuilder()
			.setTitle(`User Information - ${interaction.user.username}`)
			.setColor('Blue')
			.setThumbnail(interaction.user.avatarURL())
			.addFields(
				{ name: 'Username', value: interaction.user.username, inline: true },
				{ name: 'User ID', value: interaction.user.id, inline: true },
				{ name: 'Created At', value: interaction.user.createdAt.toDateString(), inline: true },
				{ name: 'Joined At', value: interaction.member.joinedAt.toDateString(), inline: true }
			);
			
			interaction.reply({ embeds: [embed] });
		
	},
};