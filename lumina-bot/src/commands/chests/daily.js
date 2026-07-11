const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const LuminaApiService = require('../../utils/services/LuminaApiService');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

const api = new LuminaApiService();

module.exports = {
    permission: 'default',
    category: 'chests',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward: 3 Hextech Chests + 1 Key.')
        .setDescriptionLocalizations(loc(
            'Resgate sua recompensa diária: 3 Baús Hextech + 1 Chave.',
            'Reclama tu recompensa diaria: 3 Cofres Hextech + 1 Llave.'
        )),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply();

        try {
            const result = await api.post('/expapi/internal/claimdaily', { userId: interaction.user.id });
            const { reward, streak } = result;

            const embed = new EmbedBuilder()
                .setTitle(translator('cmd.daily.title'))
                .setDescription(translator('cmd.daily.description', {
                    chests: reward.hextechChests,
                    keys: reward.keys,
                }))
                .addFields({
                    name: translator('cmd.daily.streakField'),
                    value: translator('cmd.daily.streakValue', { count: streak }),
                    inline: true,
                })
                .setColor('Green')
                .setThumbnail('https://static.wikia.nocookie.net/leagueoflegends/images/6/60/Hextech_Crafting_Chest.png/revision/latest/scale-to-width-down/250?cb=20191203123712')
                .setFooter({ text: translator('cmd.daily.footer') });

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            // 429: já resgatou hoje — não é erro real, só feedback
            if (error.response?.status === 429) {
                const { nextDailyReward, streak } = error.response.data;
                const nextTimestamp = Math.floor(new Date(nextDailyReward).getTime() / 1000);

                const embed = new EmbedBuilder()
                    .setTitle(translator('cmd.daily.alreadyClaimedTitle'))
                    .setDescription(translator('cmd.daily.alreadyClaimedDesc', {
                        relative: `<t:${nextTimestamp}:R>`,
                        full: `<t:${nextTimestamp}:F>`,
                    }))
                    .addFields({
                        name: translator('cmd.daily.currentStreakField'),
                        value: translator('cmd.daily.streakValue', { count: streak }),
                        inline: true,
                    })
                    .setColor('Orange');

                return interaction.editReply({ embeds: [embed] });
            }

            // Re-lança para o interactionCreate.js capturar com apiContext completo
            throw error;
        }
    },
};
