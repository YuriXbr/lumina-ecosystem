/**
 * update-skins-list.js
 *
 * Atualiza o banco de dados com os dados mais recentes de skins, campeões,
 * skinlines e universos vindos da CommunityDragon e DDragon.
 */

if (process.env.NODE_ENV === 'production') {
    require('@dotenvx/dotenvx').config({ path: '.env' });
} else {
    require('@dotenvx/dotenvx').config({ path: '.env.dev' });
}

const axios      = require('axios');
const mongoose   = require('mongoose');
const cliProgress = require('cli-progress');

const SkinsService      = require('../src/database/services/SkinService');
const SkinIdListService  = require('../src/database/services/SkinsIdListService');
const UniversesService   = require('../src/database/services/UniversesService');
const ChampionsService   = require('../src/database/services/ChampionsService');
const SkinlinesService   = require('../src/database/services/SkinlinesService');
const { addLog }         = require('../src/logger/logger');

const {
    fetchChampionsData,
    fetchSkinlinesData,
    fetchUniversesData,
    getLatestCDPatchVersion,
} = require('../src/ThirdParty/riotApi');

// ─── Constantes ───────────────────────────────────────────────────────────────

const CD_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1';

const RARITY_TO_FIELD = {
    kNoRarity:     'legacy',
    kEpic:         'epic',
    kLegendary:    'legendary',
    kUltimate:     'ultimate',
    kTranscendent: 'transcendent',
    kMythic:       'mythic',
};

const BATCH_SIZE = 200;

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchAllSkinsFromCD() {
    const { data } = await axios.get(`${CD_BASE}/skins.json`);
    return data;
}

async function fetchChampionMap() {
    const { data } = await axios.get(`${CD_BASE}/champion-summary.json`);
    const map = new Map();
    for (const champ of data) {
        if (champ.id > 0) {
            map.set(champ.id, { alias: champ.alias, name: champ.name });
        }
    }
    return map;
}

// ─── Processamento em memória ─────────────────────────────────────────────────

function groupSkinsByChampion(allSkinsData) {
    const groups = new Map();
    for (const [skinIdStr, skin] of Object.entries(allSkinsData)) {
        const skinId  = Number(skinIdStr);
        const champId = Math.floor(skinId / 1000);
        if (!groups.has(champId)) groups.set(champId, []);
        groups.get(champId).push({ ...skin, id: skinId });
    }
    return groups;
}

function buildChampionSkinRecords(champInfo, rawSkins, updatePatch) {
    const categories = { legacy: [], epic: [], legendary: [], ultimate: [], transcendent: [], mythic: [] };
    const skinIdListRecords = [];

    for (const skin of rawSkins) {
        if (skin.isBase) continue;

        const field  = RARITY_TO_FIELD[skin.rarity] ?? 'legacy';
        const record = {
            id:                   skin.id,
            name:                 skin.name                  ?? '',
            description:          skin.description           ?? '',
            championId:           champInfo.alias,
            championName:         champInfo.name,
            isBase:               false,
            rarity:               skin.rarity                ?? 'kNoRarity',
            isLegacy:             skin.isLegacy              ?? false,
            skinLines:            skin.skinLines             ?? [],
            splashPath:           skin.splashPath            ?? '',
            loadScreenPath:       skin.loadScreenPath        ?? '',
            tilePath:             skin.tilePath              ?? '',
            uncenteredSplashPath: skin.uncenteredSplashPath  ?? '',
            updatePatch,
            championdata: { championId: champInfo.alias, championName: champInfo.name },
        };

        categories[field].push(record);
        skinIdListRecords.push(record);
    }

    const skinsAggregate = {
        championId:           champInfo.alias,
        quantity:             skinIdListRecords.length,
        ...categories,
        legacyQuantity:       categories.legacy.length,
        epicQuantity:         categories.epic.length,
        legendaryQuantity:    categories.legendary.length,
        ultimateQuantity:     categories.ultimate.length,
        transcendentQuantity: categories.transcendent.length,
        mythicQuantity:       categories.mythic.length,
        updatePatch,
        updateDate:           new Date(),
    };

    return { skinsAggregate, skinIdListRecords };
}

// ─── Database writers ─────────────────────────────────────────────────────────

async function flushSkinIdList(records) {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        await SkinIdListService.updateSkinIdList(records.slice(i, i + BATCH_SIZE));
    }
}

async function flushSkinsAggregate(records) {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        await SkinsService.updateSkinsDatabase(records.slice(i, i + BATCH_SIZE));
    }
}

