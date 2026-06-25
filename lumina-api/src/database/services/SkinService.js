const DatabaseService = require('./DataBaseService');
const UserInventoryService = require('./UserInventoryService');
const SkinsIdListService = require('./SkinsIdListService');
const { mongoSchema } = require('../schema');

class SkinService extends DatabaseService {
    constructor() {
        super('skins', mongoSchema.skins);
    }

    /**
     * Atualiza ou insere os dados agregados de skins por campeão.
     * Faz upsert via bulkWrite para eficiência com grandes volumes.
     * O campo de filtro é `championId` (alias DDragon, ex: "LeeSin").
     *
     * @param {object[]} skinsList - Array de objetos com dados por campeão
     */
    async updateSkinsDatabase(skinsList) {
        await this.connect(); // CORREÇÃO: connect() ausente na versão anterior

        const bulkOps = skinsList.map(skinData => ({
            updateOne: {
                filter: { championId: skinData.championId },
                update: { $set: skinData },
                upsert: true,
            }
        }));

        try {
            const result = await this.model.bulkWrite(bulkOps);
            console.log(`[SkinService] bulkWrite: ${result.upsertedCount} inseridos, ${result.modifiedCount} atualizados`);
        } catch (error) {
            console.error('[SkinService] Erro ao atualizar dados das skins:', error);
            throw error; // repropagar para o caller decidir o que fazer
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
            const skinsData = await this.getAll();

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
            console.error('[SkinService] Erro ao obter quantidade de skins:', error);
            throw error;
        }
    }

    async getSkinsId(rarity) {
        try {
            const skinsList = await this.getAll();

            // CORREÇÃO: alguns documentos antigos da coleção `skins` ainda têm
            // os campos de raridade (legacy/epic/.../mythic) como objeto `{}`
            // (valor default anterior ao schema atual), em vez de array.
            // `?? []` só cobre null/undefined, não cobre `{}` — então
            // `.map` quebrava nesses documentos. `asArray` normaliza qualquer
            // valor que não seja array para `[]`.
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
            console.error('[SkinService] Erro em getSkinsId:', error);
            return [];
        }
    }

    async addSkinToInventory(userId, skinId) {
        const skinIdNumber = parseInt(skinId, 10);

        try {
            let userInventory = await UserInventoryService.getInventory(userId);
            if (!userInventory) {
                userInventory = await UserInventoryService.create({ userId });
            }

            userInventory.skins.push(skinIdNumber);
            await UserInventoryService.update({ userId }, userInventory);
            return userInventory;
        } catch (error) {
            console.error('[SkinService] Erro ao adicionar skin ao inventário:', error);
            return null;
        }
    }

    async getSkinInfo(skinId) {
        try {
            // CORREÇÃO: antes o código fazia `skinId = skinId.toString()`
            // ANTES de checar `Array.isArray(skinId)` — ou seja, o branch de
            // array nunca era alcançado (toString() em array vira string).
            // Além disso, quando alcançado, usava `this.get(...)` (coleção
            // `skins`, agregados por campeão, sem campo `id`) em vez de
            // `SkinsIdListService` (coleção `skinsIdList`, que é quem
            // realmente tem o campo `id`).
            if (Array.isArray(skinId)) {
                const ids = skinId.map(id => parseInt(id, 10));
                const skinData = await SkinsIdListService.get({ id: { $in: ids } });

                if (!skinData || skinData.length === 0) {
                    throw new Error('Skin not found');
                }

                return skinData;
            }

            const skinData = await SkinsIdListService.getOne({ id: parseInt(skinId, 10) });

            if (!skinData) {
                throw new Error('Skin not found');
            }

            return skinData;
        } catch (error) {
            console.error('[SkinService] Erro em getSkinInfo:', error);
            return null;
        }
    }

    async fetchUserSkins(userId) {
        try {
            const userInventory = await UserInventoryService.getInventory(userId);
            if (!userInventory) throw new Error('User inventory not found');

            const userSkins = await Promise.all(
                userInventory.skins.map(skinId => this.getSkinInfo(skinId))
            );

            return userSkins.filter(Boolean); // remove nulls de skins não encontradas
        } catch (error) {
            console.error('[SkinService] Erro em fetchUserSkins:', error);
            return null;
        }
    }
}

module.exports = new SkinService();
