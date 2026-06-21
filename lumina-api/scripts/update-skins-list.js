require('dotenv').config();

const SkinsService = require('../src/database/services/SkinService');
const SkinIdListService = require('../src/database/services/SkinsIdListService');
const UniversesService = require('../src/database/services/UniversesService');
const ChampionsService = require('../src/database/services/ChampionsService');
const SkinlinesService = require('../src/database/services/SkinlinesService');

const { getChampionsId, getChampionSkins, getSkinDetails, fetchChampionsData, fetchSkinlinesData, fetchUniversesData, getLatestCDPatchVersion } = require('../src/ThirdParty/riotApi');
const cliProgress = require('cli-progress');

const updateSkinsList = async () => {
    const champions = await getChampionsId();
    const updatePatch = await getLatestCDPatchVersion();

    // Initialize progress bar
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(champions.length, 0);

    for (const champion of champions) {
        const skins = await getChampionSkins(champion.name);
        if (!skins) {
            console.clear();
            progressBar.increment();
            console.error(`\n❌[skins] ${champion.name}: no skins found\n\n\n\n\n`);
            continue;
        }
        const skinsId = skins.map(skin => skin.id);
        const championSkins = {
            kNoRarity: [],
            kEpic: [],
            kLegendary: [],
            kUltimate: [],
            kTranscendent: [],
            kMythic: [] 
        };

        let nonBaseSkinCount = 0;
        for (const skinId of skinsId) {
            const skin = await getSkinDetails(skinId);
            if (skin) {
                if (skin.isBase) {
                    continue; // Skip saving if isBase is true
                }
                nonBaseSkinCount++; // Increment count for non-base skins
                const skinData = {
                    id: skin.id,
                    name: skin.name,
                    description: skin.description,
                    championId: champion.id,
                    championName: champion.name,
                    isBase: skin.isBase,
                    rarity: skin.rarity,
                    isLegacy: skin.isLegacy,
                    skinLines: skin.skinLines,
                    splashPath: skin.splashPath,
                    loadScreenPath: skin.loadScreenPath,
                    tilePath: skin.tilePath,
                    uncenteredSplashPath: skin.uncenteredSplashPath,
                    updatePatch: updatePatch, // Ensure updatePatch is included
                    championData: {
                        championId: champion.id,
                        championName: champion.name,
                    }
                };

                // Ensure the rarity exists in championSkins before pushing
                if (!championSkins[skin.rarity]) {
                    championSkins[skin.rarity] = [];
                }

                championSkins[skin.rarity].push(skinData);
                await SkinIdListService.updateSkinIdList([skinData]);
            }
        }

        const championData = {
            championId: champion.name, 
            quantity: nonBaseSkinCount - 1,
            legacyQuantity: championSkins.kNoRarity.length,
            epicQuantity: championSkins.kEpic.length,
            legendaryQuantity: championSkins.kLegendary.length,
            ultimateQuantity: championSkins.kUltimate.length,
            transcendentQuantity: championSkins.kTranscendent.length,
            mythicQuantity: championSkins.kMythic.length,
            skins: {
                noRarity: championSkins.kNoRarity,
                epic: championSkins.kEpic,
                legendary: championSkins.kLegendary,
                ultimate: championSkins.kUltimate,
                transcendent: championSkins.kTranscendent,
                mythic: championSkins.kMythic, // Adicione lógica para mythic se necessário
            },
            updatePatch: updatePatch // Ensure updatePatch is included
        };
        await SkinsService.updateSkinsDatabase([championData]);

        // Update progress bar
        console.clear();
        progressBar.increment();
        console.log(`\n✅[skins] ${champion.name} updated, ${nonBaseSkinCount} skins found \n   🔳 Legado: ${championSkins.kNoRarity.length} \n   🔵 Epicas: ${championSkins.kEpic.length} \n   🔴 Lendárias: ${championSkins.kLegendary.length} \n   🟠 Ultimates: ${championSkins.kUltimate.length} \n   💎 Transcendidas: ${championSkins.kTranscendent.length} \n   🟣 Miticas: ${championSkins.kMythic.length}\n`);
    }

    // Stop progress bar
    progressBar.stop();
    console.log('\n---All champions skins data updated successfully---\n');
}

const updateChampions = async () => {
    const championsData = await fetchChampionsData();
    if (championsData) {
        await ChampionsService.updateChampionsDatabase(championsData);
    }
}

const updateSkinlines = async () => {
    const skinlinesData = await fetchSkinlinesData();
    if (skinlinesData) {
        await SkinlinesService.updateSkinlinesDatabase(skinlinesData);
    }
}

const updateUniverses = async () => {
    const universesData = await fetchUniversesData();
    if (universesData) {
        await UniversesService.updateUniversesDatabase(universesData);
    }
}

const main = async () => {
    console.log('\n\n---Updating champions skins data---\n\n');
    
    await updateChampions();
    await updateSkinlines();
    await updateUniverses();
    await updateSkinsList();
}

main().catch(error => console.error('Erro ao atualizar a lista de skins:', error));