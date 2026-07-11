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
        .setName('unmute')
        .setDescription('Unmute a user.')
        .setDescriptionLocalizations(loc('Desilencia um usuário.', 'Desilencia a un usuario.'))
        .addUserOption(option => option
            .setName('user')
            .setDescription('The user to unmute.')
            .setDescriptionLocalizations(loc('O usuário para desilenciar.', 'El usuario para desilenciar.'))
            .setRequired(true)),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const target = interaction.guild.members.cache.get(user.id);
        const staff = interaction.guild.members.cache.get(interaction.user.id);

        // TODO: buscar guildData via API (atualmente a função getGuildData não está importada)
        // let guildData = await getGuildData(interaction.guild.id);
        const LuminaApiService = require('../../utils/services/LuminaApiService');
        const api = new LuminaApiService();
        let guildData;
        try {
            guildData = await api.post('/expapi/internal/fetchguilddata', { guildId: interaction.guild.id });
        } catch (e) {
            guildData = null;
        }
        if (!guildData || !guildData.muteRoleId) {
            return interaction.editReply({ content: translator('cmd.setupRoles.missingFields'), ephemeral: true });
        }

        const mutedRole = interaction.guild.roles.cache.get(guildData.muteRoleId);

        if (!staff.permissions.has(PermissionsBitField.Flags.MuteMembers) && !staff.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: translator('cmd.unmute.noPermission'), ephemeral: true });
        }

        if (!mutedRole) {
            return interaction.editReply({ content: translator('cmd.unmute.botCannotUnmute'), ephemeral: true });
        }

        if (!target.roles.cache.has(mutedRole.id)) {
            return interaction.editReply({ content: translator('cmd.unmute.notMuted'), ephemeral: true });
        }

        if (target.voice.channel) target.voice.setMute(false);

        await target.roles.remove(mutedRole);

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
            .setTitle(translator('cmd.unmute.title'))
            .setDescription(translator('cmd.unmute.description', { user: user.tag }))
            .setColor('Green');

        await interaction.editReply({ embeds: [embed], ephemeral: true });
    },
};
