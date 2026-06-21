const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const api = require('../../api/riotApi.js');
const { loadingEmbed, errorEmbed, complexLoadingEmbed } = require('../../utils/embeds/cmdEmbeds.js');

module.exports = {
    permission: 'default',
    category: 'league',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('leaguequeuesearch')
        .setDescription('Search for ranked queues based on a specified elo and division.')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('The server to search on.')
                .setRequired(true)
                .addChoices(
                    { name: 'BR', value: 'br1' },
                    { name: 'NA', value: 'na1' },
                    { name: 'EUW', value: 'euw1' },
                    { name: 'EUNE', value: 'eun1' },
                    { name: 'KR', value: 'kr' },
                    { name: 'JP', value: 'jp1' },
                    { name: 'LAN', value: 'la1' },
                    { name: 'LAS', value: 'la2' },
                    { name: 'OCE', value: 'oc1' },
                    { name: 'TR', value: 'tr1' },
                    { name: 'RU', value: 'ru' }
                )
        )
        .addStringOption(option =>
            option.setName('elo')
                .setDescription('The elo to search for.')
                .setRequired(true)
                .addChoices(
                    { name: 'IRON', value: 'IRON' },
                    { name: 'BRONZE', value: 'BRONZE' },
                    { name: 'SILVER', value: 'SILVER' },
                    { name: 'GOLD', value: 'GOLD' },
                    { name: 'PLATINUM', value: 'PLATINUM' },
                    { name: 'DIAMOND', value: 'DIAMOND' },
                    { name: 'MASTER', value: 'MASTER' },
                    { name: 'GRANDMASTER', value: 'GRANDMASTER' },
                    { name: 'CHALLENGER', value: 'CHALLENGER' }
                )
        )
        .addStringOption(option =>
            option.setName('division')
                .setDescription('The division to search for.')
                .setRequired(true)
                .addChoices(
                    { name: 'I', value: 'I' },
                    { name: 'II', value: 'II' },
                    { name: 'III', value: 'III' },
                    { name: 'IV', value: 'IV' }
                )
        ),

    async execute(interaction) {
        const elo = interaction.options.getString('elo');
        const division = interaction.options.getString('division');
        const server = interaction.options.getString('server');
        await interaction.deferReply();

        await complexLoadingEmbed('Fetching data, please wait...', 'leagueQueueSearch', interaction, true, false, true, 'Fetching ranked queues');

        try {
            const rankedQueues = await api.getRankedQueues(server, elo, division, 'leagueQueueSearch');
            if (!rankedQueues) {
                return await errorEmbed('An error occurred while fetching the ranked queues.', 'leagueQueueSearch', interaction, true, true, true);
            }
            console.log('Type of rankedQueues:', typeof rankedQueues);
            console.log('Content of rankedQueues:', rankedQueues);

            if (!Array.isArray(rankedQueues) || rankedQueues.length === 0) {
                return await errorEmbed(`No ranked queues found for ${elo} ${division}.`, 'leagueQueueSearch', interaction, true, true, true);
            }

            const totalPages = Math.ceil(rankedQueues.length / 15);
            let currentPage = 0;

            const { regionMap } = require('../../api/riotApi');

            const fetchSummonerNames = async (queues) => {
                for (let queue of queues) {
                    console.log(`Fetching PUUID for summonerId: ${queue.summonerId}`); // Atualiza log para verificar o summonerId
                    const PUUID = await api.getPUUIDBySummonerId(server, queue.summonerId, 'leagueQueueSearch');
                    if (PUUID) {
                        const region = regionMap[server];
                        const gameName = await api.getAccountByPUUID(region, PUUID, 'leagueQueueSearch');
                        queue.summonerName = gameName || 'Unknown';
                    } else {
                        queue.summonerName = 'Unknown';
                    }
                }
            };

            const generateEmbed = async (page) => {
                const start = page * 15;
                const end = start + 15;
                const currentQueues = rankedQueues.slice(start, end);

                await fetchSummonerNames(currentQueues);

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`Ranked Queues for ${elo} ${division}`)
                    .setDescription(`Found ${rankedQueues.length} ranked queues.`)
                    .setTimestamp()
                    .setFooter({ text: `Page ${page + 1} of ${totalPages}`, iconURL: 'https://i.imgur.com/xU45ZZz.png' });

                currentQueues.forEach(queue => {
                    embed.addFields({
                        name: `Summoner: ${queue.summonerName || 'Unknown'}`,
                        value: `LP: ${queue.leaguePoints}\nWins: ${queue.wins}\nLosses: ${queue.losses}\nWinrate: ${((queue.wins / (queue.wins + queue.losses)) * 100).toFixed(2)}%`,
                        inline: true,
                    });
                });

                return embed;
            };

            const generateRow = (page) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === totalPages - 1)
                    );
            };

            const message = await interaction.editReply({ embeds: [await generateEmbed(currentPage)], components: [generateRow(currentPage)] });

            const filter = i => i.customId === 'prev' || i.customId === 'next';
            const collector = message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                await i.deferUpdate(); // Defer the update to show a loading state

                if (i.customId === 'prev' && currentPage > 0) {
                    currentPage--;
                } else if (i.customId === 'next' && currentPage < totalPages - 1) {
                    currentPage++;
                }

                await i.editReply({ embeds: [loadingEmbed.setFooter({ text: 'descodificando nomes de usuários', iconURL: 'https://i.imgur.com/xU45ZZz.png' })], components: [] }); // Show loading message

                const newEmbed = await generateEmbed(currentPage);
                const newRow = generateRow(currentPage);

                await i.editReply({ embeds: [newEmbed], components: [newRow] }); // Update with new data
            });

            collector.on('end', collected => {
                const disabledRow = generateRow(currentPage);
                disabledRow.components.forEach(button => button.setDisabled(true));
                message.edit({ components: [disabledRow] });
            });

        } catch (error) {
            console.error(error);
            interaction.editReply('An error occurred while fetching the ranked queues.');
        }
    },
};