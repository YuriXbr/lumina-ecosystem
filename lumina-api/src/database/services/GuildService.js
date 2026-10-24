const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class GuildService extends DatabaseService {
    constructor() {
        super('guilds', mongoSchema.guilds);
    }

    async getGuildData(guildId) {
        return this.getOne({ guildId });
    }

    async createGuildData(guildData) {
        return this.create(guildData);
    }

    async upsertMetadata({guildId,ownerId,guildName,memberCount}) {
        if (typeof guildId!=='string' || typeof ownerId!=='string' || !/^\d{16,20}$/.test(guildId) || !/^\d{16,20}$/.test(ownerId) || typeof guildName!=='string' || !guildName.trim() || guildName.length>100 || (memberCount!==undefined && (!Number.isSafeInteger(memberCount)||memberCount<0))) {
            throw Object.assign(new Error('Metadados do servidor inválidos.'),{status:400,code:'INVALID_GUILD_METADATA'});
        }
        await this.connect();
        const metadata={guildOwnerId:ownerId,guildReferenceName:guildName,botPresent:true,lastSyncedAt:new Date(),...(memberCount!==undefined?{memberCount}:{})};
        try {
            return await this.model.findOneAndUpdate({guildId},{$set:metadata},{upsert:true,new:true,runValidators:true,setDefaultsOnInsert:true}).lean();
        } catch(error) {
            if(error.code!==11000)throw error;
            return this.model.findOneAndUpdate({guildId},{$set:metadata},{new:true,runValidators:true}).lean();
        }
    }

    async updateGuildData(guildId, data) {
        if (typeof guildId !== 'string') throw new Error('guildId must be a string');
        if (typeof data !== 'object') throw new Error('data must be an object');
        return this.update({ guildId }, data);
    }
}

module.exports = new GuildService();
