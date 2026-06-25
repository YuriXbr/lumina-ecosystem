const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class SkinlinesService extends DatabaseService {
    constructor() {
        super('skinslines', mongoSchema.skinlines);
    }

    async getSkinlines() {
        return this.getAll();
    }

    async getSkinlineData(id) {
        return this.getOne({ id });
    }

    /**
     * Atualiza ou insere skinlines em bulk.
     *
     * CORREÇÃO: filter usava `skinlineData.skinlineId` (campo inexistente).
     * `fetchSkinlinesData` retorna objetos com campo `id`, não `skinlineId`.
     * Com o filtro errado, o MongoDB nunca encontrava o documento existente e
     * tentava inserir, causando E11000 duplicate key na segunda execução.
     *
     * @param {object[]} skinlinesList
     */
    async updateSkinlinesDatabase(skinlinesList) {
        try {
            await this.connect();

            const bulkOps = skinlinesList.map(skinlineData => ({
                updateOne: {
                    filter: { id: skinlineData.id }, // era: skinlineData.skinlineId
                    update: { $set: skinlineData },
                    upsert: true,
                }
            }));

            const result = await this.model.bulkWrite(bulkOps);
            console.log(`[SkinlinesService] bulkWrite: ${result.upsertedCount} inseridos, ${result.modifiedCount} atualizados`);
        } catch (error) {
            console.error('[SkinlinesService] Erro ao atualizar skinlines:', error);
            throw error; // repropagar para o caller saber que falhou
        }
    }
}

module.exports = new SkinlinesService();
