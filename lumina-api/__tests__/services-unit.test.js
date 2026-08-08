/**
 * __tests__/services-unit.test.js
 *
 * Testes unitários para os database services:
 *   DashboardAccountService
 *   UserInventoryService (claimDaily, getDailyStatus)
 *   SkinService (getSkinsId, getSkinInfo)
 *   ChampionsService / SkinlinesService / UniversesService / SkinsIdListService (bulkWrite)
 */

// ─── Mocks de infraestrutura ───────────────────────────────────────────────────

jest.mock('mongoose', () => {
    const actualMongoose = jest.requireActual('mongoose');

    // Modelo genérico mockado
    const mockModel = {
        findOne: jest.fn(),
        find: jest.fn(),
        findOneAndUpdate: jest.fn(),
        findOneAndDelete: jest.fn(),
        create: jest.fn(),
        deleteOne: jest.fn(),
        countDocuments: jest.fn(),
        exists: jest.fn(),
        bulkWrite: jest.fn(),
    };

    return {
        ...actualMongoose,
        connect: jest.fn().mockResolvedValue(true),
        connection: { readyState: 1 },
        model: jest.fn(() => mockModel),
        models: {},
        Schema: actualMongoose.Schema,
    };
});

jest.mock('../src/logger/logger', () => ({
    addLog: jest.fn(),
    routeError: jest.fn(),
    sendErrorEmbed: jest.fn(),
    forceSendLogs: jest.fn(),
    requestLogger: jest.fn(() => (req, res, next) => next()),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { addLog } = require('../src/logger/logger');

// Referência ao mock do modelo, acessível via mongoose.model()
const mockModel = mongoose.model();

beforeEach(() => jest.clearAllMocks());

// ─── DashboardAccountService ──────────────────────────────────────────────────

describe('DashboardAccountService', () => {
    let service;

    beforeEach(() => {
        jest.resetModules();
        jest.mock('mongoose', () => {
            const mModel = {
                findOne: jest.fn(),
                find: jest.fn(),
                findOneAndUpdate: jest.fn(),
                create: jest.fn(),
                deleteOne: jest.fn(),
                countDocuments: jest.fn(),
                exists: jest.fn(),
                bulkWrite: jest.fn(),
            };
            return {
                connect: jest.fn().mockResolvedValue(true),
                connection: { readyState: 1 },
                model: jest.fn(() => mModel),
                models: {},
                Schema: class Schema { constructor() {} },
            };
        });

        jest.mock('../src/logger/logger', () => ({
            addLog: jest.fn(),
            routeError: jest.fn(),
            sendErrorEmbed: jest.fn(),
            forceSendLogs: jest.fn(),
        }));

        service = require('../src/database/services/DashboardAccountService');
    });

    describe('getDashboardAccountByEmail', () => {
        it('lança erro para email inválido sem @', async () => {
            await expect(service.getDashboardAccountByEmail('nao-e-email')).rejects.toThrow();
        });

        it('lança erro para email inválido sem domínio', async () => {
            await expect(service.getDashboardAccountByEmail('user@')).rejects.toThrow();
        });

        it('aceita email válido', async () => {
            service.model.findOne.mockReturnValueOnce({ lean: () => ({ email: 'ok@test.com' }) });
            await expect(service.getDashboardAccountByEmail('ok@test.com')).resolves.not.toThrow();
        });
    });

    describe('_validatePasswordStrength', () => {
        it('rejeita senha vazia', () => {
            expect(() => service._validatePasswordStrength('')).toThrow();
        });

        it('rejeita senha muito curta', () => {
            expect(() => service._validatePasswordStrength('Ab1')).toThrow();
        });

        it('rejeita senha acima de 128 chars', () => {
            expect(() => service._validatePasswordStrength('Aa1' + 'x'.repeat(126))).toThrow();
        });

        it('rejeita senha sem número', () => {
            expect(() => service._validatePasswordStrength('SoLetrasSemNum')).toThrow();
        });

        it('rejeita senha sem maiúscula', () => {
            expect(() => service._validatePasswordStrength('soletras123')).toThrow();
        });

        it('aceita senha forte', () => {
            expect(() => service._validatePasswordStrength('Senha123')).not.toThrow();
        });
    });

    describe('checkCredentials', () => {
        it('lança INVALID_CREDENTIALS para conta inexistente', async () => {
            service.model.findOne.mockReturnValueOnce({ lean: () => null });

            const err = await service.checkCredentials('x@x.com', 'pass').catch(e => e);
            expect(err.code).toBe('INVALID_CREDENTIALS');
        });

        it('lança OAUTH_ONLY para conta sem senha', async () => {
            service.model.findOne.mockReturnValueOnce({
                lean: () => ({ email: 'x@x.com', password: '' }),
            });

            const err = await service.checkCredentials('x@x.com', 'pass').catch(e => e);
            expect(err.code).toBe('OAUTH_ONLY');
        });
    });
});

// ─── UserInventoryService ─────────────────────────────────────────────────────

describe('UserInventoryService', () => {
    let service;
    let mockInventoryModel;

    beforeEach(() => {
        jest.resetModules();

        mockInventoryModel = {
            findOne: jest.fn(),
            find: jest.fn(),
            findOneAndUpdate: jest.fn(),
            findOneAndDelete: jest.fn(),
            create: jest.fn(),
            deleteOne: jest.fn(),
            countDocuments: jest.fn(),
            bulkWrite: jest.fn(),
        };

        jest.mock('mongoose', () => ({
            connect: jest.fn().mockResolvedValue(true),
            connection: { readyState: 1 },
            model: jest.fn(() => mockInventoryModel),
            models: {},
            Schema: class Schema { constructor() {} },
        }));

        jest.mock('../src/logger/logger', () => ({
            addLog: jest.fn(),
            routeError: jest.fn(),
            sendErrorEmbed: jest.fn(),
            forceSendLogs: jest.fn(),
        }));

        service = require('../src/database/services/UserInventoryService');
        service.model = mockInventoryModel;
    });

    describe('claimDaily', () => {
        it('retorna claimed=false dentro do cooldown de 24h', async () => {
            const future = new Date(Date.now() + 23 * 60 * 60 * 1000);
            mockInventoryModel.findOne.mockResolvedValueOnce({
                nextDailyReward: future,
                dailyRewardStreak: 3,
            });

            const result = await service.claimDaily('user-001');
            expect(result.claimed).toBe(false);
            expect(result.nextDailyReward).toEqual(future);
        });

        it('retorna claimed=true e incrementa streak quando disponível', async () => {
            const past = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h atrás (dentro da janela de streak)
            mockInventoryModel.findOne.mockResolvedValueOnce({
                nextDailyReward: past,
                dailyRewardClaim: past,
                dailyRewardStreak: 2,
            });
            mockInventoryModel.findOneAndUpdate.mockResolvedValueOnce({
                hextechChests: 13,
                keys: 3,
                dailyRewardStreak: 3,
            });

            const result = await service.claimDaily('user-001');
            expect(result.claimed).toBe(true);
            expect(result.streak).toBe(3);
            expect(result.reward.hextechChests).toBe(3);
            expect(result.reward.keys).toBe(1);
        });

        it('reseta streak para 1 quando fora da janela de 48h', async () => {
            const longAgo = new Date(Date.now() - 49 * 60 * 60 * 1000); // 49h atrás
            mockInventoryModel.findOne.mockResolvedValueOnce({
                nextDailyReward: new Date(Date.now() - 1000), // já venceu
                dailyRewardClaim: longAgo,
                dailyRewardStreak: 5,
            });
            mockInventoryModel.findOneAndUpdate.mockResolvedValueOnce({ dailyRewardStreak: 1 });

            const result = await service.claimDaily('user-002');
            expect(result.streak).toBe(1);
        });

        it('cria inventário novo quando não existe', async () => {
            mModel.findOne.mockResolvedValueOnce(null); // sem inventário
            mModel.create.mockResolvedValueOnce({ userId: 'new-user', nextDailyReward: null });
            mockInventoryModel.findOneAndUpdate.mockResolvedValueOnce({ dailyRewardStreak: 1 });

            const result = await service.claimDaily('new-user');
            expect(mModel.create).toHaveBeenCalledWith({ userId: 'new-user' });
            expect(result.claimed).toBe(true);
        });

        it('chama addLog ao resgatar com sucesso', async () => {
            const { addLog: mockAddLog } = require('../src/logger/logger');
            mModel.findOne.mockResolvedValueOnce(null);
            mModel.create.mockResolvedValueOnce({ userId: 'u1', nextDailyReward: null });
            mockInventoryModel.findOneAndUpdate.mockResolvedValueOnce({ dailyRewardStreak: 1 });

            await service.claimDaily('u1');
            expect(mockAddLog).toHaveBeenCalledWith('DB', 'inventory.daily', expect.stringContaining('u1'));
        });
    });

    describe('getDailyStatus', () => {
        it('retorna available=true quando nextDailyReward está no passado', async () => {
            mockInventoryModel.findOne.mockResolvedValueOnce({
                nextDailyReward: new Date(Date.now() - 1000),
                dailyRewardStreak: 4,
            });

            const status = await service.getDailyStatus('user-003');
            expect(status.available).toBe(true);
            expect(status.streak).toBe(4);
        });

        it('retorna available=false quando nextDailyReward está no futuro', async () => {
            mockInventoryModel.findOne.mockResolvedValueOnce({
                nextDailyReward: new Date(Date.now() + 10 * 60 * 1000),
                dailyRewardStreak: 2,
            });

            const status = await service.getDailyStatus('user-004');
            expect(status.available).toBe(false);
        });

        it('retorna available=true quando inventário não existe', async () => {
            mModel.findOne.mockResolvedValueOnce(null);

            const status = await service.getDailyStatus('user-005');
            expect(status.available).toBe(true);
            expect(status.streak).toBe(0);
        });
    });
});

// ─── SkinService.getSkinsId ───────────────────────────────────────────────────

describe('SkinService.getSkinsId', () => {
    let service;
    let mModel;

    beforeEach(() => {
        jest.resetModules();

        mModel = {
            findOne: jest.fn(),
            find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
            findOneAndUpdate: jest.fn(),
            create: jest.fn(),
            bulkWrite: jest.fn(),
        };

        jest.mock('mongoose', () => ({
            connect: jest.fn().mockResolvedValue(true),
            connection: { readyState: 1 },
            model: jest.fn(() => mModel),
            models: {},
            Schema: class Schema { constructor() {} },
        }));

        jest.mock('../src/logger/logger', () => ({
            addLog: jest.fn(),
            routeError: jest.fn(),
            sendErrorEmbed: jest.fn(),
            forceSendLogs: jest.fn(),
        }));

        // Mocks de dependências internas do SkinService
        jest.mock('../src/database/services/UserInventoryService', () => ({ getInventory: jest.fn(), update: jest.fn(), create: jest.fn() }));
        jest.mock('../src/database/services/SkinsIdListService', () => ({
            get: jest.fn(),
            getOne: jest.fn(),
        }));

        service = require('../src/database/services/SkinService');
        service.model = mModel;
    });

    it('retorna array vazio quando não há skins', async () => {
        mModel.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) });
        const result = await service.getSkinsId('epic');
        expect(result).toEqual([]);
    });

    it('retorna todos os grupos quando rarity não é passado', async () => {
        mModel.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([
            { epicQuantity: 2, epic: [{ id: 1 }, { id: 2 }], legacyQuantity: 0, legendaryQuantity: 0, ultimateQuantity: 0, transcendentQuantity: 0, mythicQuantity: 0 }
        ]) });
        const result = await service.getSkinsId();
        expect(result).toHaveProperty('epic');
        expect(result).toHaveProperty('legendary');
        expect(result.epic).toEqual([1, 2]);
    });

    it('normaliza campos de raridade que são objeto ({}) para array vazio', async () => {
        // Documentos legados com {} em vez de []
        mModel.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([
            { epicQuantity: 1, epic: {}, legacyQuantity: 0, legendaryQuantity: 0, ultimateQuantity: 0, transcendentQuantity: 0, mythicQuantity: 0 }
        ]) });
        const result = await service.getSkinsId('epic');
        expect(result).toEqual([]); // epic={} → asArray([]) → []
    });
});

