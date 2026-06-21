const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionsBitField, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'setup',
    data: new SlashCommandBuilder()
        .setName('serversettings')
        .setDescription('View and modify server settings.'),
    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            }
  
            await interaction.deferReply();
  
            // Buscar dados da guilda via API
            const guildData = await api.post('/expapi/internal/fetchguilddata', { guildId: interaction.guild.id });
            if (!guildData) {
                return interaction.editReply({ content: 'Nenhum dado de guilda encontrado. Configure o servidor primeiro.', ephemeral: true });
            }
  
            const settings = Object.entries(guildData)
                .filter(([key]) => !['createdAt', 'updatedAt', 'guildId', 'guildOwnerId', 'guildLocale'].includes(key));
  
            const embeds = [];
            let currentEmbed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('Server Settings')
                .setDescription('Estes são os settings atuais do servidor:');
  
            settings.forEach(([key, value], index) => {
                currentEmbed.addFields({
                    name: key,
                    value: (value && value.toString().length > 0) ? value.toString() : 'undefined',
                    inline: true
                });
  
                if ((index + 1) % 25 === 0 || index === settings.length - 1) {
                    embeds.push(currentEmbed);
                    currentEmbed = new EmbedBuilder()
                        .setColor('Blue')
                        .setTitle('Server Settings')
                        .setDescription('Estes são os settings atuais do servidor:');
                }
            });
  
            const selectMenus = [];
            for (let i = 0; i < settings.length; i += 25) {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId(`select_setting_${i / 25}`)
                    .setPlaceholder('Selecione um setting para modificar')
                    .addOptions(
                        settings.slice(i, i + 25).map(([key], index) => ({
                            label: key,
                            value: (i + index).toString()
                        }))
                    );
                selectMenus.push(new ActionRowBuilder().addComponents(menu));
            }
  
            await interaction.editReply({ embeds, components: selectMenus });
  
            const filter = i => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });
  
            collector.on('collect', async i => {
                if (i.customId.startsWith('select_setting_')) {
                    const selectedSettingIndex = parseInt(i.values[0], 10);
                    const selectedSetting = settings[selectedSettingIndex][0];
  
                    await i.update({ content: `Você selecionou: ${selectedSetting}. Por favor, digite o novo valor.`, components: [] });
  
                    const messageFilter = response => response.author.id === interaction.user.id;
                    const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, max: 1, time: 30000 });
  
                    messageCollector.on('collect', async message => {
                        let newValue = message.content;
                        // Validação simples baseada no tipo do valor atual
                        if (typeof guildData[selectedSetting] === 'number') {
                            newValue = parseInt(newValue, 10);
                            if (isNaN(newValue)) {
                                return message.reply({ content: 'Valor numérico inválido.', ephemeral: true });
                            }
                        } else if (typeof guildData[selectedSetting] === 'boolean') {
                            newValue = newValue.toLowerCase() === 'true';
                        }
  
                        // Atualizar o dado via API
                        const updateResult = await api.post('/expapi/internal/updateguilddata', {
                            guildId: interaction.guild.id,
                            [selectedSetting]: newValue
                        });
  
                        const updatedEmbed = new EmbedBuilder()
                            .setColor('Green')
                            .setTitle('Server Settings Atualizado')
                            .setDescription(`O setting **${selectedSetting}** foi atualizado para **${newValue}**.`);
  
                        await interaction.followUp({ embeds: [updatedEmbed] });
                    });
  
                    messageCollector.on('end', collected => {
                        if (collected.size === 0) {
                            interaction.followUp({ content: 'Você não digitou nenhum valor. O menu expirou.', components: [] });
                        }
                    });
                }
            });
  
            collector.on('end', async () => {
                await interaction.editReply({ content: 'O menu de settings expirou.', components: [] });
            });
  
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
        }
    }
};