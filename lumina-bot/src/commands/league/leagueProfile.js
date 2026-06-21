const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../../api/riotApi.js');
const { loadingEmbed, errorEmbed } = require('../../utils/embeds/cmdEmbeds.js');

module.exports = {
    permission: 'default',
    category: 'league',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('leagueprofile')
        .setNameLocalizations({
            "pt-BR": 'perfildojogador'
        })
        .setDescription('Shows the profile of a League of Legends player.')
        .setDescriptionLocalizations({
            "pt-BR": 'Mostra o perfil de um jogador de League of Legends.'
        })
        .addStringOption(option =>
            option.setName('region')
                .setNameLocalizations({
                    "pt-BR": 'região'
                })
                .setDescription('The server of the player.')
                .setDescriptionLocalizations({
                    "pt-BR": 'O servidor do jogador.'
                })
                .setRequired(true)
                .addChoices(
                    { name: 'AMERICAS', value: 'americas'},
                    { name: 'EUROPE', value: 'europe'},
                    { name: 'ASIA', value: 'asia'}
                )
        )
        .addStringOption(option =>
            option.setName('server')
                .setNameLocalizations({
                    "pt-BR": 'servidor'
                })
                .setDescription('The server of the player.')
                .setDescriptionLocalizations({
                    "pt-BR": 'O servidor do jogador.'
                })
                .setRequired(true)
                .addChoices(
                    { name: 'BR1', value: 'br1'},
                    { name: 'EUN1', value: 'eun1'},
                    { name: 'EUW1', value: 'euw1'},
                    { name: 'JP1', value: 'jp1'},
                    { name: 'KR', value: 'kr'},
                    { name: 'LA1', value: 'la1'},
                    { name: 'LA2', value: 'la2'},
                    { name: 'NA1', value: 'na1'},
                    { name: 'OC1', value: 'oc1'},
                    { name: 'TR1', value: 'tr1'},
                    { name: 'RU', value: 'ru'},
                )
        )
        .addStringOption(option => 
            option.setName('summonername')
                .setNameLocalizations({
                    "pt-BR": 'invocador'
                })
                .setDescription('The summoner name of the player.')
                .setDescriptionLocalizations({
                    "pt-BR": 'O nome do invocador.'
                })
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('tagline')
                .setNameLocalizations({
                    "pt-BR": 'hashtag'
                })
                .setDescription('The tagline of the player.')
                .setDescriptionLocalizations({
                    "pt-BR": 'O hashtag do jogador.'
                })
                .setRequired(true)
        ),


        async execute(interaction) {
            await interaction.deferReply();
            const region = interaction.options.getString('region');
            const server = interaction.options.getString('server');
            const summonerName = interaction.options.getString('summonername');
            const tagLine = interaction.options.getString('tagline');
            if(tagLine.length > 5) return errorEmbed('The tagline must have a maximum of 5 characters.', 'leagueProfile', interaction, true, true);
            if(tagLine[0] === '#') return errorEmbed('You must inset only the numbers of the tagline. Do not insert "#"', 'leagueProfile', interaction, true, true);
            
            interaction.editReply({embeds: [loadingEmbed]});
        
            const accountInfo = await api.getAccountByRiotId(region, summonerName, tagLine, 'leagueProfile');
            if (!accountInfo) return errorEmbed('An error occurred while trying to get the account information.', 'leagueProfile', interaction, true, true);
            if (accountInfo && accountInfo.error === 'Account not found') {
                return errorEmbed('The summoner you entered does not exist. Please check the account name and server.', 'leagueProfile', interaction, true, true);
            }

            const summonerInfo = await api.getSummonerInfo(server, accountInfo.puuid, 'leagueProfile');
            if (!summonerInfo) return errorEmbed('An error occurred while trying to get the summoner information.', 'leagueProfile', interaction, true, true);
            
            const queueInfo = await api.getLeagueEntries(server, summonerInfo.id, 'leagueProfile');
            if (!queueInfo)
                return errorEmbed('An error occurred while trying to get the queue information.', 'leagueProfile', interaction, true, true);
            const masteryInfo = await api.getChampionMastery(server, summonerInfo.puuid, 'leagueProfile');
            if (!masteryInfo) return errorEmbed('An error occurred while trying to get the mastery information.', 'leagueProfile', interaction, true, true);
            const topMastery = masteryInfo.sort((a, b) => b.championPoints - a.championPoints)[0];
            const topMasteryChampion = await api.fetchChampionName(topMastery.championId, 'leagueProfile');
            
            const ddragonVersion = await api.getDDragonLatestVersion('leagueProfile');
            if (!ddragonVersion) return errorEmbed('An error occurred while trying to get the DDragon version.', 'leagueProfile', interaction, true, true);
        
            const champFullImage = `http://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${topMasteryChampion.fullImage}`;
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`Summoner name: ${accountInfo.gameName}#${accountInfo.tagLine}`)
                .setDescription(`Level: ${summonerInfo.summonerLevel}`)
                .setTimestamp()
                .setFooter({text: 'Powered by Riot Games API', iconURL: 'https://i.imgur.com/xU45ZZz.png'})
                .setThumbnail(`http://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${summonerInfo.profileIconId}.png`)
                .setImage(champFullImage)
                .addFields(queueInfo
                    .filter(queue => queue.queueType !== 'CHERRY') // Filtra a fila "CHERRY"
                    .map(queue => {
                        return {
                            name: queue.queueType,
                            value: `Rank: ${queue.tier} ${queue.rank} ${queue.leaguePoints} LP\nWins: ${queue.wins}\nLosses: ${queue.losses}\nWinrate: ${((queue.wins / (queue.wins + queue.losses)) * 100).toFixed(2)}%`,
                            inline: true,
                        };
                    })
                );
        
            interaction.editReply({embeds: [embed], content: ''});
        }
};