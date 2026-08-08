/**
 * __tests__/database-service-update.test.js
 *
 * Cobre a correção do bug crítico em DataBaseService.update(): antes,
 * passar um objeto sem operadores Mongo ($set, $inc...) para
 * findOneAndUpdate() fazia o MongoDB tratar o objeto como um documento de
 * SUBSTITUIÇÃO — apagando qualquer campo do documento original que não
 * estivesse presente no objeto passado. Isso afetava diretamente
 * GuildService.updateGuildData, BanListService.updateBan,
 * MuteListService.updateMute e WarnListService.update.
 */

// Variável prefixada com 'mock' para ser acessível dentro do factory do jest.mock()
// (restrição do babel-jest: somente variáveis com prefixo 'mock' são permitidas)
const mockDbModelInstance = {
    findOneAndUpdate: jest.fn(),
};

jest.mock('mongoose', () => ({
    connect: jest.fn().mockResolvedValue(true),
    connection: { readyState: 1 },
    model: jest.fn(() => mockDbModelInstance),
    models: {},
    Schema: class Schema { constructor() {} },
}));

const mongoose = require('mongoose');
const DatabaseService = require('../src/database/services/DataBaseService');

describe('DataBaseService.update — proteção contra substituição de documento', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DatabaseService('testmodel', { name: String });
        // mockDbModelInstance é a instância compartilhada retornada pelo mock do mongoose
    });

    it('envolve automaticamente em $set quando o chamador passa um objeto "cru" (sem operadores)', async () => {
        mockModel.findOneAndUpdate.mockResolvedValue({ ok: true });

        await service.update({ guildId: 'g1' }, { djEnabled: true, prefix: '!' });

        expect(mockDbModelInstance.findOneAndUpdate).toHaveBeenCalledWith(
            { guildId: 'g1' },
            { $set: { djEnabled: true, prefix: '!' } },
            { new: true }
        );
    });

    it('respeita operadores explícitos já enviados pelo chamador ($set)', async () => {
        mockModel.findOneAndUpdate.mockResolvedValue({ ok: true });

        await service.update({ guildId: 'g1' }, { $set: { prefix: '?' } });

        expect(mockDbModelInstance.findOneAndUpdate).toHaveBeenCalledWith(
            { guildId: 'g1' },
            { $set: { prefix: '?' } },
            { new: true }
        );
    });

    it('respeita operadores explícitos já enviados pelo chamador ($inc, $unset combinados)', async () => {
        mockModel.findOneAndUpdate.mockResolvedValue({ ok: true });

        await service.update({ userId: 'u1' }, { $inc: { keys: 1 }, $unset: { flag: '' } });

        expect(mockDbModelInstance.findOneAndUpdate).toHaveBeenCalledWith(
            { userId: 'u1' },
            { $inc: { keys: 1 }, $unset: { flag: '' } },
            { new: true }
        );
    });

    it('nunca chama findOneAndUpdate com um objeto sem operadores no nível superior', async () => {
        mockModel.findOneAndUpdate.mockResolvedValue({ ok: true });

        await service.update({ guildId: 'g1' }, { moderationChannelId: '123' });

        const [, updateArg] = mockModel.findOneAndUpdate.mock.calls[0];
        const hasBareTopLevelField = Object.keys(updateArg).some(k => !k.startsWith('$'));
        expect(hasBareTopLevelField).toBe(false);
    });
});
