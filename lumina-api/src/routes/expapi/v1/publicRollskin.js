const InventoryService = require('../../../database/services/UserInventoryService');
const SkinService = require('../../../database/services/SkinService');
const { resolveDiscordAccount } = require('../../../utils/resolveDiscordAccount');

module.exports = {
    route: '/expapi/v1/rollskin',
    description: "Roll a skin (usuário logado via dashboard)",
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: true,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: true,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const { chestType } = req.body;
        const email = req.user.email;

        if (!chestType) {
            return res.status(400).send('Missing parameters');
        }

        if (chestType !== 'masterWorkChests' && chestType !== 'hextechChests') {
            return res.status(400).send('Invalid chest type');
        }

        let discordId;
        try {
            const resolved = await resolveDiscordAccount(email);
            discordId = resolved.discordId;
        } catch (err) {
            const status = err.status || 500;
            const message = err.message || 'Erro ao resolver conta Discord';
            return res.status(status).json({ error: message });
        }

        try {
            const skin = await rollSkin(discordId, chestType);
            if (!skin) {
                return res.status(400).send('No skin to roll or user dont have keys or chests');
            }
            return res.status(200).send(skin);
        } catch (error) {
            console.error('Error rolling skin:', error);
            return res.status(500).send('Error rolling skin');
        }
    }
}

// Mesma lógica de /expapi/internal/rollskin — mantida idêntica para não divergir
// das probabilidades já usadas pelo bot do Discord.
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

        userInventory.keys = keyAmount - 1;
        userInventory[chest] = chestAmount - 1;
        await InventoryService.update({ userId }, userInventory);

        const skinsQuantity = await SkinService.getSkinsQuantity();

        const totalSkins = skinsQuantity.totalSkins;
        const legacySkins = skinsQuantity.legacySkins;
        const epicSkins = skinsQuantity.epicSkins;
        const legendarySkins = skinsQuantity.legendarySkins;
        const ultimateSkins = skinsQuantity.ultimateSkins;
        const transcendentSkins = skinsQuantity.transcendentSkins;
        const mythicSkins = skinsQuantity.mythicSkins;

        let probabilities;
        if (chest == 'hextechChests') {
            probabilities = {
                legacy: legacySkins / totalSkins,
                epic: epicSkins / (totalSkins + 100),
                legendary: legendarySkins / (totalSkins + 150),
                ultimate: ultimateSkins / (totalSkins + 200),
                mythic: mythicSkins / (totalSkins + 300),
                transcendent: (transcendentSkins / totalSkins) / 2,
            };
        } else if (chest == 'masterWorkChests') {
            probabilities = {
                legacy: legacySkins / totalSkins,
                epic: epicSkins / totalSkins,
                legendary: legendarySkins / totalSkins,
                ultimate: ultimateSkins / totalSkins,
                mythic: mythicSkins / (totalSkins + 200),
                transcendent: (transcendentSkins / totalSkins) / 2,
            };
        }

        let chosenRarity;
        const randomRarity = Math.random();
        let cumulativeProbability = 0;
        const rarityMapping = ['legacy', 'epic', 'legendary', 'ultimate', 'transcendent', 'mythic'];

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

        const skinsId = await SkinService.getSkinsId(chosenRarity);
        if (!skinsId || skinsId.length === 0) {
            throw new Error(`No skins available in this rarity: ${chosenRarity}`);
        }

        const selectedSkinId = skinsId[Math.floor(Math.random() * skinsId.length)];

        const selectedSkin = await SkinService.getSkinInfo(selectedSkinId);
        if (!selectedSkin) {
            throw new Error('Error retrieving skin information. Please try again.');
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
            // CORREÇÃO: o campo no documento (skinsIdList) é `skinLines` (L
            // maiúsculo), não `skinlines`. Como o schema mudou, esse campo
            // sempre vinha undefined na resposta.
            skinLines: selectedSkin.skinLines,
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
