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
        .setName('warn')
        .setDescription('Warn a user.')
        .setDescriptionLocalizations(loc('Adverte um usuário.', 'Advierte a un usuario.'))
        .addUserOption(option => option
            .setName('user')
            .setDescription('The user to warn.')
            .setDescriptionLocalizations(loc('O usuário para advertir.', 'El usuario para advertir.'))
            .setRequired(true))
        .addStringOption(option => option
            .setName('reason')
            .setDescription('The reason for the warn.')
            .setDescriptionLocalizations(loc('O motivo da advertência.', 'El motivo de la advertencia.')))
        .addStringOption(option => option
            .setName('time')
            .setDescription('The time for the warn.')
            .setDescriptionLocalizations(loc('O tempo da advertência.', 'El tiempo de la advertencia.'))),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || translator('cmd.warn.defaultReason');
        const staff = interaction.guild.members.cache.get(interaction.user.id);
        const time = interaction.options.getString('time');
        const timeRegex = /(\d+)([dhms])/;
        const timeMatch = time ? time.match(timeRegex) : null;
        let warnEndDate = null;

        if (timeMatch) {
            const warnTime = parseInt(timeMatch[1]);
            const unit = timeMatch[2];
            const ms = { d: 86400000, h: 3600000, m: 60000, s: 1000 }[unit] ?? 0;
            warnEndDate = Date.now() + warnTime * ms;
        }

        if (!staff.permissions.has(PermissionsBitField.Flags.KickMembers) && !staff.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: translator('cmd.warn.noPermission'), ephemeral: true });
        }

        try {
            await api.post('/expapi/internal/newpunishrecord', {
                type: 'warn',
                guildId: interaction.guild.id,
                targetId: user.id,
                staffId: interaction.user.id,
                reason,
                endTime: warnEndDate,
            });
        } catch (error) {
            console.error(error);
        }

        const embed = new EmbedBuilder()
            .setTitle(translator('cmd.warn.title'))
            .setDescription(translator('cmd.warn.description', { user: user.tag }))
            .addFields(
                { name: translator('cmd.warn.reasonField'),   value: reason, inline: true },
                { name: translator('cmd.warn.durationField'), value: time ?? translator('common.permanent'), inline: true },
            )
            .setColor('Yellow');

        await interaction.editReply({ embeds: [embed] });
    },
};
