const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'moderation',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the ban.')
        )
        .addStringOption(option =>
            option.setName('time')
                .setDescription('The time for the ban (ex: 1d, 2h, 30m, 45s).')
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided.';
        const target = interaction.guild.members.cache.get(user.id);
        const staff = interaction.guild.members.cache.get(interaction.user.id);
        const time = interaction.options.getString('time');
        let banEndDate = null;

        if (time) {
            const timeRegex = /(\d+)([dhms])/;
            const timeMatch = time.match(timeRegex);
            if (timeMatch) {
                const banTime = parseInt(timeMatch[1]);
                const unit = timeMatch[2];
                let banDuration = 0;
                switch (unit) {
                    case 'd':
                        banDuration = banTime * 24 * 60 * 60 * 1000;
                        break;
                    case 'h':
                        banDuration = banTime * 60 * 60 * 1000;
                        break;
                    case 'm':
                        banDuration = banTime * 60 * 1000;
                        break;
                    case 's':
                        banDuration = banTime * 1000;
                        break;
                }
                banEndDate = Date.now() + banDuration;
            }
        }

        // Check permission
        if (
            !staff.permissions.has(PermissionsBitField.Flags.BanMembers) &&
            !staff.permissions.has(PermissionsBitField.Flags.Administrator)
        ) {
            return interaction.editReply({ content: 'You do not have permission to do that.', ephemeral: true });
        }

        try {
            await banUser(interaction, target, user, reason, banEndDate);
            await sendStaffNotification(interaction, user, reason, time);
            await sendAnnouncement(interaction, user, reason, time, 'moderationChannelId');
            if (banEndDate) scheduleUnban(interaction.guild, user.id, banEndDate);
        } catch (err) {
            return interaction.editReply({ content: 'I do not have permission to ban the user. Ban not applied.', ephemeral: true });
        }

        // Record the punishment via API
        try {
            await api.post('/expapi/internal/newpunishrecord', {
                type: 'ban',
                guildId: interaction.guild.id,
                targetId: user.id,
                staffId: interaction.user.id,
                reason,
                endTime: banEndDate
            });
        } catch (error) {
            console.error(error);
        }

        await interaction.editReply({ 
            content: `👮‍♀️ <@${interaction.user.id}> has successfully banned ${user.tag}.`, 
            ephemeral: false 
        });
    }
};

async function banUser(interaction, target, user, reason, banEndDate) {
    // Create the ban and log it (e.g. with addBan function)
    await interaction.guild.bans.create(user.id, { reason: `STAFF: ${interaction.user.tag}  REASON: ${reason}` });
}

async function sendStaffNotification(interaction, user, reason, time) {
    const embed = new EmbedBuilder()
        .setTitle('Ban Applied')
        .setDescription(`You have successfully banned ${user.tag}.`)
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
        .setTitle('User Banned')
        .setDescription(`${user.tag} has been banned.`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'Reason', value: reason, inline: true },
            { name: 'Duration', value: time ? time : 'Permanent', inline: true },
            { name: 'Banned By', value: interaction.user.tag, inline: true }
        )
        .setColor('Red');

    await announcementChannel.send({ embeds: [embed] });
}

function scheduleUnban(guild, userId, banEndDate) {
    setTimeout(async () => {
        const updatedGuildData = await getGuildData(guild.id);
        try {
            if (updatedGuildData) {
                await guild.members.unban(userId);
                await updateBan(guild.id, userId, { endTime: new Date() });
            }
        } catch (error) {
            console.error(error);
        }
    }, banEndDate - Date.now());
}
