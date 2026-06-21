const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'moderation',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user.')
        .addUserOption(option => option.setName('user').setDescription('The user to unban.').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const staff = interaction.guild.members.cache.get(interaction.user.id);

        if (!staff.permissions.has(PermissionsBitField.Flags.BanMembers) && !staff.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: 'You do not have permission to do that.', ephemeral: true });
        }

        try {
            await interaction.guild.bans.remove(user.id);
        } catch (err) {
            return interaction.editReply({ content: 'This user is not banned or I do not have permission to unban them.', ephemeral: true });
        }

        // Remove o registro de ban via API
        try {
            await api.post('/expapi/internal/removepunishrecord', {
                type: 'ban',
                guildId: interaction.guild.id,
                targetId: user.id
            });
        } catch (error) {
            console.error(error);
        }

        const embed = new EmbedBuilder()
            .setTitle('User Unbanned')
            .setDescription(`${user.tag} has been unbanned.`)
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

function hasPermission(staff) {
    return staff.permissions.has(PermissionsBitField.Flags.BanMembers) || staff.permissions.has(PermissionsBitField.Flags.Administrator);
}