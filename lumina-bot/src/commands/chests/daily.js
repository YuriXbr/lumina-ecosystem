const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');

const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'chests',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Resgate sua recompensa diária: 3 Baús Hextech + 1 Chave.'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const result = await api.post('/expapi/internal/claimdaily', { userId: interaction.user.id });
            const { reward, streak } = result;

            const embed = new EmbedBuilder()
                .setTitle('🎁 Recompensa diária resgatada!')
                .setDescription(
                    `Você recebeu **${reward.hextechChests} Baú(s) Hextech** e **${reward.keys} Chave(s)**!\n` +
                    `Use \`/openchest\` para abrir seus baús.`
                )
                .addFields({ name: 'Sequência', value: `🔥 ${streak} dia${streak !== 1 ? 's' : ''} consecutivo${streak !== 1 ? 's' : ''}`, inline: true })
                .setColor('Green')
                .setThumbnail('https://static.wikia.nocookie.net/leagueoflegends/images/6/60/Hextech_Crafting_Chest.png/revision/latest/scale-to-width-down/250?cb=20191203123712')
                .setFooter({ text: 'Volte em 24 horas para resgatar de novo!' });

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            // Erro 429: já resgatou hoje — não é erro real, só feedback
            if (error.response?.status === 429) {
                const { nextDailyReward, streak } = error.response.data;
                const nextTimestamp = Math.floor(new Date(nextDailyReward).getTime() / 1000);

                const embed = new EmbedBuilder()
                    .setTitle('⏳ Diária já resgatada')
                    .setDescription(
                        `Você já resgatou sua recompensa diária hoje.\n` +
                        `Disponível novamente <t:${nextTimestamp}:R> (<t:${nextTimestamp}:F>).`
                    )
                    .addFields({ name: 'Sequência atual', value: `🔥 ${streak} dia${streak !== 1 ? 's' : ''}`, inline: true })
                    .setColor('Orange');

                return interaction.editReply({ embeds: [embed] });
            }

            // Re-lança para o interactionCreate.js capturar com apiContext completo
            throw error;
        }
    },
};
