const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class SkinIdListService extends DatabaseService {
    constructor() {
        super('skinsIdList', mongoSchema.skinsIdList);
    }

    /**
     * Atualiza ou insere registros individuais de skins.
     * O campo de filtro é `id` (ID numérico da skin, ex: 64001).
     *
     * CORREÇÃO: versão anterior tinha `var bulkOps` declarado dentro de um
     * try-catch e usado em um segundo try-catch separado. Se o primeiro bloco
     * falhasse, `bulkOps` ficava undefined e o segundo lançava outro erro.
     *
     * @param {object[]} skinsIdList
     */
    async updateSkinIdList(skinsIdList) {
        try {
            await this.connect();

            const bulkOps = skinsIdList.map(skinIdData => ({
                updateOne: {
                    filter: { id: skinIdData.id },
                    update: { $set: skinIdData },
                    upsert: true,
                }
            }));

            const result = await this.model.bulkWrite(bulkOps);
            console.log(`[SkinIdListService] bulkWrite: ${result.upsertedCount} inseridos, ${result.modifiedCount} atualizados`);
        } catch (error) {
            console.error('[SkinIdListService] Erro ao atualizar a lista de IDs das skins:', error);
            throw error;
        }
    }
}

module.exports = new SkinIdListService();