// ─── BulkWrite services ───────────────────────────────────────────────────────

describe.each([
    ['ChampionsService', '../src/database/services/ChampionsService', 'updateChampionsDatabase', [{ championId: 'Aatrox', championName: 'Aatrox', updatePatch: '14.1' }]],
    ['SkinlinesService', '../src/database/services/SkinlinesService', 'updateSkinlinesDatabase', [{ id: 1, name: 'Arcade', description: 'Arcade skins', updatePatch: '14.1' }]],
    ['UniversesService', '../src/database/services/UniversesService', 'updateUniversesDatabase', [{ id: 1, name: 'Runeterra', description: 'Main universe', updatePatch: '14.1' }]],
    ['SkinsIdListService', '../src/database/services/SkinsIdListService', 'updateSkinIdList', [{ id: 1001, name: 'Default Aatrox', championId: 'Aatrox', championName: 'Aatrox', updatePatch: '14.1' }]],
])('%s.%s', (serviceName, path, method, sampleData) => {
    let service;
    let mModel;

    beforeEach(() => {
        jest.resetModules();

        mModel = {
            findOne: jest.fn(),
            find: jest.fn(),
            findOneAndUpdate: jest.fn(),
            create: jest.fn(),
            bulkWrite: jest.fn().mockResolvedValue({ upsertedCount: 1, modifiedCount: 0 }),
        };

        jest.mock('mongoose', () => ({
            connect: jest.fn().mockResolvedValue(true),
            connection: { readyState: 1 },
            model: jest.fn(() => mModel),
            models: {},
            Schema: class Schema { constructor() {} },
        }));

        jest.mock('../src/logger/logger', () => ({
            addLog: jest.fn(),
            routeError: jest.fn(),
            sendErrorEmbed: jest.fn(),
            forceSendLogs: jest.fn(),
        }));

        service = require(path);
        service.model = mModel;
    });

    it('chama bulkWrite com upsert correto', async () => {
        await service[method](sampleData);
        expect(mModel.bulkWrite).toHaveBeenCalledTimes(1);
        const ops = mModel.bulkWrite.mock.calls[0][0];
        expect(ops[0]).toHaveProperty('updateOne');
        expect(ops[0].updateOne.update).toHaveProperty('$set');
        expect(ops[0].updateOne.upsert).toBe(true);
    });

    it('chama addLog após sucesso', async () => {
        const { addLog: mockAddLog } = require('../src/logger/logger');
        await service[method](sampleData);
        expect(mockAddLog).toHaveBeenCalledWith('DB', expect.stringContaining('.update'), expect.any(String));
    });

    it('repropaga erro em caso de falha no bulkWrite', async () => {
        mModel.bulkWrite.mockRejectedValueOnce(new Error('DB write failed'));
        await expect(service[method](sampleData)).rejects.toThrow('DB write failed');
    });
});
