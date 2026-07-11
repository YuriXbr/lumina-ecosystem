const axios = require('axios');

/**
 * Gera um gráfico de estatísticas de partida usando a QuickChart API.
 * Usa GET request (mais confiável que POST).
 */
async function generateMatchChart(participant) {
    const maxValues = {
        kills: 30, deaths: 15, assists: 50,
        totalDamageDealtToChampions: 120000,
        totalDamageTaken: 200000,
        goldEarned: 28000,
        visionScore: 100, wardsPlaced: 30,
        totalMinionsKilled: 400
    };

    const labels = ['Kills', 'Deaths', 'Assists', 'Dmg Dealt', 'Dmg Taken', 'Gold', 'Vision', 'Wards', 'CS'];
    const keys = ['kills', 'deaths', 'assists', 'totalDamageDealtToChampions', 'totalDamageTaken', 'goldEarned', 'visionScore', 'wardsPlaced', 'totalMinionsKilled'];
    const colors = [
        'rgba(0,255,0,0.7)', 'rgba(255,50,50,0.7)', 'rgba(255,255,0,0.7)',
        'rgba(54,162,235,0.7)', 'rgba(75,192,192,0.7)', 'rgba(255,159,64,0.7)',
        'rgba(153,102,255,0.7)', 'rgba(201,203,207,0.7)', 'rgba(255,99,132,0.7)'
    ];
    const borderColors = [
        'rgba(0,255,0,1)', 'rgba(255,50,50,1)', 'rgba(255,255,0,1)',
        'rgba(54,162,235,1)', 'rgba(75,192,192,1)', 'rgba(255,159,64,1)',
        'rgba(153,102,255,1)', 'rgba(201,203,207,1)', 'rgba(255,99,132,1)'
    ];

    const dataValues = keys.map(key => {
        const val = participant[key] || 0;
        return Math.min(val / (maxValues[key] || 1), 1);
    });

    const formattedLabels = labels.map((label, i) => {
        const val = participant[keys[i]] || 0;
        if (val >= 1000) return `${label}: ${(val / 1000).toFixed(1)}k`;
        return `${label}: ${val}`;
    });

    const chartConfig = {
        type: 'bar',
        data: {
            labels: formattedLabels,
            datasets: [{
                data: dataValues,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { display: false, max: 1.1 },
                y: { ticks: { color: '#dcddde', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    };

    try {
        const configStr = JSON.stringify(chartConfig);
        const response = await axios.get('https://quickchart.io/chart', {
            params: { c: configStr, w: 500, h: 300, bkg: '#2f3136', f: 'png' },
            responseType: 'arraybuffer',
            timeout: 15000,
        });
        return Buffer.from(response.data);
    } catch (err) {
        console.error('[chartGenerator] Erro:', err.message);
        try {
            const response = await axios.post('https://quickchart.io/chart', {
                config: JSON.stringify(chartConfig), format: 'png', width: 500, height: 300, backgroundColor: '#2f3136'
            }, { responseType: 'arraybuffer', timeout: 15000, validateStatus: () => true });
            if (response.data && response.data.length > 100) return Buffer.from(response.data);
        } catch (e) { console.error('[chartGenerator] Fallback falhou:', e.message); }
        throw new Error('Não foi possível gerar o gráfico da partida.');
    }
}

function formatChartValue(value, isKda = false) {
    if (isKda) return value.toFixed(2);
    if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
    return Math.round(value).toString();
}

function extractStatValue(participant, statKey) {
    if (statKey === 'kda') {
        const deaths = participant.deaths || 0;
        const kills = participant.kills || 0;
        const assists = participant.assists || 0;
        return deaths === 0 ? kills + assists : (kills + assists) / deaths;
    }
    if (typeof participant[statKey] === 'number') return participant[statKey];
    return 0;
}

// Ordem de lanes para ordenação
const LANE_ORDER = { 'TOP': 0, 'JUNGLE': 1, 'MIDDLE': 2, 'BOTTOM': 3, 'UTILITY': 4 };

/**
 * Gera um gráfico de comparação de equipe (barras horizontais).
 *
 * Ordenação: aliados primeiro (top→jungle→mid→bot→sup), depois inimigos.
 * Sem legenda. Sem ícones (QuickChart não suporta imagens como labels).
 */
async function generateTeamComparisonChart(playerParticipant, allParticipants, statKey, ddragonVersion, statLabel) {
    const isKda = statKey === 'kda';
    const label = statLabel || statKey;

    const playerTeamId = playerParticipant.teamId;
    const playerPuuid = playerParticipant.puuid;

    // Separa aliados e inimigos.
    // FIX: Em modos como Arena, o teamId pode ser 0/1 em vez de 100/200,
    // e participantes podem não ter teamPosition. A comparação por teamId
    // ainda funciona (aliados = mesmo teamId), mas para Arena onde
    // teamId pode ser undefined para todos, usamos o puuid do jogador
    // como fallback: aliado = mesmo teamId OU o próprio jogador.
    const allies = [];
    const enemies = [];

    (allParticipants || []).forEach(p => {
        if (!p || !p.championName) return;
        const entry = {
            championName: p.championName,
            value: extractStatValue(p, statKey),
            teamId: p.teamId,
            teamPosition: p.teamPosition || '',
            isPlayer: p.puuid === playerPuuid,
        };
        // Se o teamId do jogador é válido (não undefined), usa ele.
        // Senão, só o próprio jogador é "aliado".
        if (playerTeamId !== undefined && playerTeamId !== null) {
            if (p.teamId === playerTeamId) allies.push(entry);
            else enemies.push(entry);
        } else {
            if (p.puuid === playerPuuid) allies.push(entry);
            else enemies.push(entry);
        }
    });

    // Ordena cada grupo por lane (TOP→JUNGLE→MIDDLE→BOTTOM→UTILITY)
    const sortByLane = (a, b) => {
        const aOrder = LANE_ORDER[a.teamPosition] ?? 99;
        const bOrder = LANE_ORDER[b.teamPosition] ?? 99;
        return aOrder - bOrder;
    };
    allies.sort(sortByLane);
    enemies.sort(sortByLane);

    // Combina: aliados primeiro, depois inimigos
    const data = [...allies, ...enemies];

    // Labels com nome do campeão + valor
    const labels = data.map(d => `${d.championName} (${formatChartValue(d.value, isKda)})`);

    // Cores: dourado para o jogador, azul para aliados, vermelho para inimigos
    const backgroundColors = data.map(d => {
        if (d.isPlayer) return 'rgba(255, 215, 0, 0.85)';
        if (d.teamId === playerTeamId) return 'rgba(54, 162, 235, 0.7)';
        return 'rgba(255, 99, 132, 0.7)';
    });
    const borderColors = data.map(d => {
        if (d.isPlayer) return 'rgba(255, 215, 0, 1)';
        if (d.teamId === playerTeamId) return 'rgba(54, 162, 235, 1)';
        return 'rgba(255, 99, 132, 1)';
    });

    const values = data.map(d => d.value);

    const chartConfig = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false }, // Sem legenda
                title: {
                    display: true,
                    text: `${label} — Comparação de Equipe`,
                    color: '#ffffff',
                    font: { size: 14, weight: 'bold' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#dcddde', font: { size: 10 } },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    beginAtZero: true,
                },
                y: {
                    ticks: { color: '#dcddde', font: { size: 11 } },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                },
            },
        }
    };

    const barCount = Math.max(data.length, 1);
    const chartHeight = Math.max(300, Math.min(600, barCount * 35 + 60));

    try {
        const configStr = JSON.stringify(chartConfig);
        const response = await axios.get('https://quickchart.io/chart', {
            params: { c: configStr, w: 500, h: chartHeight, bkg: '#2f3136', f: 'png' },
            responseType: 'arraybuffer',
            timeout: 20000,
        });
        return Buffer.from(response.data);
    } catch (err) {
        console.error('[chartGenerator] Team comparison erro:', err.message);
        try {
            const response = await axios.post('https://quickchart.io/chart', {
                config: JSON.stringify(chartConfig), format: 'png', width: 500, height: chartHeight, backgroundColor: '#2f3136'
            }, { responseType: 'arraybuffer', timeout: 20000, validateStatus: () => true });
            if (response.data && response.data.length > 100) return Buffer.from(response.data);
        } catch (e) { console.error('[chartGenerator] Team comparison fallback falhou:', e.message); }
        throw new Error('Não foi possível gerar o gráfico de comparação de equipe.');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-view individual chart
// Generates a chart focused on the stats of a specific view (damage_dealt,
// damage_taken, heal, farm, objectives, wards, kda). For 'overview', falls
// back to the existing generateMatchChart() which shows all 9 stats.
// ─────────────────────────────────────────────────────────────────────────────

const VIEW_STAT_CONFIG = {
    overview: null, // Uses generateMatchChart()
    damage_dealt: {
        stats: [
            { key: 'totalDamageDealtToChampions', label: 'Dmg Champs' },
            { key: 'physicalDamageDealtToChampions', label: 'Phys Dmg' },
            { key: 'magicDamageDealtToChampions', label: 'Magic Dmg' },
            { key: 'trueDamageDealtToChampions', label: 'True Dmg' },
            { key: 'damageDealtToObjectives', label: 'Obj Dmg' },
            { key: 'damageDealtToTurrets', label: 'Turret Dmg' },
            { key: 'totalDamageDealt', label: 'Total Dmg' },
        ],
    },
    damage_taken: {
        stats: [
            { key: 'totalDamageTaken', label: 'Total Taken' },
            { key: 'physicalDamageTaken', label: 'Phys Taken' },
            { key: 'magicDamageTaken', label: 'Magic Taken' },
            { key: 'trueDamageTaken', label: 'True Taken' },
            { key: 'damageSelfMitigated', label: 'Mitigated' },
            { key: 'totalHeal', label: 'Heal' },
        ],
    },
    heal: {
        stats: [
            { key: 'totalHeal', label: 'Total Heal' },
            { key: 'totalHealsOnTeammates', label: 'Ally Heal' },
            { key: 'totalDamageShieldedOnTeammates', label: 'Ally Shield' },
        ],
    },
    farm: {
        stats: [
            { key: 'totalMinionsKilled', label: 'CS Total' },
            { key: 'neutralMinionsKilled', label: 'Neutral' },
            { key: 'goldEarned', label: 'Gold' },
            { key: 'goldSpent', label: 'Gold Spent' },
        ],
    },
    objectives: {
        stats: [
            { key: 'turretKills', label: 'Turrets' },
            { key: 'inhibitorKills', label: 'Inhibs' },
            { key: 'baronKills', label: 'Barons', nested: true },
            { key: 'dragonKills', label: 'Dragons', nested: true },
            { key: 'riftHeraldKills', label: 'Heralds', nested: true },
            { key: 'objectivesStolen', label: 'Stolen', nested: true },
        ],
    },
    wards: {
        stats: [
            { key: 'wardsPlaced', label: 'Wards' },
            { key: 'wardsKilled', label: 'Destroyed' },
            { key: 'visionScore', label: 'Vision' },
            { key: 'detectorWardsPlaced', label: 'Control' },
        ],
    },
    kda: {
        stats: [
            { key: 'kills', label: 'Kills' },
            { key: 'deaths', label: 'Deaths' },
            { key: 'assists', label: 'Assists' },
            { key: 'doubleKills', label: 'Double' },
            { key: 'tripleKills', label: 'Triple' },
            { key: 'quadraKills', label: 'Quadra' },
            { key: 'pentaKills', label: 'Penta' },
        ],
    },
};

/**
 * Gera um gráfico individual para uma view específica.
 * Para 'overview', delega para generateMatchChart().
 * Para outras views, gera um gráfico com apenas os stats daquela view.
 *
 * Usa normalização DINÂMICA: o valor máximo da barra é o maior valor
 * entre os stats da view (não um máximo fixo). Isso garante que todas
 * as barras sejam visíveis e proporcionais.
 *
 * @param {object} participant - Dados do participante da partida
 * @param {string} viewId - ID da view (overview, damage_dealt, etc.)
 * @returns {Promise<Buffer>} Buffer PNG do gráfico
 */
async function generateViewChart(participant, viewId) {
    if (!viewId || viewId === 'overview') {
        return generateMatchChart(participant);
    }

    const config = VIEW_STAT_CONFIG[viewId];
    if (!config) {
        return generateMatchChart(participant);
    }

    // Extrai valores reais do participante (suporta campos aninhados em objectives)
    const rawValues = config.stats.map(s => {
        let val = participant[s.key];
        if (val === undefined && s.nested && participant.objectives) {
            val = participant.objectives[s.key];
        }
        return typeof val === 'number' ? val : 0;
    });

    // Normalização dinâmica: o maior valor vira 1.0
    const maxVal = Math.max(...rawValues, 1);
    const dataValues = rawValues.map(v => v / maxVal);

    // Labels com valor formatado
    const formattedLabels = config.stats.map((s, i) => {
        const val = rawValues[i];
        if (val >= 1000000) return `${s.label}: ${(val / 1000000).toFixed(2)}M`;
        if (val >= 1000) return `${s.label}: ${(val / 1000).toFixed(1)}k`;
        return `${s.label}: ${val}`;
    });

    const colors = [
        'rgba(0,255,0,0.7)', 'rgba(255,50,50,0.7)', 'rgba(255,255,0,0.7)',
        'rgba(54,162,235,0.7)', 'rgba(75,192,192,0.7)', 'rgba(255,159,64,0.7)',
        'rgba(153,102,255,0.7)',
    ];
    const borderColors = [
        'rgba(0,255,0,1)', 'rgba(255,50,50,1)', 'rgba(255,255,0,1)',
        'rgba(54,162,235,1)', 'rgba(75,192,192,1)', 'rgba(255,159,64,1)',
        'rgba(153,102,255,1)',
    ];

    const chartConfig = {
        type: 'bar',
        data: {
            labels: formattedLabels,
            datasets: [{
                data: dataValues,
                backgroundColor: colors.slice(0, config.stats.length),
                borderColor: borderColors.slice(0, config.stats.length),
                borderWidth: 1,
            }],
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
            },
            scales: {
                x: { display: false, max: 1.1 },
                y: { ticks: { color: '#dcddde', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            },
        },
    };

    try {
        const configStr = JSON.stringify(chartConfig);
        const response = await axios.get('https://quickchart.io/chart', {
            params: { c: configStr, w: 500, h: 300, bkg: '#2f3136', f: 'png' },
            responseType: 'arraybuffer',
            timeout: 15000,
        });
        return Buffer.from(response.data);
    } catch (err) {
        console.error(`[chartGenerator] View chart (${viewId}) erro:`, err.message);
        return generateMatchChart(participant);
    }
}

module.exports = { generateMatchChart, generateTeamComparisonChart, generateViewChart };
