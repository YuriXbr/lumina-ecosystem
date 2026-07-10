const api = require('../../api/riotApi.js');
const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const {
    generateMatchChart,
    generateTeamComparisonChart,
} = require('../../utils/scripts/chartGenerator');
const {
    complexLoadingEmbed,
    errorEmbed,
} = require('../../utils/embeds/cmdEmbeds.js');
const { emojis } = require('../../assets/emojis.js');

const max = Number(process.env.RIOT_MAX_MATCH_HISTORY) || 5; // Default to 5 if not set

// ─────────────────────────────────────────────────────────────────────────────
// View definitions
// Each view has: id, name (label for the middle button), statKey + statLabel
// (used for the team comparison chart), and a fields builder.
// ─────────────────────────────────────────────────────────────────────────────
const VIEWS = [
    {
        id: 'overview',
        name: 'Visão Geral',
        teamStatKey: 'totalDamageDealtToChampions',
        teamStatLabel: 'Dano a Campeões',
    },
    {
        id: 'damage_dealt',
        name: 'Dano Causado',
        teamStatKey: 'totalDamageDealtToChampions',
        teamStatLabel: 'Dano a Campeões',
    },
    {
        id: 'damage_taken',
        name: 'Dano Recebido',
        teamStatKey: 'totalDamageTaken',
        teamStatLabel: 'Dano Recebido',
    },
    {
        id: 'heal',
        name: 'Cura',
        teamStatKey: 'totalHeal',
        teamStatLabel: 'Cura Total',
    },
    {
        id: 'farm',
        name: 'Farm',
        teamStatKey: 'totalMinionsKilled',
        teamStatLabel: 'CS Total',
    },
    {
        id: 'objectives',
        name: 'Objetivos',
        teamStatKey: 'damageDealtToObjectives',
        teamStatLabel: 'Dano a Objetivos',
    },
    {
        id: 'wards',
        name: 'Wards',
        teamStatKey: 'wardsPlaced',
        teamStatLabel: 'Wards Colocadas',
    },
    {
        id: 'kda',
        name: 'KDA',
        teamStatKey: 'kda',
        teamStatLabel: 'KDA',
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps teamPosition (correct field) to the role emoji.
 * NOTE: Uses `teamPosition` (TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY), NOT `lane`
 * (which incorrectly reports JUNGLE for top-laners with Smite, etc.).
 */
function getRoleEmoji(teamPosition) {
    switch (teamPosition) {
        case 'TOP': return emojis.leagueTop;
        case 'JUNGLE': return emojis.leagueJungle;
        case 'MIDDLE': return emojis.leagueMid;
        case 'BOTTOM': return emojis.leagueBot;
        case 'UTILITY': return emojis.leagueSupport;
        default: return '❓';
    }
}

/** Formata número para exibição com separador de milhar pt-BR. */
function fmt(v) {
    return (v || 0).toLocaleString('pt-BR');
}

/** Formata duração em segundos como "Xm Ys". */
function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

/** Lê um valor aninhado (top-level ou dentro de `objectives`). */
function pickStat(p, key) {
    if (typeof p[key] === 'number') return p[key];
    if (p.objectives && typeof p.objectives[key] === 'number') {
        return p.objectives[key];
    }
    return 0;
}

/**
 * Retorna os campos do embed para uma determinada view.
 * @param {string} viewId - O ID da view
 * @param {object} p - Dados do participante
 * @param {object} match - Dados da partida
 * @returns {Array<{name: string, value: string, inline: boolean}>}
 */
function getViewFields(viewId, p, match) {
    const durationMin = match.info.gameDuration / 60 || 1;

    switch (viewId) {
        case 'overview':
            return [
                { name: 'Abates', value: fmt(p.kills), inline: true },
                { name: 'Mortes', value: fmt(p.deaths), inline: true },
                { name: 'Assistências', value: fmt(p.assists), inline: true },
                { name: 'KDA', value: ((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2), inline: true },
                { name: 'Ouro', value: fmt(p.goldEarned), inline: true },
                { name: 'Visão', value: fmt(p.visionScore), inline: true },
                { name: 'Wards', value: fmt(p.wardsPlaced), inline: true },
                { name: 'Dano Causado', value: fmt(p.totalDamageDealtToChampions), inline: true },
                { name: 'Dano Recebido', value: fmt(p.totalDamageTaken), inline: true },
                { name: 'CS', value: fmt(p.totalMinionsKilled), inline: true },
                { name: 'CS/min', value: (p.totalMinionsKilled / durationMin).toFixed(2), inline: true },
            ];

        case 'damage_dealt':
            return [
                { name: 'Dano Total a Campeões', value: fmt(p.totalDamageDealtToChampions), inline: true },
                { name: 'Dano Físico', value: fmt(p.physicalDamageDealtToChampions), inline: true },
                { name: 'Dano Mágico', value: fmt(p.magicDamageDealtToChampions), inline: true },
                { name: 'Dano Verdadeiro', value: fmt(p.trueDamageDealtToChampions), inline: true },
                { name: 'Dano a Objetivos', value: fmt(p.damageDealtToObjectives), inline: true },
                { name: 'Dano a Torres', value: fmt(p.damageDealtToTurrets), inline: true },
                { name: 'Dano a Monstros Épicos', value: fmt(p.damageDealtToEpicMonsters), inline: true },
                { name: 'Dano Total', value: fmt(p.totalDamageDealt), inline: true },
            ];

        case 'damage_taken':
            return [
                { name: 'Dano Total Recebido', value: fmt(p.totalDamageTaken), inline: true },
                { name: 'Dano Físico Recebido', value: fmt(p.physicalDamageTaken), inline: true },
                { name: 'Dano Mágico Recebido', value: fmt(p.magicDamageTaken), inline: true },
                { name: 'Dano Verdadeiro Recebido', value: fmt(p.trueDamageTaken), inline: true },
                { name: 'Dano Mitigado', value: fmt(p.damageSelfMitigated), inline: true },
                { name: 'Cura Total', value: fmt(p.totalHeal), inline: true },
            ];

        case 'heal':
            return [
                { name: 'Cura Total', value: fmt(p.totalHeal), inline: true },
                { name: 'Cura em Aliados', value: fmt(p.totalHealsOnTeammates), inline: true },
                { name: 'Escudo em Aliados', value: fmt(p.totalDamageShieldedOnTeammates), inline: true },
            ];

        case 'farm':
            return [
                { name: 'CS Total', value: fmt(p.totalMinionsKilled), inline: true },
                { name: 'Monstros Neutros', value: fmt(p.neutralMinionsKilled), inline: true },
                { name: 'CS/min', value: (p.totalMinionsKilled / durationMin).toFixed(2), inline: true },
                { name: 'Ouro Ganho', value: fmt(p.goldEarned), inline: true },
                { name: 'Ouro Gasto', value: fmt(p.goldSpent), inline: true },
            ];

        case 'objectives': {
            const baronKills = pickStat(p, 'baronKills');
            const dragonKills = pickStat(p, 'dragonKills');
            const heraldKills = pickStat(p, 'riftHeraldKills');
            const objectivesStolen = pickStat(p, 'objectivesStolen');
            return [
                { name: 'Torres Destruídas', value: fmt(p.turretKills), inline: true },
                { name: 'Inibidores Destruídos', value: fmt(p.inhibitorKills), inline: true },
                { name: 'Barons', value: fmt(baronKills), inline: true },
                { name: 'Dragões', value: fmt(dragonKills), inline: true },
                { name: 'Arautos', value: fmt(heraldKills), inline: true },
                { name: 'Objetivos Roubados', value: fmt(objectivesStolen), inline: true },
            ];
        }

        case 'wards':
            return [
                { name: 'Wards Colocadas', value: fmt(p.wardsPlaced), inline: true },
                { name: 'Wards Destruídas', value: fmt(p.wardsKilled), inline: true },
                { name: 'Pontuação de Visão', value: fmt(p.visionScore), inline: true },
                { name: 'Wards Detectoras', value: fmt(p.detectorWardsPlaced), inline: true },
                { name: 'Wards de Visão Compradas', value: fmt(p.visionWardsBoughtInGame), inline: true },
                { name: 'Wards de Visão (Sight)', value: fmt(p.sightWardsBoughtInGame), inline: true },
            ];

        case 'kda': {
            const kda = ((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2);
            const firstBlood = p.firstBloodKill
                ? 'Abate'
                : p.firstBloodAssist
                    ? 'Assistência'
                    : 'Não';
            return [
                { name: 'Abates', value: fmt(p.kills), inline: true },
                { name: 'Mortes', value: fmt(p.deaths), inline: true },
                { name: 'Assistências', value: fmt(p.assists), inline: true },
                { name: 'KDA', value: kda, inline: true },
                { name: 'Double Kills', value: fmt(p.doubleKills), inline: true },
                { name: 'Triple Kills', value: fmt(p.tripleKills), inline: true },
                { name: 'Quadra Kills', value: fmt(p.quadraKills), inline: true },
                { name: 'Penta Kills', value: fmt(p.pentaKills), inline: true },
                { name: 'Killing Sprees', value: fmt(p.killingSprees), inline: true },
                { name: 'Maior Killing Spree', value: fmt(p.largestKillingSpree), inline: true },
                { name: 'First Blood', value: firstBlood, inline: true },
            ];
        }

        default:
            return [];
    }
}

/**
 * Constrói o embed da partida para a view atual.
 */
function buildMatchEmbed(processed, viewIdx, teamMode, summonerName, tagLine, matchIdx, total) {
    const { participant, match, championData, ddragonVersion } = processed;
    const view = VIEWS[viewIdx];

    const roleEmoji = getRoleEmoji(participant.teamPosition);
    const win = participant.win;
    const color = win ? 0x0099ff : 0xff3636;
    const championName = (championData && championData.name) || participant.championName || 'unknown';

    const dateStr = new Date(match.info.gameStartTimestamp).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
    const durationStr = formatDuration(match.info.gameDuration);

    const championThumb = championData && championData.fullImage
        ? `http://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${championData.fullImage}`
        : 'https://i.imgur.com/xU45ZZz.png';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${roleEmoji} ${summonerName}#${tagLine} - ${championName}  |  ${win ? 'Victória' : 'Derrota'}`)
        .setDescription(
            `Partida ${matchIdx + 1}/${total} | ${dateStr} | Duração: ${durationStr}` +
            (teamMode ? `\n**Modo Comparação de Equipe** — ${view.teamStatLabel}` : `\n**View:** ${view.name}`)
        )
        .setThumbnail(championThumb)
        .setImage(teamMode ? 'attachment://team-comparison.png' : 'attachment://match-stats.png')
        .setTimestamp()
        .setFooter({ text: 'Powered by Riot Games API', iconURL: 'https://i.imgur.com/xU45ZZz.png' });

    const fields = getViewFields(view.id, participant, match);
    embed.addFields(fields);

    return embed;
}

/**
 * Constrói as duas ActionRows de botões com base no estado atual.
 *
 * Row 1: `◀️ Anterior` | `{View Name}` (disabled) | `▶️ Próximo` | `👥 Team`
 * Row 2: `◀️ Partida Anterior` | `Partida X/Y` (disabled) | `▶️ Próxima Partida`
 */
function buildRows(matchIdx, total, viewIdx, teamMode, processedMatches, loadingMatches, allDisabled = false) {
    const view = VIEWS[viewIdx];

    // ── Row 1: views + team toggle ──────────────────────────────────────────
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('view_prev')
            .setLabel('Anterior')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(allDisabled),
        new ButtonBuilder()
            .setCustomId('view_current')
            .setLabel(view.name)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true), // Always disabled — display only
        new ButtonBuilder()
            .setCustomId('view_next')
            .setLabel('Próximo')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(allDisabled),
        new ButtonBuilder()
            .setCustomId('view_team')
            .setLabel(teamMode ? 'Modo Time' : 'Comparar Time')
            .setEmoji('👥')
            .setStyle(teamMode ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(allDisabled || viewIdx === 0), // Desabilita na Visão Geral
    );

    // ── Row 2: match navigation ─────────────────────────────────────────────
    const isFirst = matchIdx === 0;
    const isLast = matchIdx >= total - 1;
    const nextLoading = loadingMatches.has(matchIdx + 1);
    const nextReady = processedMatches.has(matchIdx + 1);

    let nextLabel = '▶️ Próxima Partida';
    let nextDisabled = allDisabled;
    if (isLast) {
        nextDisabled = true;
    } else if (nextLoading && !nextReady) {
        nextLabel = 'Carregando...';
        nextDisabled = true;
    }

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('match_prev')
            .setLabel('Partida Anterior')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(allDisabled || isFirst),
        new ButtonBuilder()
            .setCustomId('match_current')
            .setLabel(`Partida ${matchIdx + 1}/${total}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true), // Always disabled — display only
        new ButtonBuilder()
            .setCustomId('match_next')
            .setLabel(nextLabel)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(nextDisabled),
    );

    return [row1, row2];
}

// ─────────────────────────────────────────────────────────────────────────────
// Command
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
    permission: 'default',
    category: 'league',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('leaguematchhistory')
        .setNameLocalizations({
            'pt-BR': 'historicodepartidas',
        })
        .setDescription('Shows the match history of a League of Legends player.')
        .addStringOption((option) =>
            option
                .setName('region')
                .setNameLocalizations({ 'pt-BR': 'região' })
                .setDescription('The region of the player.')
                .setDescriptionLocalizations({ 'pt-BR': 'A região do jogador.' })
                .setRequired(true)
                .addChoices(
                    { name: 'AMERICAS', value: 'americas' },
                    { name: 'EUROPE', value: 'europe' },
                    { name: 'ASIA', value: 'asia' },
                ),
        )
        .addStringOption((option) =>
            option
                .setName('summonername')
                .setNameLocalizations({ 'pt-BR': 'invocador' })
                .setDescription('The summoner name of the player.')
                .setDescriptionLocalizations({ 'pt-BR': 'O nome do invocador.' })
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('tagline')
                .setNameLocalizations({ 'pt-BR': 'hashtag' })
                .setDescription('The tagline of the player.')
                .setDescriptionLocalizations({ 'pt-BR': 'O hashtag do jogador.' })
                .setRequired(true),
        )
        .addNumberOption((option) =>
            option
                .setName('number')
                .setNameLocalizations({ 'pt-BR': 'quantidade' })
                .setDescription('The number of matches to show.')
                .setDescriptionLocalizations({ 'pt-BR': 'A quantidade de partidas a serem mostradas.' })
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(max),
        ),

    async execute(interaction) {
        await interaction.deferReply();

        // ── Parse & validate options ──────────────────────────────────────────
        const region = interaction.options.getString('region');
        const summonerName = interaction.options.getString('summonername');
        const tagLine = interaction.options.getString('tagline');

        if (tagLine.length > 5) {
            return await errorEmbed(
                'The tagline must have a maximum of 5 characters.',
                'leaguematchhistory',
                interaction,
                true,
                false,
            );
        }
        if (tagLine[0] === '#') {
            return await errorEmbed(
                'You must insert only the numbers of the tagline. Do not insert "#".',
                'leaguematchhistory',
                interaction,
                true,
                false,
            );
        }

        let number = interaction.options.getNumber('number') || 1;
        if (number > max) number = max;

        // ── Loading: account info ─────────────────────────────────────────────
        await complexLoadingEmbed(
            '<a:loading:1274651043908816969> Buscando informações da conta...',
            'leaguematchhistory',
            interaction,
            true,
            false,
            true,
        );

        const accountInfo = await api.getAccountByRiotId(region, summonerName, tagLine, 'leagueMatchHistory');
        if (!accountInfo) {
            return await errorEmbed(
                'An error occurred while fetching the account information.',
                'leaguematchhistory',
                interaction,
                true,
                false,
            );
        }
        if (accountInfo.error) {
            return await errorEmbed(
                'The summoner you entered does not exist. Please check the account name and region.',
                'leaguematchhistory',
                interaction,
                true,
                false,
            );
        }

        // ── Loading: match history ────────────────────────────────────────────
        await complexLoadingEmbed(
            '<a:loading:1274651043908816969> Buscando histórico de partidas...',
            'leaguematchhistory',
            interaction,
            true,
            false,
            true,
        );

        const fullHistory = await api.getMatchHistory(region, accountInfo.puuid, 'leagueMatchHistory');
        if (!fullHistory || !Array.isArray(fullHistory) || fullHistory.length === 0) {
            return await errorEmbed(
                'An error occurred while fetching the match history, or no matches were found.',
                'leaguematchhistory',
                interaction,
                true,
                false,
            );
        }

        // Slice to requested number of matches
        const matches = fullHistory.slice(0, number);
        const total = matches.length;

        // ── Loading: first match ──────────────────────────────────────────────
        await complexLoadingEmbed(
            '<a:loading:1274651043908816969> Buscando partidas...\n' +
            `<a:loading:1274651043908816969> Processando partida 1 de ${total}...`,
            'leaguematchhistory',
            interaction,
            true,
            false,
            true,
        );

        // ── Match cache & loading state ───────────────────────────────────────
        // processedMatches: Map<index, { participant, match, championData, ddragonVersion, individualChart, teamCharts: Map<viewIdx, Buffer> }>
        const processedMatches = new Map();
        // loadingMatches: Set<index> — indices currently being loaded
        const loadingMatches = new Set();

        /**
         * Processa uma partida: encontra o participante, busca o nome do campeão,
         * gera o gráfico individual e armazena tudo no cache.
         */
        async function processMatch(idx) {
            if (processedMatches.has(idx)) return processedMatches.get(idx);
            if (loadingMatches.has(idx)) {
                // Aguarda o processamento em andamento
                while (loadingMatches.has(idx)) {
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise((r) => setTimeout(r, 100));
                }
                return processedMatches.get(idx);
            }

            loadingMatches.add(idx);
            try {
                const match = matches[idx];
                if (!match || !match.info) throw new Error('Match data not found');

                const participant = match.info.participants.find(
                    (p) => p.puuid === accountInfo.puuid,
                );
                if (!participant) throw new Error('Participant not found in match');

                const championData = await api.fetchChampionName(
                    participant.championId,
                    'leagueMatchHistory',
                );
                const ddragonVersion = await api.getDDragonLatestVersion('leagueMatchHistory');
                const individualChart = await generateMatchChart(participant);

                const result = {
                    match,
                    participant,
                    championData,
                    ddragonVersion,
                    individualChart,
                    teamCharts: new Map(),
                };
                processedMatches.set(idx, result);
                loadingMatches.delete(idx);
                return result;
            } catch (err) {
                loadingMatches.delete(idx);
                throw err;
            }
        }

        /**
         * Busca ou gera o gráfico de comparação de equipe para a view atual.
         * Resultados são cacheados por (matchIdx, viewIdx).
         */
        async function getOrGenerateTeamChart(processed, viewIdx) {
            if (processed.teamCharts.has(viewIdx)) {
                return processed.teamCharts.get(viewIdx);
            }
            const view = VIEWS[viewIdx];
            const allParticipants = processed.match.info.participants;
            const buffer = await generateTeamComparisonChart(
                processed.participant,
                allParticipants,
                view.teamStatKey,
                processed.ddragonVersion,
                view.teamStatLabel,
            );
            processed.teamCharts.set(viewIdx, buffer);
            return buffer;
        }

        // ── Processa a primeira partida ──────────────────────────────────────
        let currentMatchIdx = 0;
        let currentViewIdx = 0; // Visão Geral
        let teamMode = false;

        let firstProcessed;
        try {
            firstProcessed = await processMatch(0);
        } catch (err) {
            console.error('[leagueMatchHistory] Erro ao processar primeira partida:', err);
            return await errorEmbed(
                'An error occurred while analyzing the match statistics.',
                'leaguematchhistory',
                interaction,
                true,
                false,
            );
        }

        // ── Renderiza o embed inicial ─────────────────────────────────────────
        const initialEmbed = buildMatchEmbed(
            firstProcessed,
            currentViewIdx,
            teamMode,
            summonerName,
            tagLine,
            currentMatchIdx,
            total,
        );
        const initialRows = buildRows(
            currentMatchIdx,
            total,
            currentViewIdx,
            teamMode,
            processedMatches,
            loadingMatches,
        );
        const initialFiles = [
            new AttachmentBuilder(firstProcessed.individualChart, { name: 'match-stats.png' }),
        ];

        await interaction.editReply({
            embeds: [initialEmbed],
            components: initialRows,
            files: initialFiles,
            content: null,
        });

        // ── Pré-carrega a próxima partida em background ──────────────────────
        function preloadNext() {
            const nextIdx = currentMatchIdx + 1;
            if (nextIdx < total && !processedMatches.has(nextIdx) && !loadingMatches.has(nextIdx)) {
                processMatch(nextIdx)
                    .then(() => {
                        // Atualiza silenciosamente os botões para refletir que a próxima
                        // partida está pronta (apenas se ainda estamos na mesma partida).
                        refreshRowsQuietly().catch(() => {});
                    })
                    .catch((err) => {
                        console.error('[leagueMatchHistory] Background preload falhou:', err.message);
                    });
            }
        }
        preloadNext();

        // ── Captura a mensagem para o collector ───────────────────────────────
        const replyMessage = await interaction.fetchReply();

        // ── Collector ─────────────────────────────────────────────────────────
        const filter = (i) => i.user.id === interaction.user.id;
        const collector = replyMessage.createMessageComponentCollector({
            filter,
            time: 5 * 60 * 1000, // 5 minutos
        });

        /**
         * Atualiza o embed e botões sem alterar o conteúdo (usado após preload).
         */
        async function refreshRowsQuietly() {
            const processed = processedMatches.get(currentMatchIdx);
            if (!processed) return;
            const embed = buildMatchEmbed(
                processed,
                currentViewIdx,
                teamMode,
                summonerName,
                tagLine,
                currentMatchIdx,
                total,
            );
            const rows = buildRows(
                currentMatchIdx,
                total,
                currentViewIdx,
                teamMode,
                processedMatches,
                loadingMatches,
            );
            await interaction.editReply({ embeds: [embed], components: rows });
        }

        /**
         * Atualiza a mensagem com o embed atual (sem alterar anexos).
         */
        async function refreshEmbedOnly(i) {
            const processed = processedMatches.get(currentMatchIdx);
            if (!processed) return;
            const embed = buildMatchEmbed(
                processed,
                currentViewIdx,
                teamMode,
                summonerName,
                tagLine,
                currentMatchIdx,
                total,
            );
            const rows = buildRows(
                currentMatchIdx,
                total,
                currentViewIdx,
                teamMode,
                processedMatches,
                loadingMatches,
            );
            await i.editReply({ embeds: [embed], components: rows });
        }

        /**
         * Atualiza a mensagem com o embed atual + anexo apropriado
         * (gráfico individual ou gráfico de comparação de equipe).
         */
        async function refreshWithAttachment(i) {
            const processed = processedMatches.get(currentMatchIdx);
            if (!processed) return;

            const embed = buildMatchEmbed(
                processed,
                currentViewIdx,
                teamMode,
                summonerName,
                tagLine,
                currentMatchIdx,
                total,
            );
            const rows = buildRows(
                currentMatchIdx,
                total,
                currentViewIdx,
                teamMode,
                processedMatches,
                loadingMatches,
            );

            let files;
            if (teamMode) {
                const teamChart = await getOrGenerateTeamChart(processed, currentViewIdx);
                files = [new AttachmentBuilder(teamChart, { name: 'team-comparison.png' })];
            } else {
                files = [new AttachmentBuilder(processed.individualChart, { name: 'match-stats.png' })];
            }

            await i.editReply({ embeds: [embed], components: rows, files });
        }

        collector.on('collect', async (i) => {
            try {
                // ── View navigation ──────────────────────────────────────────
                if (i.customId === 'view_prev') {
                    currentViewIdx = (currentViewIdx - 1 + VIEWS.length) % VIEWS.length;
                    await i.deferUpdate();
                    await refreshWithAttachment(i);
                    return;
                }

                if (i.customId === 'view_next') {
                    currentViewIdx = (currentViewIdx + 1) % VIEWS.length;
                    await i.deferUpdate();
                    await refreshWithAttachment(i);
                    return;
                }

                // ── Team comparison toggle ──────────────────────────────────
                if (i.customId === 'view_team') {
                    teamMode = !teamMode;
                    await i.deferUpdate();
                    await refreshWithAttachment(i);
                    return;
                }

                // ── Match navigation: previous ───────────────────────────────
                if (i.customId === 'match_prev') {
                    if (currentMatchIdx > 0) {
                        currentMatchIdx--;
                        currentViewIdx = 0; // Reset to Visão Geral
                        teamMode = false;   // Reset team mode
                        await i.deferUpdate();
                        await refreshWithAttachment(i);
                    } else {
                        await i.deferUpdate();
                    }
                    return;
                }

                // ── Match navigation: next ───────────────────────────────────
                if (i.customId === 'match_next') {
                    if (currentMatchIdx >= total - 1) {
                        await i.deferUpdate();
                        return;
                    }

                    const nextIdx = currentMatchIdx + 1;

                    // Caso 1: próxima partida já está carregada — troca imediatamente
                    if (processedMatches.has(nextIdx)) {
                        currentMatchIdx = nextIdx;
                        currentViewIdx = 0; // Reset to Visão Geral
                        teamMode = false;   // Reset team mode
                        await i.deferUpdate();
                        await refreshWithAttachment(i);
                        preloadNext();
                        return;
                    }

                    // Caso 2: próxima partida NÃO está carregada — carrega sob demanda
                    // Mostra mensagem "Carregando partida..." enquanto processa
                    await i.deferUpdate();

                    const loadingEmbed = new EmbedBuilder()
                        .setColor(0xffff00)
                        .setTitle('<a:loading:1274651043908816969> | CARREGANDO')
                        .setDescription(`Carregando partida ${nextIdx + 1}/${total}...`)
                        .setFooter({
                            text: 'origin: leaguematchhistory',
                            iconURL: 'https://i.imgur.com/xU45ZZz.png',
                        });

                    // Atualiza o botão para mostrar "Carregando..." (disabled)
                    const loadingRows = buildRows(
                        currentMatchIdx,
                        total,
                        currentViewIdx,
                        teamMode,
                        processedMatches,
                        loadingMatches,
                    );

                    await i.editReply({
                        embeds: [loadingEmbed],
                        components: loadingRows,
                        files: [],
                        content: null,
                    });

                    try {
                        await processMatch(nextIdx);
                        currentMatchIdx = nextIdx;
                        currentViewIdx = 0; // Reset to Visão Geral
                        teamMode = false;   // Reset team mode
                        await refreshWithAttachment(i);
                        preloadNext();
                    } catch (err) {
                        console.error('[leagueMatchHistory] Erro ao carregar partida sob demanda:', err);
                        // Restaura o embed anterior
                        await refreshWithAttachment(i);
                    }
                    return;
                }
            } catch (err) {
                console.error('[leagueMatchHistory] Erro no collector:', err);
                try {
                    await i.followUp({
                        content: 'Ocorreu um erro ao processar sua ação. Tente novamente.',
                        ephemeral: true,
                    });
                } catch (_) {
                    // noop
                }
            }
        });

        collector.on('end', async () => {
            try {
                // Desabilita todos os botões ao terminar o collector
                const processed = processedMatches.get(currentMatchIdx);
                if (!processed) return;
                const embed = buildMatchEmbed(
                    processed,
                    currentViewIdx,
                    teamMode,
                    summonerName,
                    tagLine,
                    currentMatchIdx,
                    total,
                );
                const rows = buildRows(
                    currentMatchIdx,
                    total,
                    currentViewIdx,
                    teamMode,
                    processedMatches,
                    loadingMatches,
                    true, // allDisabled
                );
                await interaction.editReply({ embeds: [embed], components: rows });
            } catch (err) {
                // noop — mensagem pode ter sido deletada
            }
        });
    },
};
