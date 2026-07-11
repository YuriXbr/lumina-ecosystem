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
        .setName('ban')
        .setDescription('Ban a user.')
        .setDescriptionLocalizations(loc('Bane um usuário.', 'Banea a un usuario.'))
        .addUserOption(o => o
            .setName('user')
            .setDescription('The user to ban.')
            .setDescriptionLocalizations(loc('O usuário para banir.', 'El usuario para banear.'))
            .setRequired(true))
        .addStringOption(o => o
            .setName('reason')
            .setDescription('The reason for the ban.')
            .setDescriptionLocalizations(loc('O motivo do banimento.', 'El motivo del ban.')))
        .addStringOption(o => o
            .setName('time')
            .setDescription('The time for the ban (ex: 1d, 2h, 30m, 45s).')
            .setDescriptionLocalizations(loc('O tempo do banimento (ex: 1d, 2h, 30m, 45s).', 'El tiempo del ban (ej: 1d, 2h, 30m, 45s).'))),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply();

        const user   = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || translator('cmd.ban.defaultReason');
        const target = interaction.guild.members.cache.get(user.id);
        const staff  = interaction.guild.members.cache.get(interaction.user.id);
        const time   = interaction.options.getString('time');
        let banEndDate = null;

        if (time) {
            const match = time.match(/(\d+)([dhms])/);
            if (match) {
                const [, amount, unit] = match;
                const ms = { d: 86400000, h: 3600000, m: 60000, s: 1000 }[unit] ?? 0;
                banEndDate = Date.now() + parseInt(amount) * ms;
            }
        }

        if (!staff.permissions.has(PermissionsBitField.Flags.BanMembers) && !staff.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: translator('cmd.ban.noPermission'), ephemeral: true });
        }

        try {
            await interaction.guild.bans.create(user.id, { reason: `STAFF: ${interaction.user.tag} | REASON: ${reason}` });
        } catch (err) {
            return interaction.editReply({ content: translator('cmd.ban.botCannotBan'), ephemeral: true });
        }

        await interaction.followUp({
            embeds: [new EmbedBuilder()
                .setTitle(translator('cmd.ban.title')).setColor('Green')
                .setDescription(translator('cmd.ban.description', { user: user.tag }))
                .addFields(
                    { name: translator('cmd.ban.reasonField'),   value: reason, inline: true },
                    { name: translator('cmd.ban.durationField'), value: time ?? translator('common.permanent'), inline: true },
                )],
            ephemeral: true,
        });

        // Auto-unban is handled by PunishmentScheduler (persistent in MongoDB)
        // Do NOT use setTimeout — it's lost on bot restart/serverless cold start

        await api.post('/expapi/internal/newpunishrecord', {
            type: 'ban',
            guildId: interaction.guild.id,
            targetId: user.id,
            staffId: interaction.user.id,
            reason,
            endTime: banEndDate,
        });

        return interaction.editReply({
            content: `👮‍♀️ <@${interaction.user.id}> ${translator('cmd.ban.description', { user: user.tag })}`,
        });
    },
};
