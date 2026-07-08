const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');
const { addLog } = require('../../logger/logger');

class SkinIdListService extends DatabaseService {
    constructor() {
        super('skinsIdList', mongoSchema.skinsIdList);
    }

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
            addLog('DB', 'skinsIdList.update', `bulkWrite: ${result.upsertedCount} inseridos, ${result.modifiedCount} atualizados`);
        } catch (error) {
            addLog('DB', 'skinsIdList.error', `Erro ao atualizar lista de IDs de skins: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new SkinIdListService();
