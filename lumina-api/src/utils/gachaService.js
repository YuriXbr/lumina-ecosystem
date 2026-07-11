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

/**
 * Sorteia uma skin de um baú para o usuário.
 *
 * CORREÇÃO DE SEGURANÇA (race condition / double-spend): o débito de
 * chave+baú agora é feito via UserInventoryService.spendKeyAndChest, uma
 * operação atômica condicional no MongoDB. Duas chamadas concorrentes para
 * o mesmo usuário NUNCA conseguem debitar o mesmo recurso duas vezes —
 * a segunda chamada recebe `null` e a rota responde 400 (sem recurso),
 * em vez de conceder uma skin "de graça".
 *
 * @returns {Promise<object|null>} dados da skin sorteada, ou null se o
 *          usuário não possuía chave/baú suficiente.
 */
async function rollSkin(userId, chest) {
    const debited = await InventoryService.spendKeyAndChest(userId, chest);
    if (!debited) {
        return null; // sem chave ou baú suficiente — nada foi debitado
    }

    try {
        const skinsQuantity = await SkinService.getSkinsQuantity();
        const probabilities = computeProbabilities(chest, skinsQuantity);
        const chosenRarity = pickRarity(probabilities);

        if (!chosenRarity) {
            throw new Error('Não foi possível determinar a raridade da skin sorteada.');
        }

        const skinsId = await SkinService.getSkinsId(chosenRarity);
        if (!skinsId?.length) {
            throw new Error(`Nenhuma skin disponível na raridade: ${chosenRarity}`);
        }

        const selectedSkinId = skinsId[Math.floor(Math.random() * skinsId.length)];
        const selectedSkin = await SkinService.getSkinInfo(selectedSkinId);
        if (!selectedSkin) {
            throw new Error('Erro ao buscar informações da skin sorteada.');
        }

        await SkinService.addSkinToInventory(userId, selectedSkin.id, selectedSkin.rarity);

        return {
            skinId: selectedSkin.id,
            skinName: selectedSkin.name,
            rarity: chosenRarity,
            championId: selectedSkin.championId,
            championName: selectedSkin.championName,
            isBase: selectedSkin.isBase,
            isLegacy: selectedSkin.isLegacy,
            skinLines: selectedSkin.skinLines,
            splashPath: selectedSkin.splashPath,
            loadScreenPath: selectedSkin.loadScreenPath,
            tilePath: selectedSkin.tilePath,
            uncenteredSplashPath: selectedSkin.uncenteredSplashPath,
        };
    } catch (error) {
        // O débito já ocorreu e não pode ser silenciosamente perdido: devolve
        // a chave e o baú ao usuário antes de propagar o erro, para não gerar
        // um débito "fantasma" caso o sorteio falhe depois do pagamento.
        await InventoryService.addInventory(userId, 'keys', 1).catch(() => {});
        await InventoryService.addInventory(userId, chest, 1).catch(() => {});
        addLog('API', 'gacha.rollback', `Reembolso de baú/chave para ${userId} após falha: ${error.message}`);
        throw error;
    }
}

module.exports = { rollSkin, computeProbabilities, pickRarity, RARITY_ORDER };
