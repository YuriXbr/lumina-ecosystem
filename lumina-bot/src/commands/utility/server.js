const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Provides information about the server.'),

    execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle(`Server Information - ${interaction.guild.name}`)
                .setColor('Aqua')
                .setThumbnail(interaction.guild.iconURL())
                .addFields(
                    { name: 'Server Name', value: interaction.guild.name, inline: true },
                    { name: 'Server ID', value: interaction.guild.id, inline: true },
                    { name: 'Created At', value: interaction.guild.createdAt.toDateString(), inline: true },
                    { name: 'Member Count', value: interaction.guild.memberCount.toString(), inline: true },
                    { name: 'Verification Level', value: interaction.guild.verificationLevel?.toString() || 'N/A', inline: true },
					{ name: 'Boost Tier', value: interaction.guild.premiumTier.toString(), inline: true },
					{ name: 'Boost Count', value: interaction.guild.premiumSubscriptionCount.toString(), inline: true },

                );

            interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    },
};