const SkinService = require('../database/services/SkinService');
const InventoryService = require('../database/services/UserInventoryService');
const { addLog } = require('../logger/logger');

const RARITY_ORDER = ['legacy', 'epic', 'legendary', 'ultimate', 'transcendent', 'mythic'];

/**
 * Calcula as probabilidades de cada raridade para o tipo de baú informado.
 * Extraído para função pura para ser testável isoladamente.
 */
function computeProbabilities(chest, skinsQuantity) {
    const { totalSkins, legacySkins, epicSkins, legendarySkins, ultimateSkins, transcendentSkins, mythicSkins } = skinsQuantity;

    if (!totalSkins || totalSkins <= 0) {
        throw new Error('Nenhuma skin disponível na base de dados (totalSkins = 0).');
    }

    // Pesos base (não-normalizados) para cada raridade
    let weights;
    if (chest === 'hextechChests') {
        weights = {
            legacy: legacySkins / totalSkins,
            epic: epicSkins / (totalSkins + 100),
            legendary: legendarySkins / (totalSkins + 150),
            ultimate: ultimateSkins / (totalSkins + 200),
            mythic: mythicSkins / (totalSkins + 300),
            transcendent: (transcendentSkins / totalSkins) / 2,
        };
    } else {
        // Masterwork: melhores chances para raridades altas
        weights = {
            legacy: (legacySkins / totalSkins) * 0.5,
            epic: epicSkins / totalSkins,
            legendary: legendarySkins / (totalSkins + 50),
            ultimate: ultimateSkins / (totalSkins + 100),
            mythic: mythicSkins / (totalSkins + 150),
            transcendent: (transcendentSkins / totalSkins) / 2,
        };
    }

    // CORREÇÃO: Normaliza para que a soma seja exatamente 1.0
    // Antes, as probabilidades eram frações independentes que podiam
    // não somar 1, fazendo pickRarity retornar null em ~24% dos casos.
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (sum <= 0) {
        throw new Error('Soma de probabilidades é zero — sem skins disponíveis.');
    }

    const normalized = {};
    for (const rarity of RARITY_ORDER) {
        normalized[rarity] = (weights[rarity] || 0) / sum;
    }

    return normalized;
}

function pickRarity(probabilities, randomValue = Math.random()) {
    let cumulative = 0;
    for (const rarity of RARITY_ORDER) {
        cumulative += probabilities[rarity] || 0;
        if (randomValue < cumulative) return rarity;
    }
    return null;
}

/** Select first, then debit and award together in one conditional write.
 * A catalog failure changes no balance; an insufficient balance awards nothing.
 */
async function rollSkin(userId, chest) {
    if (!['hextechChests', 'masterWorkChests'].includes(chest)) throw new Error('Invalid chest type');
    const skinsQuantity = await SkinService.getSkinsQuantity();
    const probabilities = computeProbabilities(chest, skinsQuantity);
    const chosenRarity = pickRarity(probabilities);
    const skinsId = await SkinService.getSkinsId(chosenRarity);
    if (!chosenRarity || !skinsId?.length) throw new Error('Nenhuma skin disponível para este sorteio.');
    const selectedSkin = await SkinService.getSkinInfo(skinsId[Math.floor(Math.random() * skinsId.length)]);
    if (!selectedSkin) throw new Error('Skin indisponível. Nenhum recurso foi consumido.');
    const awarded = await InventoryService.awardSkinAndSpend(userId, chest, selectedSkin.id);
    if (!awarded) return null;
    return {
        skinId: selectedSkin.id, skinName: selectedSkin.name, rarity: chosenRarity,
        championId: selectedSkin.championId, championName: selectedSkin.championName,
        isBase: selectedSkin.isBase, isLegacy: selectedSkin.isLegacy, skinLines: selectedSkin.skinLines,
        splashPath: selectedSkin.splashPath, loadScreenPath: selectedSkin.loadScreenPath,
        tilePath: selectedSkin.tilePath, uncenteredSplashPath: selectedSkin.uncenteredSplashPath,
    };
}
module.exports = { rollSkin, computeProbabilities, pickRarity, RARITY_ORDER };
