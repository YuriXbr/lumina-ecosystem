/**
 * update-skins-list.js
 *
 * Atualiza o banco de dados com os dados mais recentes de skins, campeões,
 * skinlines e universos vindos da CommunityDragon e DDragon.
 *
 * Melhorias em relação à versão anterior:
 *  - skins.json é baixado UMA ÚNICA VEZ (antes: 1 request por skin ~1500x)
 *  - champion-summary.json fornece o alias correto para DDragon (ex: "LeeSin")
 *  - Agrupamento de skins por campeão feito em memória antes de tocar o banco
 *  - Bulk writes em batches para não sobrecarregar o driver do MongoDB
 *  - Champions, skinlines e universes são atualizados em paralelo
 */

if (process.env.NODE_ENV === 'production') {
    require('@dotenvx/dotenvx').config({ path: '.env' });
} else {
    require('@dotenvx/dotenvx').config({ path: '.env.dev' });
}

const axios    = require('axios');
const mongoose = require('mongoose');
const cliProgress = require('cli-progress');

const SkinsService     = require('../src/database/services/SkinService');
const SkinIdListService = require('../src/database/services/SkinsIdListService');
const UniversesService  = require('../src/database/services/UniversesService');
const ChampionsService  = require('../src/database/services/ChampionsService');
const SkinlinesService  = require('../src/database/services/SkinlinesService');

const {
    fetchChampionsData,
    fetchSkinlinesData,
    fetchUniversesData,
    getLatestCDPatchVersion,
} = require('../src/ThirdParty/riotApi');

// ─── Constantes ───────────────────────────────────────────────────────────────

const CD_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1';

/**
 * Mapeia as chaves de raridade da CommunityDragon para os nomes de campo
 * usados no banco de dados (schema skins).
 */
const RARITY_TO_FIELD = {
    kNoRarity:     'legacy',
    kEpic:         'epic',
    kLegendary:    'legendary',
    kUltimate:     'ultimate',
    kTranscendent: 'transcendent',
    kMythic:       'mythic',
};

/** Tamanho de cada batch enviado ao MongoDB via bulkWrite */
const BATCH_SIZE = 200;

// ─── Fetchers (cada um faz exatamente 1 request HTTP) ─────────────────────────

/**
 * Baixa todos os dados de skins da CommunityDragon em um único request.
 * Retorna um objeto cujas chaves são os IDs numéricos das skins (como string).
 *
 * @returns {Promise<Record<string, object>>}
 */
async function fetchAllSkinsFromCD() {
    const { data } = await axios.get(`${CD_BASE}/skins.json`);
    return data;
}

/**
 * Baixa o champion-summary da CommunityDragon para obter o alias DDragon correto.
 * Retorna um Map<numericChampId, { alias: string, name: string }>.
 *
 * - alias: "LeeSin" — usado como championId no banco e nas URLs do DDragon
 * - name:  "Lee Sin" — display name para logs e UI
 *
 * @returns {Promise<Map<number, { alias: string, name: string }>>}
 */
async function fetchChampionMap() {
    const { data } = await axios.get(`${CD_BASE}/champion-summary.json`);
    const map = new Map();
    for (const champ of data) {
        if (champ.id > 0) { // id === -1 é o placeholder "None" — ignorar
            map.set(champ.id, {
                alias: champ.alias, // "LeeSin"
                name:  champ.name,  // "Lee Sin"
            });
        }
    }
    return map;
}

// ─── Processamento em memória ─────────────────────────────────────────────────

/**
 * Agrupa o objeto de skins da CommunityDragon por ID numérico do campeão.
 * O ID numérico do campeão pode ser derivado do ID da skin: floor(skinId / 1000).
 * Ex: skinId 64001 → campeão 64 (Lee Sin).
 *
 * @param {Record<string, object>} allSkinsData
 * @returns {Map<number, object[]>}
 */
function groupSkinsByChampion(allSkinsData) {
    const groups = new Map();
    for (const [skinIdStr, skin] of Object.entries(allSkinsData)) {
        const skinId       = Number(skinIdStr);
        const champId      = Math.floor(skinId / 1000);
        if (!groups.has(champId)) groups.set(champId, []);
        groups.get(champId).push({ ...skin, id: skinId });
    }
    return groups;
}

/**
 * A partir dos dados brutos de um campeão, gera:
 *   - skinsAggregate: o documento a ser salvo na coleção `skins` (por campeão)
 *   - skinIdListRecords: os documentos individuais para a coleção `skinsIdList`
 *
 * @param {{ alias: string, name: string }} champInfo
 * @param {object[]} rawSkins - todas as skins do campeão vindas da CD (incluindo base)
 * @param {string} updatePatch
 * @returns {{ skinsAggregate: object, skinIdListRecords: object[] }}
 */
