const mongoose = require('mongoose');
const { mongoSchema } = require('../schema');
const indexes = require('../indexes');
let connectionPromise;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10, minPoolSize: 0, serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 15000, autoIndex: process.env.NODE_ENV !== 'production',
    }).finally(() => { connectionPromise = undefined; });
  }
  await connectionPromise;
  return mongoose.connection;
}

class DatabaseService {
  constructor(modelName, schema) {
    if(!modelName || !schema) {
      throw new Error('Model name and schema are required');
    }

    if (!mongoose.models[modelName]) {
      const modelSchema = new mongoose.Schema(schema, { strict: true });
      for (const [keys, options] of indexes[modelName] || []) modelSchema.index(keys, options);
      this.model = mongoose.model(modelName, modelSchema);
    } else {
      this.model = mongoose.models[modelName];
    }
    this.modelName = modelName;
  }

  async connect() {
    await connectDatabase();
  }

  async checkConnection() {
    let state = mongoose.connection.readyState;
    if (state === 1) {
      console.log(`[${this.modelName}] Banco de dados conectado`);
    } else if (state === 2) {
      console.log(`[${this.modelName}] Conectando ao banco de dados...`);
      await this.connect();
      state = mongoose.connection.readyState;
    } else {
      console.log(`[${this.modelName}] Banco de dados desconectado, tentando reconectar...`);
      await this.connect();
      state = mongoose.connection.readyState;
    }
    return state;
  }

  async getAll() {
    await this.connect();
    return this.model.find().lean();
  }

  async get(query = {}, projection = {}, options = {}) {
    await this.connect();
    return this.model.find(query, projection, options).lean();
  }

  async getOne(query = {}, projection = {}, options = {}) {
    await this.connect();
    const result = await this.model.findOne(query, projection, options).lean();
    return result;
}

  async create(data) {
    await this.connect();
    return this.model.create(data);
  }

  async update(query, updateData, options = { new: true }) {
    await this.connect();
    // CORREÇÃO CRÍTICA: o MongoDB trata um documento de update SEM operadores
    // ($set, $inc, etc.) como um documento de SUBSTITUIÇÃO em findOneAndUpdate —
    // ou seja, qualquer campo do documento original que não estivesse presente
    // em `updateData` era APAGADO silenciosamente. Isso afetava, entre outros,
    // GuildService.updateGuildData, BanListService.updateBan, MuteListService.updateMute
    // e WarnListService.update, que passavam objetos "crus" para cá.
    // Se o chamador já usa operadores ($set, $inc, $unset, $push...), respeitamos;
    // caso contrário, envolvemos automaticamente em $set para fazer um update parcial seguro.
    const hasOperators = updateData && Object.keys(updateData).some(key => key.startsWith('$'));
    const safeUpdate = hasOperators ? updateData : { $set: updateData };
    return this.model.findOneAndUpdate(query, safeUpdate, { runValidators: true, ...options });
  }

  async delete(query) {
    await this.connect();
    return this.model.deleteOne(query);
  }

  async count(query = {}) {
    await this.connect();
    return this.model.countDocuments(query);
  }

  async exists(query) {
    await this.connect();
    return this.model.exists(query);
  }
}

module.exports = DatabaseService;
module.exports.connectDatabase = connectDatabase;
