const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'moderation',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user.')
        .addUserOption(option => option.setName('user').setDescription('The user to warn.').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('The reason for the warn.'))
        .addStringOption(option => option.setName('time').setDescription('The time for the warn.')),
    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided.';
        const staff = interaction.guild.members.cache.get(interaction.user.id);
        const time = interaction.options.getString('time');
        const timeRegex = /(\d+)([dhms])/;
        const timeMatch = time ? time.match(timeRegex) : null;
        let warnEndDate = null;

        if (timeMatch) {
            const warnTime = parseInt(timeMatch[1]);
            const unit = timeMatch[2];
            let warnDuration;
            switch(unit) {
                case 'd':
                    warnDuration = warnTime * 24 * 60 * 60 * 1000;
                    break;
                case 'h':
                    warnDuration = warnTime * 60 * 60 * 1000;
                    break;
                case 'm':
                    warnDuration = warnTime * 60 * 1000;
                    break;
                case 's':
                    warnDuration = warnTime * 1000;
                    break;
                default:
                    warnDuration = 0;
            }
            warnEndDate = Date.now() + warnDuration;
        }
        
        if (!staff.permissions.has(PermissionsBitField.Flags.KickMembers) && !staff.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: 'You do not have permission to do that.', ephemeral: true });
        }
        
        // Registra o warn via API
        try {
            await api.post('/expapi/internal/newpunishrecord', {
                type: 'warn',
                guildId: interaction.guild.id,
                targetId: user.id,
                staffId: interaction.user.id,
                reason,
                endTime: warnEndDate
            });
        } catch (error) {
            console.error(error);
        }
        
        await interaction.editReply({ content: `Warned ${user.tag} with reason: ${reason}`, ephemeral: false });
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
    return staff.permissions.has(PermissionsBitField.Flags.KickMembers) || staff.permissions.has(PermissionsBitField.Flags.Administrator);
}

function calculateWarnEndDate(timeMatch) {
    if (!timeMatch) return null;

    const warnTime = parseInt(timeMatch[1]);
    const warnUnit = timeMatch[2];
    let warnDuration;

    switch (warnUnit) {
        case 'd':
            warnDuration = warnTime * 24 * 60 * 60 * 1000;
            break;
        case 'h':
            warnDuration = warnTime * 60 * 60 * 1000;
            break;
        case 'm':
            warnDuration = warnTime * 60 * 1000;
            break;
        case 's':
            warnDuration = warnTime * 1000;
            break;
        default:
            warnDuration = 0;
    }

    return Date.now() + warnDuration;
}

async function warnUser(interaction, target, user, reason, warnEndDate, time) {
    await addWarn(interaction.guild.id, user.id, interaction.user.id, reason, warnEndDate);
    await interaction.editReply({ content: `Successfully warned ${user.tag} with reason: ${reason} ${time ? `for: ${time}` : 'permanently'}.`, ephemeral: false });
}

async function sendStaffNotification(interaction, user, reason, time) {
    const embed = new EmbedBuilder()
        .setTitle('Warn Applied')
        .setDescription(`You have successfully warned ${user.tag}.`)
        .addFields(
            { name: 'Reason', value: reason, inline: true },
            { name: 'Duration', value: time ? time : 'Permanent', inline: true }
        )
        .setColor('Green');

    await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function sendAnnouncement(interaction, user, reason, time, moderationChannelId) {
    const announcementChannel = interaction.guild.channels.cache.get(moderationChannelId);
    if (!announcementChannel) return;

    const embed = new EmbedBuilder()
        .setTitle('User Warned')
        .setDescription(`${user.tag} has been warned.`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'Reason', value: reason, inline: true },
            { name: 'Duration', value: time ? time : 'Permanent', inline: true },
            { name: 'Warned By', value: interaction.user.tag, inline: true }
        )
        .setColor('Yellow');

    await announcementChannel.send({ embeds: [embed] });
}

function scheduleUnwarn(guild, userId, warnEndDate) {
    setTimeout(async () => {
        const updatedGuildData = await getGuildData(guild.id);
        try {
            if (updatedGuildData) {
                await removeWarn(guild.id, userId);
            }
        } catch (error) {
            console.error(error);
        }
    }, warnEndDate - Date.now());
}