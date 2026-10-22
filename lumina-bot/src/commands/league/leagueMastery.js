const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../../api/riotApi.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');
const { loadingEmbed, errorEmbed } = require('../../utils/embeds/cmdEmbeds.js');

module.exports = {
    permission: 'default',
    category: 'league',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('league-mastery')
        .setDescription('Get the mastery of a player in a champion')
        .setDescriptionLocalizations(loc('Obtém a maestria de um jogador em um campeão', 'Obtén la maestría de un jugador en un campeón'))
        .addStringOption(option =>
            option.setName('region')
                .setNameLocalizations({ "pt-BR": 'região', "es-ES": 'región' })
                .setDescription('The region of the player.')
                .setDescriptionLocalizations(loc('A região do jogador.', 'La región del jugador.'))
                .setRequired(true)
                .addChoices(
                    { name: 'AMERICAS', value: 'americas'},
                    { name: 'EUROPE', value: 'europe'},
                    { name: 'ASIA', value: 'asia'}
                )
        )
        .addStringOption(option =>
            option.setName('summonername')
                .setNameLocalizations({ "pt-BR": 'invocador', "es-ES": 'invocador' })
                .setDescription('The summoner name of the player.')
                .setDescriptionLocalizations(loc('O nome do invocador.', 'El nombre del invocador.'))
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('tagline')
                .setNameLocalizations({ "pt-BR": 'hashtag', "es-ES": 'etiqueta' })
                .setDescription('The tagline of the player.')
                .setDescriptionLocalizations(loc('A hashtag do jogador.', 'La etiqueta del jugador.'))
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('server')
                .setNameLocalizations({ "pt-BR": 'servidor', "es-ES": 'servidor' })
                .setDescription('The server of the player.')
                .setDescriptionLocalizations(loc('O servidor do jogador.', 'El servidor del jugador.'))
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
        ),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const region = interaction.options.getString('region');
        const server = interaction.options.getString('server');
        const summonerName = interaction.options.getString('summonername');
        const tagLine = interaction.options.getString('tagline');

        if (tagLine.length > 5) return errorEmbed(translator('cmd.leagueProfile.taglineTooLong'), 'leagueMastery', interaction, true, true);
        if (tagLine[0] === '#') return errorEmbed(translator('cmd.leagueProfile.taglineFormat'), 'leagueMastery', interaction, true, true);

        await interaction.deferReply();
        interaction.editReply({ embeds: [loadingEmbed] });

        // 1. Busca conta por Riot ID para obter o PUUID
        const accountInfo = await api.getAccountByRiotId(region, summonerName, tagLine, 'leagueMastery');
        if (!accountInfo) return errorEmbed(translator('cmd.leagueProfile.accountError'), 'leagueMastery', interaction, true, true);
        if (accountInfo && accountInfo.error === 'Account not found') {
            return errorEmbed(translator('cmd.leagueProfile.summonerNotFound'), 'leagueMastery', interaction, true, true);
        }

        // 2. Busca summoner info para obter o summonerId e o level
        const summonerInfo = await api.getSummonerInfo(server, accountInfo.puuid, 'leagueMastery');
        if (!summonerInfo) return errorEmbed(translator('cmd.leagueProfile.summonerError'), 'leagueMastery', interaction, true, true);

        // 3. Busca maestria de campeões por PUUID
        const masteryInfo = await api.getChampionMastery(server, summonerInfo.puuid, 'leagueMastery');
        if (!masteryInfo || masteryInfo.length === 0) {
            return errorEmbed(translator('cmd.leagueMastery.noMastery'), 'leagueMastery', interaction, true, true);
        }

        // 4. Ordena por pontos e pega o top 5
        const topMastery = masteryInfo.sort((a, b) => b.championPoints - a.championPoints).slice(0, 5);

        // 5. Busca nomes dos campeões
        const topMasteryWithNames = await Promise.all(
            topMastery.map(async (mastery) => {
                const champion = await api.fetchChampionName(mastery.championId, 'leagueMastery');
                return {
                    ...mastery,
                    championName: champion ? champion.name : 'Unknown',
                    championId: champion ? champion.id : 'Unknown',
                };
            })
        );

        // 6. Busca versão do DDragon para o ícone de perfil
        const ddragonVersion = await api.getDDragonLatestVersion('leagueMastery');
        if (!ddragonVersion) return errorEmbed(translator('cmd.leagueProfile.ddragonError'), 'leagueMastery', interaction, true, true);

        // 7. Monta a embed
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(translator('cmd.leagueMastery.title', { name: accountInfo.gameName, tag: accountInfo.tagLine }))
            .setDescription(translator('cmd.leagueMastery.description', { level: summonerInfo.summonerLevel }))
            .setTimestamp()
            .setFooter({ text: 'Powered by Riot Games API', iconURL: 'https://i.imgur.com/xU45ZZz.png' })
            .setThumbnail(`http://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${summonerInfo.profileIconId}.png`);

        // Adiciona os top 5 campeões como fields
        topMasteryWithNames.forEach((mastery, index) => {
            const levelEmoji = mastery.championLevel >= 7 ? '🏆' : mastery.championLevel >= 5 ? '⭐' : '';
            embed.addFields({
                name: `${index + 1}. ${mastery.championName} ${levelEmoji}`,
                value: `**Level:** ${mastery.championLevel}\n**Points:** ${mastery.championPoints.toLocaleString()}\n**Last Play:** ${mastery.lastPlayTime ? `<t:${Math.floor(mastery.lastPlayTime / 1000)}:R>` : 'N/A'}`,
                inline: true,
            });
        });

        interaction.editReply({ embeds: [embed], content: '' });
    }
};
