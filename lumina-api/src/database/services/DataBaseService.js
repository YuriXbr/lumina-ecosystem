const mongoose = require('mongoose');
const { mongoSchema } = require('../schema');

class DatabaseService {
  constructor(modelName, schema) {
    if(!modelName || !schema) {
      throw new Error('Model name and schema are required');
    }
    
    if (!mongoose.models[modelName]) {
      this.model = mongoose.model(modelName, new mongoose.Schema(schema));
    } else {
      this.model = mongoose.models[modelName];
    }
    this.modelName = modelName;
  }

  async connect() {
    if (!mongoose.connection.readyState) {
      const mongoUri = process.env.MONGODB_URI;
      await mongoose.connect(mongoUri);
      console.log(`[${this.modelName}] Conexão estabelecida`);
    }
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
    return this.model.findOneAndUpdate(query, updateData, options);
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