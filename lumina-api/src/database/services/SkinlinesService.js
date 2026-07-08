const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');
const { addLog } = require('../../logger/logger');

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

    async updateSkinlinesDatabase(skinlinesList) {
        try {
            await this.connect();

            const bulkOps = skinlinesList.map(skinlineData => ({
                updateOne: {
                    filter: { id: skinlineData.id },
                    update: { $set: skinlineData },
                    upsert: true,
                }
            }));

            const result = await this.model.bulkWrite(bulkOps);
            addLog('DB', 'skinlines.update', `bulkWrite: ${result.upsertedCount} inseridos, ${result.modifiedCount} atualizados`);
        } catch (error) {
            addLog('DB', 'skinlines.error', `Erro ao atualizar skinlines: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new SkinlinesService();
