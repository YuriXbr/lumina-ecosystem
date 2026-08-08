const InventoryService = require('../src/database/services/UserInventoryService');
const mongoose = require('mongoose');

// Mock do Mongoose
jest.mock('mongoose', () => {
  const mModel = {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  const mSchema = function (schema) {
    this.schema = schema;
  };

  return {
    model: jest.fn(() => mModel),
    models: {},
    connection: { readyState: 1 },
    connect: jest.fn(),
    disconnect: jest.fn(), // Adiciona o mock para disconnect
    Schema: mSchema, // Adiciona o mock de Schema
  };
});

describe('InventoryService', () => {
  it('should add inventory', async () => {
    const mockResult = { userId: '123', item: 'testItem', amount: 10 };
    mongoose.model().findOneAndUpdate.mockResolvedValue(mockResult);

    const result = await InventoryService.addInventory('123', 'testItem', 10);
    expect(result).toEqual(mockResult);
    expect(mongoose.model().findOneAndUpdate).toHaveBeenCalledWith(
      { userId: '123' },
      { $inc: { testItem: 10 } },
      { upsert: true, new: true }
    );
  });

  it('should remove inventory', async () => {
    const mockResult = { userId: '123', item: 'testItem', amount: 5 };
    mongoose.model().findOneAndUpdate.mockResolvedValue(mockResult);

    const result = await InventoryService.removeInventory('123', 'testItem', 5);
    expect(result).toEqual(mockResult);
    expect(mongoose.model().findOneAndUpdate).toHaveBeenCalledWith(
      { userId: '123' },
      { $inc: { testItem: -5 } },
      { upsert: true, new: true }
    );
  });

  it('should fetch inventory for a user', async () => {
    const mockResult = { userId: '123', items: [] };
    mongoose.model().findOne.mockResolvedValue(mockResult);

    const result = await InventoryService.getInventory('123');
    expect(result).toEqual(mockResult);
    expect(mongoose.model().findOne).toHaveBeenCalledWith({userId: '123' });
  });

  it('should fetch all inventories for a guild', async () => {
    const mockResult = [{ userId: '123', items: [] }, { userId: '456', items: [] }];
    mongoose.model().find.mockResolvedValue(mockResult);

    const result = await InventoryService.getAllInventories();
    expect(result).toEqual(mockResult);
    expect(mongoose.model().find).toHaveBeenCalledWith({});
  });

  it('should reset inventory for a user', async () => {
    const mockResult = { deletedCount: 1 };
    mongoose.model().findOneAndDelete.mockResolvedValue(mockResult);

    const result = await InventoryService.resetInventory('123');
    expect(result).toEqual(mockResult);
    expect(mongoose.model().findOneAndDelete).toHaveBeenCalledWith({userId: '123' });
  });
});

afterAll(async () => {
    await mongoose.disconnect(); // Fecha a conexão com o MongoDB
  });
  
