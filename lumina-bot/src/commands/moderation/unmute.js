const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'moderation',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a user.')
        .addUserOption(option => option.setName('user').setDescription('The user to unmute.').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const target = interaction.guild.members.cache.get(user.id);
        const author = interaction.user.id;
        const staff = interaction.guild.members.cache.get(author);

        // Fetch the guild data from the database
        let guildData = await getGuildData(interaction.guild.id);
        if (!guildData || !guildData.muteRoleId) {
            return promptSetup(interaction);
        }

        const mutedRoleId = guildData.muteRoleId;
        const mutedRole = interaction.guild.roles.cache.get(mutedRoleId);

        if (!hasPermission(staff)) {
            return interaction.editReply({ content: 'You do not have permission to do that.', ephemeral: true });
        }

        if (!mutedRole) {
            return interaction.editReply({ content: 'The muted role does not exist. Please set a valid muted role in the database.', ephemeral: true });
        }

        if (!target.roles.cache.has(mutedRole.id)) {
            return interaction.editReply({ content: 'This user is not muted.', ephemeral: true });
        }

        if (target.voice.channel) target.voice.setMute(false);

        await target.roles.remove(mutedRole);

        // Remove the mute record from the database
        await removeMute(interaction.guild.id, user.id);

        // Remove o registro de mute via API
        try {
            await api.post('/expapi/internal/removepunishrecord', {
                type: 'mute',
                guildId: interaction.guild.id,
                targetId: user.id
            });
        } catch (error) {
            console.error(error);
        }

        const embed = new EmbedBuilder()
            .setTitle('User Unmuted')
            .setDescription(`${user.tag} has been unmuted.`)
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
    return staff.permissions.has(PermissionsBitField.Flags.MuteMembers) || staff.permissions.has(PermissionsBitField.Flags.Administrator);
}