const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class UniversesService extends DatabaseService {
    constructor() {
        super('universes', mongoSchema.universes);
    }

    /**
     * Atualiza ou insere universos em bulk.
     *
     * CORREÇÃO: filter usava `universeData.universeId` (campo inexistente).
     * `fetchUniversesData` retorna objetos com campo `id`, não `universeId`.
     * Com o filtro errado, o MongoDB nunca encontrava o documento existente e
     * tentava inserir, causando E11000 duplicate key na segunda execução.
     *
     * @param {object[]} universesList
     */
    async updateUniversesDatabase(universesList) {
        try {
            await this.connect();

            const bulkOps = universesList.map(universeData => ({
                updateOne: {
                    filter: { id: universeData.id }, // era: universeData.universeId
                    update: { $set: universeData },
                    upsert: true,
                }
            }));

            const result = await this.model.bulkWrite(bulkOps);
            console.log(`[UniversesService] bulkWrite: ${result.upsertedCount} inseridos, ${result.modifiedCount} atualizados`);
        } catch (error) {
            console.error('[UniversesService] Erro ao atualizar universos:', error);
            throw error; // repropagar para o caller saber que falhou
        }
    }
}

module.exports = new UniversesService();
