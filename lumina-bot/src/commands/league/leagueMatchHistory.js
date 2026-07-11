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
    generateViewChart,
} = require('../../utils/scripts/chartGenerator');
const {
    complexLoadingEmbed,
    errorEmbed,
} = require('../../utils/embeds/cmdEmbeds.js');
const { emojis } = require('../../assets/emojis.js');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

const max = Number(process.env.RIOT_MAX_MATCH_HISTORY) || 5;

// ─────────────────────────────────────────────────────────────────────────────
// View definitions
// nameKey / teamStatLabelKey are i18n keys resolved at render time.
// ─────────────────────────────────────────────────────────────────────────────
const VIEWS = [
    {
        id: 'overview',
        nameKey: 'cmd.leagueMatchHistory.viewOverview',
        teamStatKey: 'totalDamageDealtToChampions',
        teamStatLabelKey: 'cmd.leagueMatchHistory.teamLabelDamageDealt',
    },
    {
        id: 'damage_dealt',
        nameKey: 'cmd.leagueMatchHistory.viewDamageDealt',
        teamStatKey: 'totalDamageDealtToChampions',
        teamStatLabelKey: 'cmd.leagueMatchHistory.teamLabelDamageDealt',
    },
    {
        id: 'damage_taken',
        nameKey: 'cmd.leagueMatchHistory.viewDamageTaken',
        teamStatKey: 'totalDamageTaken',
        teamStatLabelKey: 'cmd.leagueMatchHistory.teamLabelDamageTaken',
    },
    {
        id: 'heal',
        nameKey: 'cmd.leagueMatchHistory.viewHeal',
        teamStatKey: 'totalHeal',
        teamStatLabelKey: 'cmd.leagueMatchHistory.teamLabelHeal',
    },
    {
        id: 'farm',
        nameKey: 'cmd.leagueMatchHistory.viewFarm',
        teamStatKey: 'totalMinionsKilled',
        teamStatLabelKey: 'cmd.leagueMatchHistory.teamLabelFarm',
    },
    {
        id: 'objectives',
        nameKey: 'cmd.leagueMatchHistory.viewObjectives',
        teamStatKey: 'damageDealtToObjectives',
        teamStatLabelKey: 'cmd.leagueMatchHistory.teamLabelObjectives',
    },
    {
        id: 'wards',
        nameKey: 'cmd.leagueMatchHistory.viewWards',
        teamStatKey: 'wardsPlaced',
        teamStatLabelKey: 'cmd.leagueMatchHistory.teamLabelWards',
    },
    {
        id: 'kda',
        nameKey: 'cmd.leagueMatchHistory.viewKda',
        teamStatKey: 'kda',
        teamStatLabelKey: 'cmd.leagueMatchHistory.teamLabelKda',
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

function fmt(v, locale) {
    return (v || 0).toLocaleString(locale || 'en-US');
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

function pickStat(p, key) {
    if (typeof p[key] === 'number') return p[key];
    if (p.objectives && typeof p.objectives[key] === 'number') return p.objectives[key];
    return 0;
}

/**
 * Retorna os campos do embed para uma determinada view.
 * @param {string} viewId - O ID da view
 * @param {object} p - Dados do participante
 * @param {object} match - Dados da partida
 * @param {Function} t - translator function
 * @param {string} locale - locale string
 */
function getViewFields(viewId, p, match, t, locale) {
    const durationMin = match.info.gameDuration / 60 || 1;

    switch (viewId) {
        case 'overview':
            return [
                { name: t('cmd.leagueMatchHistory.statKills'), value: fmt(p.kills, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statDeaths'), value: fmt(p.deaths, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statAssists'), value: fmt(p.assists, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statKDA'), value: ((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2), inline: true },
                { name: t('cmd.leagueMatchHistory.statGold'), value: fmt(p.goldEarned, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statVision'), value: fmt(p.visionScore, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statWards'), value: fmt(p.wardsPlaced, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statDamageDealt'), value: fmt(p.totalDamageDealtToChampions, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statDamageTaken'), value: fmt(p.totalDamageTaken, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statCS'), value: fmt(p.totalMinionsKilled, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statCSPerMin'), value: (p.totalMinionsKilled / durationMin).toFixed(2), inline: true },
            ];

        case 'damage_dealt':
            return [
                { name: t('cmd.leagueMatchHistory.statTotalDamageChamps'), value: fmt(p.totalDamageDealtToChampions, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statPhysicalDamage'), value: fmt(p.physicalDamageDealtToChampions, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statMagicDamage'), value: fmt(p.magicDamageDealtToChampions, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statTrueDamage'), value: fmt(p.trueDamageDealtToChampions, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statDamageObjectives'), value: fmt(p.damageDealtToObjectives, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statDamageTurrets'), value: fmt(p.damageDealtToTurrets, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statDamageEpicMonsters'), value: fmt(p.damageDealtToEpicMonsters, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statTotalDamage'), value: fmt(p.totalDamageDealt, locale), inline: true },
            ];

        case 'damage_taken':
            return [
                { name: t('cmd.leagueMatchHistory.statTotalDamageTaken'), value: fmt(p.totalDamageTaken, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statPhysicalDamageTaken'), value: fmt(p.physicalDamageTaken, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statMagicDamageTaken'), value: fmt(p.magicDamageTaken, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statTrueDamageTaken'), value: fmt(p.trueDamageTaken, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statDamageMitigated'), value: fmt(p.damageSelfMitigated, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statTotalHeal'), value: fmt(p.totalHeal, locale), inline: true },
            ];

        case 'heal':
            return [
                { name: t('cmd.leagueMatchHistory.statTotalHeal'), value: fmt(p.totalHeal, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statHealTeammates'), value: fmt(p.totalHealsOnTeammates, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statShieldTeammates'), value: fmt(p.totalDamageShieldedOnTeammates, locale), inline: true },
            ];

        case 'farm':
            return [
                { name: t('cmd.leagueMatchHistory.statCSTotal'), value: fmt(p.totalMinionsKilled, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statNeutralMonsters'), value: fmt(p.neutralMinionsKilled, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statCSPerMin'), value: (p.totalMinionsKilled / durationMin).toFixed(2), inline: true },
                { name: t('cmd.leagueMatchHistory.statGoldEarned'), value: fmt(p.goldEarned, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statGoldSpent'), value: fmt(p.goldSpent, locale), inline: true },
            ];

        case 'objectives': {
            const baronKills = pickStat(p, 'baronKills');
            const dragonKills = pickStat(p, 'dragonKills');
            const heraldKills = pickStat(p, 'riftHeraldKills');
            const objectivesStolen = pickStat(p, 'objectivesStolen');
            return [
                { name: t('cmd.leagueMatchHistory.statTurretsDestroyed'), value: fmt(p.turretKills, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statInhibitorsDestroyed'), value: fmt(p.inhibitorKills, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statBarons'), value: fmt(baronKills, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statDragons'), value: fmt(dragonKills, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statHeralds'), value: fmt(heraldKills, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statObjectivesStolen'), value: fmt(objectivesStolen, locale), inline: true },
            ];
        }

        case 'wards':
            return [
                { name: t('cmd.leagueMatchHistory.statWardsPlaced'), value: fmt(p.wardsPlaced, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statWardsKilled'), value: fmt(p.wardsKilled, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statVisionScore'), value: fmt(p.visionScore, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statDetectorWards'), value: fmt(p.detectorWardsPlaced, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statVisionWardsBought'), value: fmt(p.visionWardsBoughtInGame, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statSightWardsBought'), value: fmt(p.sightWardsBoughtInGame, locale), inline: true },
            ];

        case 'kda': {
            const kda = ((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2);
            const firstBlood = p.firstBloodKill
                ? t('cmd.leagueMatchHistory.firstBloodKill')
                : p.firstBloodAssist
                    ? t('cmd.leagueMatchHistory.firstBloodAssist')
                    : t('cmd.leagueMatchHistory.firstBloodNo');
            return [
                { name: t('cmd.leagueMatchHistory.statKills'), value: fmt(p.kills, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statDeaths'), value: fmt(p.deaths, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statAssists'), value: fmt(p.assists, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statKDA'), value: kda, inline: true },
                { name: t('cmd.leagueMatchHistory.statDoubleKills'), value: fmt(p.doubleKills, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statTripleKills'), value: fmt(p.tripleKills, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statQuadraKills'), value: fmt(p.quadraKills, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statPentaKills'), value: fmt(p.pentaKills, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statKillingSprees'), value: fmt(p.killingSprees, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statLargestKillingSpree'), value: fmt(p.largestKillingSpree, locale), inline: true },
                { name: t('cmd.leagueMatchHistory.statFirstBlood'), value: firstBlood, inline: true },
            ];
        }

        default:
            return [];
    }
}

/**
 * Constrói o embed da partida para a view atual.
 */
function buildMatchEmbed(processed, viewIdx, teamMode, summonerName, tagLine, matchIdx, total, t, locale) {
    const { participant, match, championData, ddragonVersion } = processed;
    const view = VIEWS[viewIdx];

    const roleEmoji = getRoleEmoji(participant.teamPosition);
    const win = participant.win;
    const color = win ? 0x0099ff : 0xff3636;
    const championName = (championData && championData.name) || participant.championName || 'unknown';

    const dateStr = new Date(match.info.gameStartTimestamp).toLocaleString(locale, {
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
        .setTitle(`${roleEmoji} ${summonerName}#${tagLine} - ${championName}  |  ${win ? t('cmd.leagueMatchHistory.victory') : t('cmd.leagueMatchHistory.defeat')}`)
        .setDescription(
            `${t('cmd.leagueMatchHistory.matchOf', { current: matchIdx + 1, total })} | ${dateStr} | ${t('cmd.leagueMatchHistory.duration')}: ${durationStr}` +
            (teamMode ? `\n**${t('cmd.leagueMatchHistory.teamMode')}** — ${t(view.teamStatLabelKey)}` : `\n**${t('cmd.leagueMatchHistory.viewLabel')}:** ${t(view.nameKey)}`)
        )
        .setThumbnail(championThumb)
        .setImage(teamMode ? 'attachment://team-comparison.png' : 'attachment://match-stats.png')
        .setTimestamp()
        .setFooter({ text: 'Powered by Riot Games API', iconURL: 'https://i.imgur.com/xU45ZZz.png' });

    const fields = getViewFields(view.id, participant, match, t, locale);
    embed.addFields(fields);

    return embed;
}

/**
 * Constrói as duas ActionRows de botões.
 * t = translator function (required for button labels)
 */
function buildRows(matchIdx, total, viewIdx, teamMode, processedMatches, loadingMatches, allDisabled, t) {
    const view = VIEWS[viewIdx];

    // ── Row 1: views + team toggle ──────────────────────────────────────────
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('view_prev')
            .setLabel(t('cmd.leagueMatchHistory.btnPrevious'))
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(allDisabled),
        new ButtonBuilder()
            .setCustomId('view_current')
            .setLabel(t(view.nameKey))
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('view_next')
            .setLabel(t('cmd.leagueMatchHistory.btnNext'))
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(allDisabled),
        new ButtonBuilder()
            .setCustomId('view_team')
            .setLabel(teamMode ? t('cmd.leagueMatchHistory.btnTeamMode') : t('cmd.leagueMatchHistory.btnCompareTeam'))
            .setEmoji('👥')
            .setStyle(teamMode ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(allDisabled || viewIdx === 0),
    );

    // ── Row 2: match navigation ─────────────────────────────────────────────
    const isFirst = matchIdx === 0;
    const isLast = matchIdx >= total - 1;
    const nextLoading = loadingMatches.has(matchIdx + 1);
    const nextReady = processedMatches.has(matchIdx + 1);

    let nextLabel = '▶️ ' + t('cmd.leagueMatchHistory.btnMatchNext');
    let nextDisabled = allDisabled;
    if (isLast) {
        nextDisabled = true;
    } else if (nextLoading && !nextReady) {
        nextLabel = t('cmd.leagueMatchHistory.btnLoading');
        nextDisabled = true;
    }

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('match_prev')
            .setLabel(t('cmd.leagueMatchHistory.btnMatchPrev'))
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(allDisabled || isFirst),
        new ButtonBuilder()
            .setCustomId('match_current')
            .setLabel(t('cmd.leagueMatchHistory.btnMatchOf', { current: matchIdx + 1, total }))
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
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
        .setNameLocalizations({ 'pt-BR': 'historicodepartidas', 'es-ES': 'historialdepartidas' })
        .setDescription('Shows the match history of a League of Legends player.')
        .setDescriptionLocalizations(loc(
            'Mostra o histórico de partidas de um jogador de League of Legends.',
            'Muestra el historial de partidas de un jugador de League of Legends.'
        ))
        .addStringOption((option) =>
            option
                .setName('region')
                .setNameLocalizations({ 'pt-BR': 'região', 'es-ES': 'región' })
                .setDescription('The region of the player.')
                .setDescriptionLocalizations(loc('A região do jogador.', 'La región del jugador.'))
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
                .setNameLocalizations({ 'pt-BR': 'invocador', 'es-ES': 'invocador' })
                .setDescription('The summoner name of the player.')
                .setDescriptionLocalizations(loc('O nome do invocador.', 'El nombre del invocador.'))
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('tagline')
                .setNameLocalizations({ 'pt-BR': 'hashtag', 'es-ES': 'etiqueta' })
                .setDescription('The tagline of the player.')
                .setDescriptionLocalizations(loc('O hashtag do jogador.', 'La etiqueta del jugador.'))
                .setRequired(true),
        )
        .addNumberOption((option) =>
            option
                .setName('number')
                .setNameLocalizations({ 'pt-BR': 'quantidade', 'es-ES': 'cantidad' })
                .setDescription('The number of matches to show.')
                .setDescriptionLocalizations(loc('A quantidade de partidas a serem mostradas.', 'La cantidad de partidas a mostrar.'))
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(max),
        ),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        const locale = i18n.resolveFromInteraction(interaction);
        await interaction.deferReply();

        // ── Parse & validate options ──────────────────────────────────────────
        const region = interaction.options.getString('region');
        const summonerName = interaction.options.getString('summonername');
        const tagLine = interaction.options.getString('tagline');

        if (tagLine.length > 5) {
            return await errorEmbed(translator('cmd.leagueProfile.taglineTooLong'), 'leaguematchhistory', interaction, true, false);
        }
        if (tagLine[0] === '#') {
            return await errorEmbed(translator('cmd.leagueProfile.taglineFormat'), 'leaguematchhistory', interaction, true, false);
        }

        let number = interaction.options.getNumber('number') || 1;
        if (number > max) number = max;

        // ── Loading: account info ─────────────────────────────────────────────
        await complexLoadingEmbed(
            `<a:loading:1274651043908816969> ${translator('cmd.leagueMatchHistory.loadingAccount')}`,
            'leaguematchhistory', interaction, true, false, true,
        );

        const accountInfo = await api.getAccountByRiotId(region, summonerName, tagLine, 'leagueMatchHistory');
        if (!accountInfo) {
            return await errorEmbed(translator('cmd.leagueMatchHistory.accountError'), 'leaguematchhistory', interaction, true, false);
        }
        if (accountInfo.error) {
            return await errorEmbed(translator('cmd.leagueMatchHistory.notFound'), 'leaguematchhistory', interaction, true, false);
        }

        // ── Loading: match history ────────────────────────────────────────────
        await complexLoadingEmbed(
            `<a:loading:1274651043908816969> ${translator('cmd.leagueMatchHistory.loadingHistory')}`,
            'leaguematchhistory', interaction, true, false, true,
        );

        const fullHistory = await api.getMatchHistory(region, accountInfo.puuid, 'leagueMatchHistory');
        if (!fullHistory || !Array.isArray(fullHistory) || fullHistory.length === 0) {
            return await errorEmbed(translator('cmd.leagueMatchHistory.noMatches'), 'leaguematchhistory', interaction, true, false);
        }

        const matches = fullHistory.slice(0, number);
        const total = matches.length;

        // ── Loading: first match ──────────────────────────────────────────────
        await complexLoadingEmbed(
            `<a:loading:1274651043908816969> ${translator('cmd.leagueMatchHistory.loadingMatches')}\n` +
            `<a:loading:1274651043908816969> ${translator('cmd.leagueMatchHistory.loadingProcessingMatch', { current: 1, total })}`,
            'leaguematchhistory', interaction, true, false, true,
        );

        // ── Match cache & loading state ───────────────────────────────────────
        const processedMatches = new Map();
        const loadingMatches = new Set();

        async function processMatch(idx) {
            if (processedMatches.has(idx)) return processedMatches.get(idx);
            if (loadingMatches.has(idx)) {
                while (loadingMatches.has(idx)) {
                    await new Promise((r) => setTimeout(r, 100));
                }
                return processedMatches.get(idx);
            }

            loadingMatches.add(idx);
            try {
                const match = matches[idx];
                if (!match || !match.info) throw new Error('Match data not found');

                const participant = match.info.participants.find((p) => p.puuid === accountInfo.puuid);
                if (!participant) throw new Error('Participant not found in match');

                const championData = await api.fetchChampionName(participant.championId, 'leagueMatchHistory');
                const ddragonVersion = await api.getDDragonLatestVersion('leagueMatchHistory');
                const individualChart = await generateMatchChart(participant);

                const result = {
                    match,
                    participant,
                    championData,
                    ddragonVersion,
                    individualChart,
                    individualCharts: new Map(), // Per-view chart cache (FIX)
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

        async function getOrGenerateTeamChart(processed, viewIdx) {
            if (processed.teamCharts.has(viewIdx)) return processed.teamCharts.get(viewIdx);
            const view = VIEWS[viewIdx];
            const allParticipants = processed.match.info.participants;
            const buffer = await generateTeamComparisonChart(
                processed.participant,
                allParticipants,
                view.teamStatKey,
                processed.ddragonVersion,
                translator(view.teamStatLabelKey),
            );
            processed.teamCharts.set(viewIdx, buffer);
            return buffer;
        }

        /**
         * FIX: Generates/retrieves a per-view individual chart.
         * Before, all views used the same overview chart. Now each view
         * gets its own chart with only the relevant stats.
         */
        async function getOrGenerateIndividualChart(processed, viewIdx) {
            if (viewIdx === 0) return processed.individualChart;
            if (processed.individualCharts.has(viewIdx)) return processed.individualCharts.get(viewIdx);
            const view = VIEWS[viewIdx];
            const buffer = await generateViewChart(processed.participant, view.id);
            processed.individualCharts.set(viewIdx, buffer);
            return buffer;
        }

        // ── Process first match ──────────────────────────────────────────────
        let currentMatchIdx = 0;
        let currentViewIdx = 0;
        let teamMode = false;

        let firstProcessed;
        try {
            firstProcessed = await processMatch(0);
        } catch (err) {
            console.error('[leagueMatchHistory] Erro ao processar primeira partida:', err);
            return await errorEmbed(translator('cmd.leagueMatchHistory.errorProcessing'), 'leaguematchhistory', interaction, true, false);
        }

        // ── Render initial embed ─────────────────────────────────────────────
        const initialEmbed = buildMatchEmbed(firstProcessed, currentViewIdx, teamMode, summonerName, tagLine, currentMatchIdx, total, translator, locale);
        const initialRows = buildRows(currentMatchIdx, total, currentViewIdx, teamMode, processedMatches, loadingMatches, false, translator);
        const initialFiles = [new AttachmentBuilder(firstProcessed.individualChart, { name: 'match-stats.png' })];

        await interaction.editReply({ embeds: [initialEmbed], components: initialRows, files: initialFiles, content: null });

        // ── Preload next match in background ─────────────────────────────────
        function preloadNext() {
            const nextIdx = currentMatchIdx + 1;
            if (nextIdx < total && !processedMatches.has(nextIdx) && !loadingMatches.has(nextIdx)) {
                processMatch(nextIdx)
                    .then(() => { refreshRowsQuietly().catch(() => {}); })
                    .catch((err) => { console.error('[leagueMatchHistory] Background preload falhou:', err.message); });
            }
        }
        preloadNext();

        // ── Collector ─────────────────────────────────────────────────────────
        const replyMessage = await interaction.fetchReply();
        const filter = (i) => i.user.id === interaction.user.id;
        const collector = replyMessage.createMessageComponentCollector({ filter, time: 5 * 60 * 1000 });

        async function refreshRowsQuietly() {
            const processed = processedMatches.get(currentMatchIdx);
            if (!processed) return;
            const embed = buildMatchEmbed(processed, currentViewIdx, teamMode, summonerName, tagLine, currentMatchIdx, total, translator, locale);
            const rows = buildRows(currentMatchIdx, total, currentViewIdx, teamMode, processedMatches, loadingMatches, false, translator);
            await interaction.editReply({ embeds: [embed], components: rows });
        }

        async function refreshEmbedOnly(i) {
            const processed = processedMatches.get(currentMatchIdx);
            if (!processed) return;
            const embed = buildMatchEmbed(processed, currentViewIdx, teamMode, summonerName, tagLine, currentMatchIdx, total, translator, locale);
            const rows = buildRows(currentMatchIdx, total, currentViewIdx, teamMode, processedMatches, loadingMatches, false, translator);
            await i.editReply({ embeds: [embed], components: rows });
        }

        /**
         * Updates the message with the current embed + appropriate attachment.
         * FIX: When teamMode is false, now uses getOrGenerateIndividualChart
         * which generates a view-specific chart instead of always using the
         * overview chart.
         */
        async function refreshWithAttachment(i) {
            const processed = processedMatches.get(currentMatchIdx);
            if (!processed) return;

            const embed = buildMatchEmbed(processed, currentViewIdx, teamMode, summonerName, tagLine, currentMatchIdx, total, translator, locale);
            const rows = buildRows(currentMatchIdx, total, currentViewIdx, teamMode, processedMatches, loadingMatches, false, translator);

            let files;
            if (teamMode) {
                const teamChart = await getOrGenerateTeamChart(processed, currentViewIdx);
                files = [new AttachmentBuilder(teamChart, { name: 'team-comparison.png' })];
            } else {
                // FIX: Use per-view chart instead of always overview
                const viewChart = await getOrGenerateIndividualChart(processed, currentViewIdx);
                files = [new AttachmentBuilder(viewChart, { name: 'match-stats.png' })];
            }

            await i.editReply({ embeds: [embed], components: rows, files });
        }

        collector.on('collect', async (i) => {
            try {
                if (i.customId === 'view_prev') {
                    currentViewIdx = (currentViewIdx - 1 + VIEWS.length) % VIEWS.length;
                    // Auto-desliga team mode ao voltar para Visão Geral
                    if (currentViewIdx === 0) teamMode = false;
                    await i.deferUpdate();
                    await refreshWithAttachment(i);
                    return;
                }

                if (i.customId === 'view_next') {
                    currentViewIdx = (currentViewIdx + 1) % VIEWS.length;
                    // Auto-desliga team mode ao voltar para Visão Geral
                    if (currentViewIdx === 0) teamMode = false;
                    await i.deferUpdate();
                    await refreshWithAttachment(i);
                    return;
                }

                if (i.customId === 'view_team') {
                    teamMode = !teamMode;
                    await i.deferUpdate();
                    await refreshWithAttachment(i);
                    return;
                }

                if (i.customId === 'match_prev') {
                    if (currentMatchIdx > 0) {
                        currentMatchIdx--;
                        currentViewIdx = 0;
                        teamMode = false;
                        await i.deferUpdate();
                        await refreshWithAttachment(i);
                    } else {
                        await i.deferUpdate();
                    }
                    return;
                }

                if (i.customId === 'match_next') {
                    if (currentMatchIdx >= total - 1) {
                        await i.deferUpdate();
                        return;
                    }

                    const nextIdx = currentMatchIdx + 1;

                    if (processedMatches.has(nextIdx)) {
                        currentMatchIdx = nextIdx;
                        currentViewIdx = 0;
                        teamMode = false;
                        await i.deferUpdate();
                        await refreshWithAttachment(i);
                        preloadNext();
                        return;
                    }

                    await i.deferUpdate();

                    const loadingEmbed = new EmbedBuilder()
                        .setColor(0xffff00)
                        .setTitle(`<a:loading:1274651043908816969> | ${translator('cmd.leagueMatchHistory.loadingTitle')}`)
                        .setDescription(translator('cmd.leagueMatchHistory.loadingMatch', { current: nextIdx + 1, total }))
                        .setFooter({ text: 'origin: leaguematchhistory', iconURL: 'https://i.imgur.com/xU45ZZz.png' });

                    const loadingRows = buildRows(currentMatchIdx, total, currentViewIdx, teamMode, processedMatches, loadingMatches, false, translator);

                    await i.editReply({ embeds: [loadingEmbed], components: loadingRows, files: [], content: null });

                    try {
                        await processMatch(nextIdx);
                        currentMatchIdx = nextIdx;
                        currentViewIdx = 0;
                        teamMode = false;
                        await refreshWithAttachment(i);
                        preloadNext();
                    } catch (err) {
                        console.error('[leagueMatchHistory] Erro ao carregar partida sob demanda:', err);
                        await refreshWithAttachment(i);
                    }
                    return;
                }
            } catch (err) {
                console.error('[leagueMatchHistory] Erro no collector:', err);
                try {
                    await i.followUp({ content: translator('cmd.leagueMatchHistory.errorCollector'), ephemeral: true });
                } catch (_) {}
            }
        });

        collector.on('end', async () => {
            try {
                const processed = processedMatches.get(currentMatchIdx);
                if (!processed) return;
                const embed = buildMatchEmbed(processed, currentViewIdx, teamMode, summonerName, tagLine, currentMatchIdx, total, translator, locale);
                const rows = buildRows(currentMatchIdx, total, currentViewIdx, teamMode, processedMatches, loadingMatches, true, translator);
                await interaction.editReply({ embeds: [embed], components: rows });
            } catch (err) {
                // noop
            }
        });
    },
};
