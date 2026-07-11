const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');
const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'moderation',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user.')
        .setDescriptionLocalizations(loc('Silencia um usuário.', 'Silencia a un usuario.'))
        .addUserOption(option => option
            .setName('user')
            .setDescription('The user to mute.')
            .setDescriptionLocalizations(loc('O usuário para silenciar.', 'El usuario para silenciar.'))
            .setRequired(true))
        .addStringOption(option => option
            .setName('reason')
            .setDescription('The reason for the mute.')
            .setDescriptionLocalizations(loc('O motivo do silenciamento.', 'El motivo del silencio.')))
        .addStringOption(option => option
            .setName('time')
            .setDescription('The time for the mute.')
            .setDescriptionLocalizations(loc('O tempo do silenciamento.', 'El tiempo del silencio.'))),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || translator('cmd.mute.defaultReason');
        const target = interaction.guild.members.cache.get(user.id);
        const staff = interaction.guild.members.cache.get(interaction.user.id);
        const time = interaction.options.getString('time');
        const timeRegex = /(\d+)([dhms])/;
        const timeMatch = time ? time.match(timeRegex) : null;
        let muteEndDate = null;

        if (timeMatch) {
            const muteTime = parseInt(timeMatch[1]);
            const unit = timeMatch[2];
            const ms = { d: 86400000, h: 3600000, m: 60000, s: 1000 }[unit] ?? 0;
            muteEndDate = Date.now() + muteTime * ms;
        }

        if (!staff.permissions.has(PermissionsBitField.Flags.MuteMembers) && !staff.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: translator('cmd.mute.noPermission'), ephemeral: true });
        }

        // Fetch guild data from API to get the configured muteRoleId
        const LuminaApiService = require('../../utils/services/LuminaApiService');
        const muteApi = new LuminaApiService();
        let guildData;
        try {
            guildData = await muteApi.post('/expapi/internal/fetchguilddata', { guildId: interaction.guild.id });
        } catch (e) {
            guildData = null;
        }
        if (!guildData || !guildData.muteRoleId) {
            return interaction.editReply({ content: translator('cmd.setupRoles.missingFields'), ephemeral: true });
        }

        try {
            await target.roles.add(guildData.muteRoleId, reason);
        } catch (err) {
            return interaction.editReply({ content: translator('cmd.mute.botCannotMute'), ephemeral: true });
        }

        try {
            await api.post('/expapi/internal/newpunishrecord', {
                type: 'mute',
                guildId: interaction.guild.id,
                targetId: user.id,
                staffId: interaction.user.id,
                reason,
                endTime: muteEndDate,
            });
        } catch (error) {
            console.error(error);
        }

        const embed = new EmbedBuilder()
            .setTitle(translator('cmd.mute.title'))
            .setDescription(translator('cmd.mute.description', { user: user.tag }))
            .addFields(
                { name: translator('cmd.mute.reasonField'),   value: reason, inline: true },
                { name: translator('cmd.mute.durationField'), value: time ?? translator('common.permanent'), inline: true },
            )
            .setColor('Green');

        await interaction.editReply({ embeds: [embed] });
    },
};
