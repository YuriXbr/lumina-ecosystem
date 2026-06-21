const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../../api/riotApi.js');
const { errorEmbed, loadingEmbed } = require('../../utils/embeds/cmdEmbeds.js');
const { error } = require('../../utils/colorCodes.js');

module.exports = {
    permission: 'default',
    category: 'league',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('leaguechampionrotation')
        .setDescription('Shows the champions currently in rotation.'),

    async execute(interaction) {
        await interaction.deferReply("Fetching data...");

        interaction.editReply({ embeds: [loadingEmbed] });

        const rotationChampionsId = await api.getChampionRotation('leaguechampionrotation');
        if(!rotationChampionsId) return errorEmbed('An error occurred while fetching the champions in rotation.', 'leaguechampionrotation', interaction, true);

        const rotationChampions = await Promise.all(rotationChampionsId.map(async (id) => {
            try {
                return await api.fetchChampionName(id, 'leaguechampionrotation');
            } catch (err) {
                errorEmbed('An error occurred while fetching the champions name from ID', 'leaguechampionrotation', interaction, true);
            }
        }));
        //console.log([rotationChampions]);

        // Create an embed to display the champions in rotation
        const embed = new EmbedBuilder()
            .setTitle('Champions in Rotation')
            .setDescription('Here are the champions currently in rotation:')
            .setColor('#0099ff')
            .setFooter({text: 'Powered by Riot Games API', iconURL: 'https://i.imgur.com/xU45ZZz.png'})
            .addFields(rotationChampions
                .filter(champion => champion !== null)
                .map(champion => {
                    return { name: champion.id, value: `${champion.title}`, "inline": true };
                })
            );

        interaction.editReply({ embeds: [embed] });
    },
};