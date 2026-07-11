const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');
const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'setup',
    data: new SlashCommandBuilder()
        .setName('serversettings')
        .setDescription('View and modify server settings.')
        .setDescriptionLocalizations(loc(
            'Ver e modificar configurações do servidor.',
            'Ver y modificar configuraciones del servidor.'
        )),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        try {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return interaction.reply({ content: translator('cmd.serverSettings.noPermission'), ephemeral: true });
            }

            await interaction.deferReply();

            const guildData = await api.post('/expapi/internal/fetchguilddata', { guildId: interaction.guild.id });
            if (!guildData) {
                return interaction.editReply({ content: translator('cmd.serverSettings.noSettings'), ephemeral: true });
            }

            const settings = Object.entries(guildData)
                .filter(([key]) => !['createdAt', 'updatedAt', 'guildId', 'guildOwnerId', 'guildLocale', '_id', '__v'].includes(key));

            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle(translator('cmd.serverSettings.title'))
                .setDescription(translator('cmd.serverSettings.description'));

            settings.forEach(([key, value]) => {
                embed.addFields({
                    name: key,
                    value: (value !== null && value !== undefined && value.toString().length > 0) ? value.toString() : translator('common.none'),
                    inline: true,
                });
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: translator('common.commandError'), ephemeral: true });
        }
    },
};
