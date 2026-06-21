const DatabaseService = require('./DataBaseService');
const UserInventoryService = require('./UserInventoryService');
const SkinsIdListService = require('./SkinsIdListService');
const { mongoSchema } = require('../schema');

class SkinService extends DatabaseService {
    constructor() {
        super('skins', mongoSchema.skins);
    }

    async updateSkinsDatabase(skinsList) {
        const bulkOps = skinsList.map(skinData => ({
            updateOne: {
                filter: { championId: skinData.championId },
                update: { $set: skinData },
                upsert: true
            }
        }));

        try {
            await this.model.bulkWrite(bulkOps);
            console.log('Skins data updated successfully');
        } catch (error) {
            console.error('Erro ao atualizar dados das skins:', error);
        }
    }

    async getAllSkins() {
        return this.getAll();
    }

    async getSkinData(championId) {
        return this.getOne({ championId });
    }

    async getSkinsQuantity() {
        let totalSkins = 0;
        let legacySkins = 0;
        let epicSkins = 0;
        let legendarySkins = 0;
        let ultimateSkins = 0;
        let transcendentSkins = 0;
        let mythicSkins = 0;
        
        try {
            const skinsData = await this.getAll();
    
            // soma de todas as colunas quantity das skins
            totalSkins = skinsData.reduce((acc, skin) => acc + skin.quantity, 0);
            legacySkins = skinsData.reduce((acc, skin) => acc + skin.legacyQuantity, 0);
            epicSkins = skinsData.reduce((acc, skin) => acc + skin.epicQuantity, 0);
            legendarySkins = skinsData.reduce((acc, skin) => acc + skin.legendaryQuantity, 0);
            ultimateSkins = skinsData.reduce((acc, skin) => acc + skin.ultimateQuantity, 0);
            transcendentSkins = skinsData.reduce((acc, skin) => acc + skin.transcendentQuantity, 0);
            mythicSkins = skinsData.reduce((acc, skin) => acc + skin.mythicQuantity, 0);
    
            return { totalSkins, legacySkins, epicSkins, legendarySkins, ultimateSkins, transcendentSkins, mythicSkins };
        } catch (error) {
            console.error('Erro ao obter quantidade de skins:', error);
        } 
    }

    async getSkinsId(rarity) {
        try {
            const skinsList = await this.getAll();
    
            // Filtrar e mapear os IDs das skins de acordo com a raridade
            const legacySkinsId = skinsList.filter(skin => skin.legacyQuantity > 0).flatMap(skin => JSON.parse(skin.legacy).map(s => s.id));
            const epicSkinsId = skinsList.filter(skin => skin.epicQuantity > 0).flatMap(skin => JSON.parse(skin.epic).map(s => s.id));
            const legendarySkinsId = skinsList.filter(skin => skin.legendaryQuantity > 0).flatMap(skin => JSON.parse(skin.legendary).map(s => s.id));
            const ultimateSkinsId = skinsList.filter(skin => skin.ultimateQuantity > 0).flatMap(skin => JSON.parse(skin.ultimate).map(s => s.id));
            const transcendentSkinsId = skinsList.filter(skin => skin.transcendentQuantity > 0).flatMap(skin => JSON.parse(skin.transcendent).map(s => s.id));
            const mythicSkinsId = skinsList.filter(skin => skin.mythicQuantity > 0).flatMap(skin => JSON.parse(skin.mythic).map(s => s.id));
    
            const rarityMapping = {
                legacy: legacySkinsId,
                epic: epicSkinsId,
                legendary: legendarySkinsId,
                ultimate: ultimateSkinsId,
                transcendent: transcendentSkinsId,
                mythic: mythicSkinsId
            };
    
            return rarity ? rarityMapping[rarity] || [] : rarityMapping;
        } catch (error) {
            console.error('Error in getSkinsId:', error);
            return [];
        }
    }

    async addSkinToInventory(userId, skinId) {
        let skinIdNumber = parseInt(skinId);
    
        try {
            let userInventory = await UserInventoryService.getInventory(userId);
    
            if (!userInventory) {
                userInventory = await UserInventoryService.create(userId );
            }
    
            // add the skinId to the 'skins' array
            userInventory.skins.push(skinIdNumber);
    
            // send to database
            await UserInventoryService.update({ userId }, userInventory);
            return userInventory;
        } catch (error) {
            console.error('Error adding skin:', error);
            return null;
        }
    }

    async getSkinInfo(skinId) {
        try {
            // Converter skinId para string
            skinId = skinId.toString();
    
            let skinData;
            if (Array.isArray(skinId)) {
                skinData = await this.get({ id: { $in: skinId } });
            } else {
                skinData = await SkinsIdListService.getOne({ id: skinId });
            }
    
            if (!skinData || (Array.isArray(skinData) && skinData.length === 0)) {
                throw new Error('Skin not found');
            }
    
            return skinData;
        } catch (error) {
            console.error('Error in getSkinInfo:', error);
            return null;
        }
    }

    async fetchUserSkins(userId) {
        try {
            const userInventory = await UserInventoryService.getInventory(userId);
    
            if (!userInventory) {
                throw new Error('User inventory not found');
            }
    
            let userSkins = [];
            for (const skinId of userInventory.skins) {
                const skinData = await this.getSkinInfo(skinId);
                userSkins.push(skinData);
            }
    
            return userSkins;
    
        } catch (error) {
            console.error('Error fetching user skins:', error);
            return null;
        }
    }
}

module.exports = new SkinService();