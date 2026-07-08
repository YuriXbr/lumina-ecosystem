const DatabaseService = require('./DataBaseService');
const UserInventoryService = require('./UserInventoryService');
const SkinsIdListService = require('./SkinsIdListService');
const { mongoSchema } = require('../schema');
const { addLog } = require('../../logger/logger');

// Cache de skins via MongoDB (serverless-safe).
// O Map em memória anterior era inútil em ambiente serverless (cada invocação
// é um processo novo, o cache nunca existia quando a função aquecesse) e
// perigoso em ambientes multi-instância (dados diferentes por instância).
// CacheService usa o MongoDB como store compartilhado com TTL nativo.
const SKINS_CACHE_KEY = 'skins:all';
const SKINS_CACHE_TTL_MS = 60 * 1000; // 60s

class SkinService extends DatabaseService {
    constructor() {
        super('skins', mongoSchema.skins);
    }

    /** Busca todas as skins usando cache MongoDB de 60s. */
    async _getAllSkinsCached() {
        const CacheService = require('./CacheService');
        const cached = await CacheService.get(SKINS_CACHE_KEY);
        if (cached) return cached;
        const skinsData = await this.getAll();
        await CacheService.set(SKINS_CACHE_KEY, skinsData, SKINS_CACHE_TTL_MS);
        return skinsData;
    }

    /** Invalida o cache — chamado após qualquer escrita na coleção de skins. */
    async _invalidateSkinsCache() {
        const CacheService = require('./CacheService');
        await CacheService.invalidate(SKINS_CACHE_KEY);
    }

    async updateSkinsDatabase(skinsList) {
        await this.connect();

        const bulkOps = skinsList.map(skinData => ({
            updateOne: {
                filter: { championId: skinData.championId },
                update: { $set: skinData },
                upsert: true,
            }
        }));

        try {
            const result = await this.model.bulkWrite(bulkOps);
            await this._invalidateSkinsCache();
            addLog('DB', 'skins.update', `bulkWrite: ${result.upsertedCount} inseridos, ${result.modifiedCount} atualizados`);
        } catch (error) {
            addLog('DB', 'skins.error', `Erro ao atualizar skins: ${error.message}`);
            throw error;
        }
    }

    async getAllSkins() {
        return this.getAll();
    }

    async getSkinData(championId) {
        return this.getOne({ championId });
    }

    async getSkinsQuantity() {
        try {
            const skinsData = await this._getAllSkinsCached();
            return {
                totalSkins:        skinsData.reduce((acc, s) => acc + s.quantity,             0),
                legacySkins:       skinsData.reduce((acc, s) => acc + s.legacyQuantity,       0),
                epicSkins:         skinsData.reduce((acc, s) => acc + s.epicQuantity,         0),
                legendarySkins:    skinsData.reduce((acc, s) => acc + s.legendaryQuantity,    0),
                ultimateSkins:     skinsData.reduce((acc, s) => acc + s.ultimateQuantity,     0),
                transcendentSkins: skinsData.reduce((acc, s) => acc + s.transcendentQuantity, 0),
                mythicSkins:       skinsData.reduce((acc, s) => acc + s.mythicQuantity,       0),
            };
        } catch (error) {
            addLog('DB', 'skins.error', `Erro em getSkinsQuantity: ${error.message}`);
            throw error;
        }
    }

    async getSkinsId(rarity) {
        try {
            const skinsList = await this._getAllSkinsCached();
            const asArray = (value) => Array.isArray(value) ? value : [];

            const rarityMapping = {
                legacy:       skinsList.filter(s => s.legacyQuantity       > 0).flatMap(s => asArray(s.legacy).map(sk => sk.id)),
                epic:         skinsList.filter(s => s.epicQuantity         > 0).flatMap(s => asArray(s.epic).map(sk => sk.id)),
                legendary:    skinsList.filter(s => s.legendaryQuantity    > 0).flatMap(s => asArray(s.legendary).map(sk => sk.id)),
                ultimate:     skinsList.filter(s => s.ultimateQuantity     > 0).flatMap(s => asArray(s.ultimate).map(sk => sk.id)),
                transcendent: skinsList.filter(s => s.transcendentQuantity > 0).flatMap(s => asArray(s.transcendent).map(sk => sk.id)),
                mythic:       skinsList.filter(s => s.mythicQuantity       > 0).flatMap(s => asArray(s.mythic).map(sk => sk.id)),
            };

            return rarity ? (rarityMapping[rarity] ?? []) : rarityMapping;
        } catch (error) {
            addLog('DB', 'skins.error', `Erro em getSkinsId: ${error.message}`);
            return [];
        }
    }

    async addSkinToInventory(userId, skinId) {
        const skinIdNumber = parseInt(skinId, 10);
        try {
            // CORREÇÃO: antes fazia getInventory() -> push() em memória -> update()
            // com o documento inteiro. Além de sofrer da mesma race condition
            // (duas escritas concorrentes podiam se sobrepor e uma skin sorteada
            // "sumir" do inventário), o update() sem $set substituía o documento
            // inteiro (ver correção em DataBaseService.update). $push é atômico
            // e cumulativo por natureza — não sofre nenhum desses problemas.
            await UserInventoryService.connect();
            const userInventory = await UserInventoryService.model.findOneAndUpdate(
                { userId },
                { $push: { skins: skinIdNumber }, $setOnInsert: { userId } },
                { upsert: true, new: true }
            );
            return userInventory;
        } catch (error) {
            addLog('DB', 'skins.error', `Erro em addSkinToInventory (user=${userId}, skin=${skinId}): ${error.message}`);
            return null;
        }
    }

    async getSkinInfo(skinId) {
        try {
            if (Array.isArray(skinId)) {
                const ids = skinId.map(id => parseInt(id, 10));
                const skinData = await SkinsIdListService.get({ id: { $in: ids } });
                if (!skinData || skinData.length === 0) throw new Error('Skin not found');
                return skinData;
            }

            const skinData = await SkinsIdListService.getOne({ id: parseInt(skinId, 10) });
            if (!skinData) throw new Error('Skin not found');
            return skinData;
        } catch (error) {
            addLog('DB', 'skins.error', `Erro em getSkinInfo (id=${skinId}): ${error.message}`);
            return null;
        }
    }

    async fetchUserSkins(userId) {
        try {
            const userInventory = await UserInventoryService.getInventory(userId);
            if (!userInventory) throw new Error('User inventory not found');

            const userSkins = await Promise.all(
                userInventory.skins.map(id => this.getSkinInfo(id))
            );
            return userSkins.filter(Boolean);
        } catch (error) {
            addLog('DB', 'skins.error', `Erro em fetchUserSkins (user=${userId}): ${error.message}`);
            return null;
        }
    }
}

module.exports = new SkinService();
