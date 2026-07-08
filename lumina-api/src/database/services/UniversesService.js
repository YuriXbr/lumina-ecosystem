const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');
const { addLog } = require('../../logger/logger');

class UniversesService extends DatabaseService {
    constructor() {
        super('universes', mongoSchema.universes);
    }

    async updateUniversesDatabase(universesList) {
        try {
            await this.connect();

            const bulkOps = universesList.map(universeData => ({
                updateOne: {
                    filter: { id: universeData.id },
                    update: { $set: universeData },
                    upsert: true,
                }
            }));

            const result = await this.model.bulkWrite(bulkOps);
            addLog('DB', 'universes.update', `bulkWrite: ${result.upsertedCount} inseridos, ${result.modifiedCount} atualizados`);
        } catch (error) {
            addLog('DB', 'universes.error', `Erro ao atualizar universos: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new UniversesService();
