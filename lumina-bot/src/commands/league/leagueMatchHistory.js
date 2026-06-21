const api = require('../../api/riotApi.js');
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { generateMatchChart } = require('../../utils/scripts/chartGenerator');
const { complexLoadingEmbed, errorEmbed, complexsuccessEmbed } = require('../../utils/embeds/cmdEmbeds.js');
const max = Number(process.env.RIOT_MAX_MATCH_HISTORY) || 5; // Default to 5 if not set
const {emojis} = require('../../assets/emojis.js');

module.exports = {
    permission: 'default',
    category: 'league',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('leaguematchhistory')
        .setNameLocalizations({
            "pt-BR": 'historicodepartidas'
        })
        .setDescription('Shows the match history of a League of Legends player.')
        .addStringOption(option =>
            option.setName('region')
                .setNameLocalizations({
                    "pt-BR": 'região'
                })
                .setDescription('The region of the player.')
                .setDescriptionLocalizations({
                    "pt-BR": 'A região do jogador.'
                })
                .setRequired(true)
                .addChoices(
                    { name: 'AMERICAS', value: 'americas'},
                    { name: 'EUROPE', value: 'europe'},
                    { name: 'ASIA', value: 'asia'}
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
        )
        .addNumberOption(option =>
            option.setName('number')
                .setNameLocalizations({
                    "pt-BR": 'quantidade'
                })
                .setDescription('The number of matches to show.')
                .setDescriptionLocalizations({
                    "pt-BR": 'A quantidade de partidas a serem mostradas.'
                })
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(max)
        ),

    async execute(interaction) {
            await interaction.deferReply();
            
            const region = interaction.options.getString('region');
            const summonerName = interaction.options.getString('summonername');
            const tagLine = interaction.options.getString('tagline');
            if(tagLine.length > 5) return await errorEmbed('The tagline must have a maximum of 5 characters.', 'leaguematchhistory', interaction, true);
            if(tagLine[0] === '#') return await errorEmbed('You must inset only the numbers of the tagline. Do not insert "#"', 'leagueProfile', interaction, true);
            
            
            let number = interaction.options.getNumber('number') || 1;
            if (number > max) number = max;
            
        let statusMessage = "<a:loading:1274651043908816969> Acessando informações da conta do usuário\n<a:loading:1274651043908816969> Acessando histórico de partidas\n";
        for (let i = 0; i < number; i++) {
            statusMessage += `<a:loading:1274651043908816969> Analisando estatísticas para partida ${i + 1}\n`;
        }
        await complexLoadingEmbed(statusMessage, 'leaguematchhistory', interaction, true, false, true);

        const accountInfo = await api.getAccountByRiotId(region, summonerName, tagLine, 'leagueMatchHistory');
        if (!accountInfo) {
            return await errorEmbed('An error occurred while fetching the account information.', 'leaguematchhistory', interaction, true, false);
        }
        statusMessage = statusMessage.replace("<a:loading:1274651043908816969> Acessando informações da conta do usuário", "✅ Acessando informações da conta do usuário");
        await complexLoadingEmbed(statusMessage, 'leaguematchhistory', interaction, true, false, true);
        
        const matchHistory = await api.getMatchHistory(region, accountInfo.puuid, 'leagueMatchHistory');
        if (!matchHistory) {
            return await errorEmbed('An error occurred while fetching the match history.', 'leaguematchhistory', interaction, true, false);
        }
        
        statusMessage = statusMessage.replace("<a:loading:1274651043908816969> Acessando histórico de partidas", "✅ Acessando histórico de partidas");
        await complexLoadingEmbed(statusMessage, 'leaguematchhistory', interaction, true, false, true);
        
        for (let i = 0; i < number; i++) {
            try {
                statusMessage = statusMessage.replace(`<a:loading:1274651043908816969> Analisando estatísticas para partida ${i + 1}`, `<a:loading:1274651043908816969> Analisando estatísticas para partida ${i + 1}\n<a:loading:1274651043908816969> Gerando gráfico`);
                await complexLoadingEmbed(statusMessage, 'leaguematchhistory', interaction, true, false, true);
                
                const match = matchHistory[i];
                const participant = match.info.participants.find(p => p.puuid === accountInfo.puuid);
                
                const playerRole = participant.lane;
                let playerRoleEmoji = '';
                switch (playerRole) {
                    case 'SUPPORT':
                        playerRoleEmoji = emojis.leagueSupport;
                        break;
                        case 'BOTTOM':
                            playerRoleEmoji = emojis.leagueBot
                            break;
                            case 'MIDDLE':
                                playerRoleEmoji = emojis.leagueMid;
                                break;
                                case 'JUNGLE':
                                    playerRoleEmoji = emojis.leagueJungle;
                                    break;
                    case 'TOP':
                        playerRoleEmoji = emojis.leagueTop;
                        break;
                        default:
                        playerRoleEmoji = '❓';
                        break;
                    }
                    
                    const championData = await api.fetchChampionName(participant.championId, 'leagueMatchHistory');
                    if (!championData) return await errorEmbed('An error occurred while fetching the champion data.', 'leaguematchhistory', interaction, true, false);
                    
                    const ddragonVersion = await api.getDDragonLatestVersion('leagueMatchHistory');
                    if (!ddragonVersion) return await errorEmbed('An error occurred while fetching the DDragon version.', 'leaguematchhistory', interaction, true, false);
                    
                    const win = participant.win;
                    const color = win ? '#0099ff' : '#FF0000';
                    
                    const chartBuffer = await generateMatchChart(participant);
                    const attachment = new AttachmentBuilder(chartBuffer, { name: 'match-stats.png' });
                    
                    const embed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(`${playerRoleEmoji} ${summonerName}#${tagLine} - ${championData.name || 'unknown'}  |  ${win ? 'Victory' : 'Defeat'}`)
                    .setDescription(`Match ${i + 1} | time: ${new Date(match.info.gameStartTimestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}\nGame Duration: ${Math.floor(match.info.gameDuration / 60)}m ${match.info.gameDuration % 60}s\n`)
                    .setThumbnail(`http://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${championData.fullImage || 'https://i.imgur.com/xU45ZZz.png'}`)
                    .setImage('attachment://match-stats.png')
                    .setTimestamp()
                    .addFields([
                        { name: 'Kills', value: participant.kills.toString(), inline: true },
                        { name: 'Deaths', value: participant.deaths.toString(), inline: true },
                        { name: 'Assists', value: participant.assists.toString(), inline: true },
                        { name: 'KDA', value: ((participant.kills + participant.assists) / participant.deaths).toFixed(2).toString(), inline: true },
                        { name: 'Damage Dealt to Champions', value: participant.totalDamageDealtToChampions.toString(), inline: true },
                        { name: 'Damage Taken', value: participant.totalDamageTaken.toString(), inline: true },
                        { name: 'Gold Earned', value: participant.goldEarned.toString(), inline: true },
                        { name: 'Vision Score', value: participant.visionScore.toString(), inline: true },
                        { name: 'Wards Placed', value: participant.wardsPlaced.toString(), inline: true },
                        { name: 'Creep Score', value: participant.totalMinionsKilled.toString(), inline: true },
                        { name: 'Creep Score per Minute', value: (participant.totalMinionsKilled / (match.info.gameDuration / 60)).toFixed(2).toString(), inline: true },
                    ])
                    .setFooter({ text: 'Powered by Riot Games API', iconURL: 'https://i.imgur.com/xU45ZZz.png' });

                    await interaction.followUp({ embeds: [embed], files: [attachment] });
                    statusMessage = statusMessage.replace(`<a:loading:1274651043908816969> Analisando estatísticas para partida ${i + 1}\n<a:loading:1274651043908816969> Gerando gráfico`, `✅ Analisando estatísticas para partida ${i + 1}\n✅ Gerando gráfico`);
                    await complexLoadingEmbed(statusMessage, 'leaguematchhistory', interaction, true, false, true);
                
            } catch (err) {
                console.error(err);
                return await errorEmbed(`An error occurred while analyzing the match ${i+1} statistics.`, 'leaguematchhistory', interaction, true, false);
            }
        }
        return complexsuccessEmbed('Match history successfully analyzed.', 'leaguematchhistory', interaction, true, false, true);
    },
};