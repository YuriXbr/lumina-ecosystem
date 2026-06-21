const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'moderation',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Remove a warn from a user.')
        .addUserOption(option => option.setName('user').setDescription('The user to unwarn.').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const staff = interaction.guild.members.cache.get(interaction.user.id);
        
        if (!staff.permissions.has(PermissionsBitField.Flags.KickMembers) && !staff.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: 'You do not have permission to do that.', ephemeral: true });
        }

        // Remove the warn record from the database
        await api.removeWarn(interaction.guild.id, user.id);

        const embed = new EmbedBuilder()
            .setTitle('User Unwarned')
            .setDescription(`${user.tag} has been unwarned.`)
            .setColor('Green');

        await interaction.editReply({ embeds: [embed], ephemeral: true });
    }
};

async function promptSetup(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('Configuração Necessária')
        .setDescription('O servidor não está configurado. Por favor, execute o comando /setuproles para configurar.')
        .setColor('Red');

    await interaction.editReply({ embeds: [embed], ephemeral: true });
}