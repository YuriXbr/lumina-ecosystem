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
        .setName('unwarn')
        .setDescription('Remove a warn from a user.')
        .setDescriptionLocalizations(loc('Remove uma advertência de um usuário.', 'Elimina una advertencia de un usuario.'))
        .addUserOption(option => option
            .setName('user')
            .setDescription('The user to unwarn.')
            .setDescriptionLocalizations(loc('O usuário para remover a advertência.', 'El usuario para eliminar la advertencia.'))
            .setRequired(true)),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const staff = interaction.guild.members.cache.get(interaction.user.id);

        if (!staff.permissions.has(PermissionsBitField.Flags.KickMembers) && !staff.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: translator('cmd.unwarn.noPermission'), ephemeral: true });
        }

        try {
            await api.post('/expapi/internal/removepunishrecord', {
                type: 'warn',
                guildId: interaction.guild.id,
                targetId: user.id,
            });
        } catch (error) {
            console.error(error);
        }

        const embed = new EmbedBuilder()
            .setTitle(translator('cmd.unwarn.title'))
            .setDescription(translator('cmd.unwarn.description', { user: user.tag }))
            .setColor('Green');

        await interaction.editReply({ embeds: [embed], ephemeral: true });
    },
};
