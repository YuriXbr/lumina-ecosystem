const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class SkinIdListService extends DatabaseService {
    constructor() {
        super('skinsIdList', mongoSchema.skinsIdList);
    }

    async updateSkinIdList(skinsIdList) {
        var bulkOps;

        try {
            await this.connect();
            bulkOps = skinsIdList.map(skinIdData => ({
                updateOne: {
                    filter: { id: skinIdData.id },
                    update: { $set: skinIdData },
                    upsert: true
                }
            }));
            
        } catch (error) {
            console.error('Erro ao atualizar a lista de IDs das skins:', error);
        }

        try {
            await this.model.bulkWrite(bulkOps);
            console.log('Skins ID list updated successfully');
        } catch (error) {
            console.error('Erro ao atualizar a lista de IDs das skins:', error);
        }
    }
}

module.exports = new SkinIdListService();