const SkinService = require('../../../database/services/SkinService');
const InventoryService = require('../../../database/services/UserInventoryService');

module.exports = {
    route: '/expapi/internal/rollskin',
    description: "Roll a skin",
    apiKeyNeeded: false,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { userId, chestType } = req.body;

        if (!userId || !chestType) {
            return res.status(400).send('Missing parameters');
        }

        if (chestType !== 'masterWorkChests' && chestType !== 'hextechChests') {
            return res.status(400).send('Invalid chest type');
        }

        try {
            const skin = await rollSkin(userId, chestType);
            if (!skin) {
                return res.status(400).send('No skin to roll or user dont have keys or chests');
            }
            res.status(200).send(skin);
        } catch (error) {
            console.error('Error rolling skin:', error);
            res.status(500).send('Error rolling skin');
        }
    }
}

async function rollSkin(userId, chest) {
    try {
        let userInventory = await InventoryService.getInventory(userId);
        
        if (!userInventory) {
            userInventory = await InventoryService.create(userId);
        }

        let keyAmount = userInventory.keys || 0;
        let chestAmount = userInventory[chest] || 0;

        if (keyAmount === 0 || chestAmount === 0) {
            throw new Error('User does not have the required key or chest');
        }

        // Remove key and chest from inventory
        userInventory.keys = keyAmount - 1;
        userInventory[chest] = chestAmount - 1;
        await InventoryService.update({ userId }, userInventory);

        // Obter a quantidade de skins
        const skinsQuantity = await SkinService.getSkinsQuantity();
        
        const totalSkins = skinsQuantity.totalSkins;
        const legacySkins = skinsQuantity.legacySkins;
        const epicSkins = skinsQuantity.epicSkins;
        const legendarySkins = skinsQuantity.legendarySkins;
        const ultimateSkins = skinsQuantity.ultimateSkins;
        const transcendentSkins = skinsQuantity.transcendentSkins;
        const mythicSkins = skinsQuantity.mythicSkins;

        // Cálculo das probabilidades
        let probabilities;
        if(chest == 'hextechChests') {
            probabilities = {
                legacy: legacySkins / totalSkins,
                epic: epicSkins / (totalSkins+100),
                legendary: legendarySkins / (totalSkins+150),
                ultimate: ultimateSkins / (totalSkins+200),
                mythic: mythicSkins / (totalSkins+300),
                transcendent: (transcendentSkins / totalSkins)/2,
            };
        } else if (chest == 'masterWorkChests') {
            probabilities = {
                legacy: legacySkins / totalSkins,
                epic: epicSkins / totalSkins,
                legendary: legendarySkins / totalSkins,
                ultimate: ultimateSkins / totalSkins,
                mythic: mythicSkins / (totalSkins+200),
                transcendent: (transcendentSkins / totalSkins)/2,
            };
        }

        // Inicializa a variável chosenRarity
        let chosenRarity;
        // Escolher uma raridade com base nas probabilidades acumuladas
        const randomRarity = Math.random();
        let cumulativeProbability = 0;
        const rarityMapping = ['legacy', 'epic', 'legendary', 'ultimate', 'transcendent', 'mythic'];

        // Calcular raridade escolhida
        for (let rarity of rarityMapping) {
            cumulativeProbability += probabilities[rarity];
            if (randomRarity < cumulativeProbability) {
                chosenRarity = rarity;
                break;
            }
        }

        if (!chosenRarity) {
            console.error('Nenhuma raridade foi escolhida. Verifique as probabilidades.');
            throw new Error('Error determining skin rarity. Please try again.');
        }

        // Obter os IDs das skins da raridade escolhida
        const skinsId = await SkinService.getSkinsId(chosenRarity);
        if (!skinsId || skinsId.length === 0) {
            throw new Error(`No skins available in this rarity: ${chosenRarity}`);
        }

        // Escolher um ID de skin aleatoriamente
        const selectedSkinId = skinsId[Math.floor(Math.random() * skinsId.length)];

        // Buscar as informações da skin escolhida no banco de dados
        const selectedSkin = await SkinService.getSkinInfo(selectedSkinId);
        if (!selectedSkin) {
            throw new Error('Error retrieving skin information. Please try again.');
        }

        await SkinService.addSkinToInventory(userId, selectedSkin.id, selectedSkin.rarity);

        // Retornar os dados da skin escolhida
        return {
            skinId: selectedSkin.id,
            skinName: selectedSkin.name,
            rarity: chosenRarity,
            championId: selectedSkin.championId,
            championName: selectedSkin.championName,
            isBase: selectedSkin.isBase,
            isLegacy: selectedSkin.isLegacy,
            skinlines: selectedSkin.skinlines,
            splashPath: selectedSkin.splashPath,
            loadScreenPath: selectedSkin.loadScreenPath,
            tilePath: selectedSkin.tilePath,
            uncenteredSplashPath: selectedSkin.uncenteredSplashPath,
            
        };

    } catch (error) {
        console.error('Error rolling skin:', error);
        return null;
    }
}