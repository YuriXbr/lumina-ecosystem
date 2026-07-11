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
        .setName('unban')
        .setDescription('Unban a user.')
        .setDescriptionLocalizations(loc('Desbane um usuário.', 'Desbanea a un usuario.'))
        .addUserOption(option => option
            .setName('user')
            .setDescription('The user to unban.')
            .setDescriptionLocalizations(loc('O usuário para desbanir.', 'El usuario para desbanear.'))
            .setRequired(true)),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const staff = interaction.guild.members.cache.get(interaction.user.id);

        if (!staff.permissions.has(PermissionsBitField.Flags.BanMembers) && !staff.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: translator('cmd.unban.noPermission'), ephemeral: true });
        }

        try {
            await interaction.guild.bans.remove(user.id);
        } catch (err) {
            return interaction.editReply({ content: translator('cmd.unban.notBanned'), ephemeral: true });
        }

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
            .setTitle(translator('cmd.unban.title'))
            .setDescription(translator('cmd.unban.description', { user: user.tag }))
            .setColor('Green');

        await interaction.editReply({ embeds: [embed], ephemeral: true });
    },
};
