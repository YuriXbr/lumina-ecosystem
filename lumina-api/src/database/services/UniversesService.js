const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class UniversesService extends DatabaseService {
    constructor() {
        super('universes', mongoSchema.universes);
    }

    async updateUniversesDatabase(universesList) {
        try {
            await this.connect();

            const bulkOps = universesList.map(universeData => ({
                updateOne: {
                    filter: { id: universeData.universeId },
                    update: { $set: universeData },
                    upsert: true
                }
            }));

            await this.model.bulkWrite(bulkOps);
            console.log('Universes data updated successfully');
        } catch (error) {
            console.error('Erro ao atualizar dados dos universos:', error);
        }
    }
}

module.exports = new UniversesService;