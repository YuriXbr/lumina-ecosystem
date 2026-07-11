const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');
const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'setup',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('setuproles')
        .setDescription('Setup roles and announcement channel for the server.')
        .setDescriptionLocalizations(loc(
            'Configura cargos e canal de anúncios para o servidor.',
            'Configura roles y canal de anuncios para el servidor.'
        ))
        .addRoleOption(option => option
            .setName('muterole')
            .setDescription('The role to use for muting users.')
            .setDescriptionLocalizations(loc('O cargo para silenciar usuários.', 'El rol para silenciar usuarios.'))
            .setRequired(false))
        .addRoleOption(option => option
            .setName('banrole')
            .setDescription('The role to use for banning users.')
            .setDescriptionLocalizations(loc('O cargo para banir usuários.', 'El rol para banear usuarios.'))
            .setRequired(false))
        .addChannelOption(option => option
            .setName('moderationchannel')
            .setDescription('The channel to use for moderation logs.')
            .setDescriptionLocalizations(loc('O canal para logs de moderação.', 'El canal para logs de moderación.'))
            .setRequired(false)),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply();

        const muteRole = interaction.options.getRole('muterole');
        const banRole = interaction.options.getRole('banrole');
        const moderationChannel = interaction.options.getChannel('moderationchannel');

        if (!muteRole && !banRole && !moderationChannel) {
            const embed = new EmbedBuilder()
                .setTitle(translator('cmd.setupRoles.title'))
                .setDescription(translator('cmd.setupRoles.description'))
                .setColor('Blue')
                .addFields(
                    { name: translator('cmd.setupRoles.title'), value: translator('cmd.setupRoles.description'), inline: false },
                );
            return interaction.editReply({ embeds: [embed], ephemeral: true });
        }

        let guildData = await api.post('/expapi/internal/fetchguilddata', { guildId: interaction.guild.id });
        if (!guildData) {
            await api.post('/expapi/internal/newguild', {
                guildId: interaction.guild.id,
                ownerId: interaction.guild.ownerId,
                guildName: interaction.guild.name,
            });
            guildData = await api.post('/expapi/internal/fetchguilddata', { guildId: interaction.guild.id });
        }

        const updatedData = {
            muteRoleId: muteRole ? muteRole.id : guildData.muteRoleId,
            banRoleId: banRole ? banRole.id : guildData.banRoleId,
            moderationChannelId: moderationChannel ? moderationChannel.id : guildData.moderationChannelId,
        };

        await api.post('/expapi/internal/updateguilddata', {
            guildId: interaction.guild.id,
            ...updatedData,
        });

        const embed = new EmbedBuilder()
            .setTitle(translator('cmd.setupRoles.title'))
            .setDescription(translator('cmd.setupRoles.description'))
            .setColor('Green')
            .addFields(
                { name: translator('cmd.setupRoles.muteRoleField'),           value: muteRole ? muteRole.name : translator('common.none'), inline: true },
                { name: translator('cmd.setupRoles.banRoleField'),            value: banRole ? banRole.name : translator('common.none'), inline: true },
                { name: translator('cmd.setupRoles.moderationChannelField'),  value: moderationChannel ? moderationChannel.name : translator('common.none'), inline: true },
            );

        await interaction.editReply({ embeds: [embed], ephemeral: true });
    },
};
