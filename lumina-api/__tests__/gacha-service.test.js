/**
 * __tests__/gacha-service.test.js
 *
 * Cobre src/utils/gachaService.js:
 *   - computeProbabilities / pickRarity (funções puras)
 *   - rollSkin(): fluxo feliz, insuficiência de recursos (sem double-spend),
 *     e rollback (devolução de chave/baú) quando o sorteio falha depois do débito.
 */

jest.mock('../src/database/services/UserInventoryService', () => ({
    spendKeyAndChest: jest.fn(),
    addInventory: jest.fn().mockResolvedValue({}),
}));

jest.mock('../src/database/services/SkinService', () => ({
    getSkinsQuantity: jest.fn(),
    getSkinsId: jest.fn(),
    getSkinInfo: jest.fn(),
    addSkinToInventory: jest.fn(),
}));

jest.mock('../src/logger/logger', () => ({
    addLog: jest.fn(),
    routeError: jest.fn(),
    sendErrorEmbed: jest.fn(),
    forceSendLogs: jest.fn(),
    requestLogger: jest.fn(() => (req, res, next) => next()),
}));

const InventoryService = require('../src/database/services/UserInventoryService');
const SkinService = require('../src/database/services/SkinService');
const { rollSkin, computeProbabilities, pickRarity, RARITY_ORDER } = require('../src/utils/gachaService');

beforeEach(() => jest.clearAllMocks());

describe('computeProbabilities', () => {
    const baseQuantities = {
        totalSkins: 1000,
        legacySkins: 400,
        epicSkins: 300,
        legendarySkins: 150,
        ultimateSkins: 100,
        transcendentSkins: 20,
        mythicSkins: 10,
    };

    it('lança erro quando totalSkins é 0 (evita NaN/Infinity nas probabilidades)', () => {
        expect(() => computeProbabilities('hextechChests', { ...baseQuantities, totalSkins: 0 }))
            .toThrow(/totalSkins/);
    });

    it('calcula probabilidades diferentes para hextechChests e masterWorkChests', () => {
        const hextech = computeProbabilities('hextechChests', baseQuantities);
        const masterwork = computeProbabilities('masterWorkChests', baseQuantities);
        expect(hextech.epic).not.toEqual(masterwork.epic);
    });
});

describe('pickRarity', () => {
    it('respeita a ordem cumulativa e escolhe a primeira faixa em que o random cai', () => {
        const probs = { legacy: 0.5, epic: 0.5, legendary: 0, ultimate: 0, transcendent: 0, mythic: 0 };
        expect(pickRarity(probs, 0.1)).toBe('legacy');
        expect(pickRarity(probs, 0.6)).toBe('epic');
    });

    it('retorna null se nenhuma faixa cobrir o valor sorteado', () => {
        const probs = { legacy: 0.1, epic: 0, legendary: 0, ultimate: 0, transcendent: 0, mythic: 0 };
        expect(pickRarity(probs, 0.99)).toBeNull();
    });

    it('RARITY_ORDER contém todas as raridades exatamente uma vez', () => {
        expect(new Set(RARITY_ORDER).size).toBe(RARITY_ORDER.length);
        expect(RARITY_ORDER).toEqual(expect.arrayContaining(['legacy', 'epic', 'legendary', 'ultimate', 'transcendent', 'mythic']));
    });
});

describe('rollSkin — fluxo feliz', () => {
    it('debita atomicamente via spendKeyAndChest e retorna os dados da skin', async () => {
        InventoryService.spendKeyAndChest.mockResolvedValue({ userId: 'u1', keys: 4, hextechChests: 2 });
        SkinService.getSkinsQuantity.mockResolvedValue({
            totalSkins: 100, legacySkins: 100, epicSkins: 0, legendarySkins: 0,
            ultimateSkins: 0, transcendentSkins: 0, mythicSkins: 0,
        });
        SkinService.getSkinsId.mockResolvedValue([42]);
        SkinService.getSkinInfo.mockResolvedValue({ id: 42, name: 'Skin Teste', championId: 'Ahri' });
        SkinService.addSkinToInventory.mockResolvedValue(true);

        const result = await rollSkin('u1', 'hextechChests');

        expect(InventoryService.spendKeyAndChest).toHaveBeenCalledWith('u1', 'hextechChests');
        expect(result).toMatchObject({ skinId: 42, skinName: 'Skin Teste' });
        expect(SkinService.addSkinToInventory).toHaveBeenCalledWith('u1', 42, undefined);
    });
});

describe('rollSkin — sem recursos suficientes (proteção contra double-spend)', () => {
    it('retorna null e NÃO consulta skins quando spendKeyAndChest não encontra saldo', async () => {
        // Simula a operação atômica condicional não encontrando um documento
        // que satisfaça { keys: >=1, [chest]: >=1 } — equivalente a uma
        // segunda requisição concorrente chegando tarde demais.
        InventoryService.spendKeyAndChest.mockResolvedValue(null);

        const result = await rollSkin('u1', 'hextechChests');

        expect(result).toBeNull();
        expect(SkinService.getSkinsQuantity).not.toHaveBeenCalled();
        expect(SkinService.addSkinToInventory).not.toHaveBeenCalled();
    });
});

describe('rollSkin — rollback em caso de falha após o débito', () => {
    it('devolve a chave e o baú debitados se o sorteio falhar depois do débito atômico', async () => {
        InventoryService.spendKeyAndChest.mockResolvedValue({ userId: 'u1', keys: 4, hextechChests: 2 });
        SkinService.getSkinsQuantity.mockResolvedValue({
            totalSkins: 100, legacySkins: 0, epicSkins: 0, legendarySkins: 0,
            ultimateSkins: 0, transcendentSkins: 0, mythicSkins: 0,
        });
        // Nenhuma raridade sorteável -> força o branch de erro após o débito já ter ocorrido.

        await expect(rollSkin('u1', 'hextechChests')).rejects.toThrow();

        expect(InventoryService.addInventory).toHaveBeenCalledWith('u1', 'keys', 1);
        expect(InventoryService.addInventory).toHaveBeenCalledWith('u1', 'hextechChests', 1);
    });
});