// ─── Funções principais ───────────────────────────────────────────────────────

async function updateSkinsList() {
    console.log('\n📥 Baixando dados bulk da CommunityDragon...');

    const [allSkinsData, championMap, updatePatch] = await Promise.all([
        fetchAllSkinsFromCD(),
        fetchChampionMap(),
        getLatestCDPatchVersion(),
    ]);

    console.log(`   ✔ ${Object.keys(allSkinsData).length} entradas de skin | ${championMap.size} campeões | patch ${updatePatch}`);

    const skinGroups = groupSkinsByChampion(allSkinsData);
    const allSkinIdListRecords = [];
    const allSkinsAggregates   = [];

    const bar = new cliProgress.SingleBar({
        format: 'Processando |{bar}| {percentage}% | {value}/{total} | {champion}',
        clearOnComplete: true,
    }, cliProgress.Presets.shades_classic);

    bar.start(championMap.size, 0, { champion: '' });

    for (const [numericId, champInfo] of championMap) {
        const rawSkins = skinGroups.get(numericId) ?? [];
        const { skinsAggregate, skinIdListRecords } = buildChampionSkinRecords(champInfo, rawSkins, updatePatch);

        allSkinsAggregates.push(skinsAggregate);
        allSkinIdListRecords.push(...skinIdListRecords);
        bar.increment(1, { champion: champInfo.name });
    }

    bar.stop();

    const nonBaseSkins = allSkinIdListRecords.length;
    console.log(`\n   📊 ${nonBaseSkins} skins não-base em ${championMap.size} campeões`);

    console.log(`\n💾 Salvando ${nonBaseSkins} registros em SkinsIdList...`);
    await flushSkinIdList(allSkinIdListRecords);

    console.log(`💾 Salvando ${allSkinsAggregates.length} agregados em Skins...`);
    await flushSkinsAggregate(allSkinsAggregates);

    const totals = allSkinsAggregates.reduce((acc, c) => {
        acc.legacy       += c.legacyQuantity;
        acc.epic         += c.epicQuantity;
        acc.legendary    += c.legendaryQuantity;
        acc.ultimate     += c.ultimateQuantity;
        acc.transcendent += c.transcendentQuantity;
        acc.mythic       += c.mythicQuantity;
        return acc;
    }, { legacy: 0, epic: 0, legendary: 0, ultimate: 0, transcendent: 0, mythic: 0 });

    console.log(`
   ✅ Skins atualizadas com sucesso!
      🔳 Legado:        ${totals.legacy}
      🔵 Épicas:        ${totals.epic}
      🔴 Lendárias:     ${totals.legendary}
      🟠 Ultimates:     ${totals.ultimate}
      💎 Transcendidas: ${totals.transcendent}
      🟣 Míticas:       ${totals.mythic}
    `);

    addLog('SCRIPT', 'skins.update', `${nonBaseSkins} skins atualizadas (patch ${updatePatch})`);
}

async function updateChampions() {
    process.stdout.write('📥 Atualizando campeões... ');
    const data = await fetchChampionsData();
    if (!data?.length) { console.log('⚠️  Nenhum dado retornado.'); return; }
    await ChampionsService.updateChampionsDatabase(data);
    console.log(`✅ ${data.length} campeões atualizados`);
}

async function updateSkinlines() {
    process.stdout.write('📥 Atualizando skinlines... ');
    const data = await fetchSkinlinesData();
    if (!data?.length) { console.log('⚠️  Nenhum dado retornado.'); return; }
    await SkinlinesService.updateSkinlinesDatabase(data);
    console.log(`✅ ${data.length} skinlines atualizadas`);
}

async function updateUniverses() {
    process.stdout.write('📥 Atualizando universos... ');
    const data = await fetchUniversesData();
    if (!data?.length) { console.log('⚠️  Nenhum dado retornado.'); return; }
    await UniversesService.updateUniversesDatabase(data);
    console.log(`✅ ${data.length} universos atualizados`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🚀 Lumina — Atualização do banco de dados de skins\n');

    try {
        await Promise.all([
            updateChampions(),
            updateSkinlines(),
            updateUniverses(),
        ]);

        await updateSkinsList();

        console.log('🎉 Atualização completa!\n');
    } catch (err) {
        addLog('SCRIPT', 'skins.update.error', `Erro fatal: ${err.message}`);
        console.error('\n❌ Erro fatal durante a atualização:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Conexão com o banco encerrada.');
    }
}

main();
