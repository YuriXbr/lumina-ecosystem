/**
 * __tests__/gacha-service.test.js
 *
 * Cobre src/utils/gachaService.js:
 *   - computeProbabilities / pickRarity (funções puras)
 *   - rollSkin(): fluxo feliz, insuficiência de recursos (sem double-spend),
 *     e falhas de seleção antes de qualquer alteração do inventário.
 */

jest.mock('../src/database/services/UserInventoryService', () => ({
    awardSkinAndSpend: jest.fn(),
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

beforeEach(() => {
    jest.resetAllMocks();
    SkinService.getSkinsQuantity.mockResolvedValue({ totalSkins:100, legacySkins:100, epicSkins:0, legendarySkins:0, ultimateSkins:0, transcendentSkins:0, mythicSkins:0 });
    SkinService.getSkinsId.mockResolvedValue([42]);
    SkinService.getSkinInfo.mockResolvedValue({ id:42, name:'Skin Teste', championId:'Ahri' });
});

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
    it('debita atomicamente junto com a recompensa e retorna os dados da skin', async () => {
        InventoryService.awardSkinAndSpend.mockResolvedValue({ userId: 'u1', keys: 4, hextechChests: 2 });
        SkinService.getSkinsQuantity.mockResolvedValue({
            totalSkins: 100, legacySkins: 100, epicSkins: 0, legendarySkins: 0,
            ultimateSkins: 0, transcendentSkins: 0, mythicSkins: 0,
        });
        SkinService.getSkinsId.mockResolvedValue([42]);
        SkinService.getSkinInfo.mockResolvedValue({ id: 42, name: 'Skin Teste', championId: 'Ahri' });
        SkinService.addSkinToInventory.mockResolvedValue(true);

        const result = await rollSkin('u1', 'hextechChests');

        expect(InventoryService.awardSkinAndSpend).toHaveBeenCalledWith('u1', 'hextechChests', 42);
        expect(result).toMatchObject({ skinId: 42, skinName: 'Skin Teste' });
        expect(SkinService.addSkinToInventory).not.toHaveBeenCalled();
    });
});

describe('rollSkin — sem recursos suficientes (proteção contra double-spend)', () => {
    it('retorna null sem conceder skin se o saldo mudou durante a seleção', async () => {
        // Simula a operação atômica condicional não encontrando um documento
        // que satisfaça { keys: >=1, [chest]: >=1 } — equivalente a uma
        // segunda requisição concorrente chegando tarde demais.
        InventoryService.awardSkinAndSpend.mockResolvedValue(null);

        const result = await rollSkin('u1', 'hextechChests');

        expect(result).toBeNull();
        expect(InventoryService.awardSkinAndSpend).toHaveBeenCalledTimes(1);
        expect(SkinService.addSkinToInventory).not.toHaveBeenCalled();
    });
});

describe('rollSkin — falha antes da gravação', () => {
    it('não debita nem reembolsa se não houver raridade sorteável', async () => {
        InventoryService.awardSkinAndSpend.mockResolvedValue({ userId: 'u1', keys: 4, hextechChests: 2 });
        SkinService.getSkinsQuantity.mockResolvedValue({
            totalSkins: 100, legacySkins: 0, epicSkins: 0, legendarySkins: 0,
            ultimateSkins: 0, transcendentSkins: 0, mythicSkins: 0,
        });
        // Sem raridade sorteável, a operação de débito e prêmio não é iniciada.

        await expect(rollSkin('u1', 'hextechChests')).rejects.toThrow();

        expect(InventoryService.addInventory).not.toHaveBeenCalled();
        expect(InventoryService.awardSkinAndSpend).not.toHaveBeenCalled();
    });
});
