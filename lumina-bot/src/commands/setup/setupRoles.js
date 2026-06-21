const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'setup',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('setuproles')
        .setDescription('Setup roles and announcement channel for the server.')
        .addRoleOption(option => option.setName('muterole').setDescription('The role to use for muting users.').setRequired(false))
        .addRoleOption(option => option.setName('banrole').setDescription('The role to use for banning users.').setRequired(false))
        .addChannelOption(option => option.setName('moderationchannel').setDescription('The channel to use for moderation logs.').setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();
        
        const muteRole = interaction.options.getRole('muterole');
        const banRole = interaction.options.getRole('banrole');
        const moderationChannel = interaction.options.getChannel('moderationchannel');
  
        if (!muteRole && !banRole && !moderationChannel) {
            const embed = new EmbedBuilder()
                .setTitle('Configuração de cargos e Canal de Moderação')
                .setDescription('Use este comando para configurar os cargos de mute e ban, e o canal de moderação do servidor.')
                .setColor('Blue')
                .addFields(
                    { name: 'Como configurar?', value: 'Use `/setuproles` e forneça os cargos e o canal de moderação.', inline: false },
                    { name: 'Exemplo', value: '`/setuproles @Muted @Banned #moderation`', inline: false }
                );
            return interaction.editReply({ embeds: [embed], ephemeral: true });
        }
  
        // Buscar os dados da guilda via API
        let guildData = await api.post('/expapi/internal/fetchguilddata', { guildId: interaction.guild.id });
        if (!guildData) {
            // Se não houver dados, cria-os via API
            await api.post('/expapi/internal/newguild', {
                guildId: interaction.guild.id,
                ownerId: interaction.guild.ownerId,
                guildName: interaction.guild.name
            });
            guildData = await api.post('/expapi/internal/fetchguilddata', { guildId: interaction.guild.id });
        }
  
        // Atualizar os dados com os novos valores
        const updatedData = {
            muteRoleId: muteRole ? muteRole.id : guildData.muteRoleId,
            banRoleId: banRole ? banRole.id : guildData.banRoleId,
            moderationChannelId: moderationChannel ? moderationChannel.id : guildData.moderationChannelId
        };
  
        await api.post('/expapi/internal/updateguilddata', {
            guildId: interaction.guild.id,
            ...updatedData
        });
  
        const embed = new EmbedBuilder()
            .setTitle('Configuração Concluída')
            .setDescription('Os cargos e o canal de moderação foram configurados com sucesso.')
            .setColor('Green')
            .addFields(
                { name: 'Mute Role', value: muteRole ? muteRole.name : 'Não definido', inline: true },
                { name: 'Ban Role', value: banRole ? banRole.name : 'Não definido', inline: true },
                { name: 'Moderation Channel', value: moderationChannel ? moderationChannel.name : 'Não definido', inline: true }
            );
  
        await interaction.editReply({ embeds: [embed], ephemeral: true });
    }
};