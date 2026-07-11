const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../../api/riotApi.js')
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');;
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


        async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
            await interaction.deferReply();
            const region = interaction.options.getString('region');
            const server = interaction.options.getString('server');
            const summonerName = interaction.options.getString('summonername');
            const tagLine = interaction.options.getString('tagline');
            if(tagLine.length > 5) return errorEmbed(translator('cmd.leagueProfile.taglineTooLong'), 'leagueProfile', interaction, true, true);
            if(tagLine[0] === '#') return errorEmbed(translator('cmd.leagueProfile.taglineFormat'), 'leagueProfile', interaction, true, true);
            
            interaction.editReply({embeds: [loadingEmbed]});
        
            const accountInfo = await api.getAccountByRiotId(region, summonerName, tagLine, 'leagueProfile');
            if (!accountInfo) return errorEmbed(translator('cmd.leagueProfile.accountError'), 'leagueProfile', interaction, true, true);
            if (accountInfo && accountInfo.error === 'Account not found') {
                return errorEmbed(translator('cmd.leagueProfile.summonerNotFound'), 'leagueProfile', interaction, true, true);
            }

            const summonerInfo = await api.getSummonerInfo(server, accountInfo.puuid, 'leagueProfile');
            if (!summonerInfo) return errorEmbed(translator('cmd.leagueProfile.summonerError'), 'leagueProfile', interaction, true, true);
            
            const queueInfo = await api.getLeagueEntries(server, summonerInfo.id, 'leagueProfile');
            if (!queueInfo)
                return errorEmbed(translator('cmd.leagueProfile.queueError'), 'leagueProfile', interaction, true, true);
            const masteryInfo = await api.getChampionMastery(server, summonerInfo.puuid, 'leagueProfile');
            if (!masteryInfo) return errorEmbed(translator('cmd.leagueProfile.masteryError'), 'leagueProfile', interaction, true, true);
            const topMastery = masteryInfo.sort((a, b) => b.championPoints - a.championPoints)[0];
            const topMasteryChampion = await api.fetchChampionName(topMastery.championId, 'leagueProfile');
            
            const ddragonVersion = await api.getDDragonLatestVersion('leagueProfile');
            if (!ddragonVersion) return errorEmbed(translator('cmd.leagueProfile.ddragonError'), 'leagueProfile', interaction, true, true);
        
            const champFullImage = `http://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${topMasteryChampion.fullImage}`;
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(translator('cmd.leagueProfile.summonerTitle', { name: accountInfo.gameName, tag: accountInfo.tagLine }))
                .setDescription(translator('cmd.leagueProfile.levelDesc', { level: summonerInfo.summonerLevel }))
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