function buildChampionSkinRecords(champInfo, rawSkins, updatePatch) {
    const categories = {
        legacy:       [],
        epic:         [],
        legendary:    [],
        ultimate:     [],
        transcendent: [],
        mythic:       [],
    };

    const skinIdListRecords = [];

    for (const skin of rawSkins) {
        if (skin.isBase) continue; // skin base não entra no gacha

        const field = RARITY_TO_FIELD[skin.rarity] ?? 'legacy';

        const record = {
            id:                   skin.id,
            name:                 skin.name                  ?? '',
            description:          skin.description           ?? '',
            championId:           champInfo.alias,             // "LeeSin"
            championName:         champInfo.name,              // "Lee Sin"
            isBase:               false,
            rarity:               skin.rarity                ?? 'kNoRarity',
            isLegacy:             skin.isLegacy              ?? false,
            skinLines:            skin.skinLines             ?? [],
            splashPath:           skin.splashPath            ?? '',
            loadScreenPath:       skin.loadScreenPath        ?? '',
            tilePath:             skin.tilePath              ?? '',
            uncenteredSplashPath: skin.uncenteredSplashPath  ?? '',
            updatePatch,
            championdata: {
                championId:   champInfo.alias,
                championName: champInfo.name,
            },
        };

        categories[field].push(record);
        skinIdListRecords.push(record);
    }

    const skinsAggregate = {
        championId:           champInfo.alias,
        quantity:             skinIdListRecords.length,
        legacy:               categories.legacy,
        epic:                 categories.epic,
        legendary:            categories.legendary,
        ultimate:             categories.ultimate,
        transcendent:         categories.transcendent,
        mythic:               categories.mythic,
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

/**
 * Envia os registros de skins individuais ao banco em batches.
 * @param {object[]} records
 */
async function flushSkinIdList(records) {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        await SkinIdListService.updateSkinIdList(records.slice(i, i + BATCH_SIZE));
    }
}

/**
 * Envia os agregados por campeão ao banco em batches.
 * @param {object[]} records
 */
async function flushSkinsAggregate(records) {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        await SkinsService.updateSkinsDatabase(records.slice(i, i + BATCH_SIZE));
    }
}

// ─── Funções principais ───────────────────────────────────────────────────────

async function updateSkinsList() {
    console.log('\n📥 Baixando dados bulk da CommunityDragon...');

    // 3 requests no total, em paralelo
    const [allSkinsData, championMap, updatePatch] = await Promise.all([
        fetchAllSkinsFromCD(),
        fetchChampionMap(),
        getLatestCDPatchVersion(),
    ]);

    const totalSkinEntries = Object.keys(allSkinsData).length;
    console.log(`   ✔ ${totalSkinEntries} entradas de skin | ${championMap.size} campeões | patch ${updatePatch}`);

    const skinGroups = groupSkinsByChampion(allSkinsData);

    // ── Processar tudo em memória ──────────────────────────────────────────────
    const allSkinIdListRecords = [];
    const allSkinsAggregates   = [];

    const bar = new cliProgress.SingleBar({
        format: 'Processando |{bar}| {percentage}% | {value}/{total} | {champion}',
        clearOnComplete: true,
    }, cliProgress.Presets.shades_classic);

    bar.start(championMap.size, 0, { champion: '' });

    for (const [numericId, champInfo] of championMap) {
        const rawSkins = skinGroups.get(numericId) ?? [];

        const { skinsAggregate, skinIdListRecords } = buildChampionSkinRecords(
            champInfo,
            rawSkins,
            updatePatch,
        );

        allSkinsAggregates.push(skinsAggregate);
        allSkinIdListRecords.push(...skinIdListRecords);

        bar.increment(1, { champion: champInfo.name });
    }

    bar.stop();

    const nonBaseSkins = allSkinIdListRecords.length;
    console.log(`\n   📊 ${nonBaseSkins} skins não-base encontradas em ${championMap.size} campeões`);

    // ── Persistir no banco ─────────────────────────────────────────────────────
    console.log(`\n💾 Salvando ${nonBaseSkins} registros em SkinsIdList...`);
    await flushSkinIdList(allSkinIdListRecords);

    console.log(`💾 Salvando ${allSkinsAggregates.length} agregados em Skins...`);
    await flushSkinsAggregate(allSkinsAggregates);

    // ── Resumo por raridade ────────────────────────────────────────────────────
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
        // Champions, skinlines e universes são independentes — paralelo
        await Promise.all([
            updateChampions(),
            updateSkinlines(),
            updateUniverses(),
        ]);

        // Skins depende dos campeões estarem cadastrados — executa depois
        await updateSkinsList();

        console.log('🎉 Atualização completa!\n');
    } catch (err) {
        console.error('\n❌ Erro fatal durante a atualização:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Conexão com o banco encerrada.');
    }
}

main();
