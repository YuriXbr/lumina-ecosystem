/**
 * __tests__/utils/gachaService.test.js
 *
 * Suite para src/utils/gachaService.js
 *
 * Testa:
 *   - computeProbabilities: distribuição normalizada (soma=1)
 *   - pickRarity: seleciona raridade baseada em probabilidades
 *   - RARITY_ORDER: ordem das raridades
 *   - rollSkin: débito atômico, reembolso em falha
 *
 * NÃO testa: chamadas ao MongoDB (services são mockados)
 */

'use strict';

const { computeProbabilities, pickRarity, rollSkin, RARITY_ORDER } = require('../../src/utils/gachaService');

// Mock dos services
jest.mock('../../src/database/services/SkinService', () => ({
    getSkinsQuantity: jest.fn(),
    getSkinsId: jest.fn(),
    getSkinInfo: jest.fn(),
    addSkinToInventory: jest.fn(),
}));

jest.mock('../../src/database/services/UserInventoryService', () => ({
    spendKeyAndChest: jest.fn(),
    addInventory: jest.fn(),
}));

jest.mock('../../src/logger/logger', () => ({
    addLog: jest.fn(),
}));

const SkinService = require('../../src/database/services/SkinService');
const InventoryService = require('../../src/database/services/UserInventoryService');

beforeAll(() => {
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

// ─── RARITY_ORDER ──────────────────────────────────────────────────────────
describe('RARITY_ORDER', () => {
    it('tem 6 raridades na ordem correta', () => {
        expect(RARITY_ORDER).toEqual(['legacy', 'epic', 'legendary', 'ultimate', 'transcendent', 'mythic']);
    });
});

// ─── computeProbabilities ──────────────────────────────────────────────────
describe('computeProbabilities', () => {
    const sampleQuantities = {
        totalSkins: 1000,
        legacySkins: 500,
        epicSkins: 300,
        legendarySkins: 100,
        ultimateSkins: 50,
        transcendentSkins: 30,
        mythicSkins: 20,
    };

    it('soma de probabilidades é exatamente 1.0 para hextechChests', () => {
        const probs = computeProbabilities('hextechChests', sampleQuantities);
        const sum = Object.values(probs).reduce((a, b) => a + b, 0);
        expect(Math.abs(sum - 1.0)).toBeLessThan(1e-10);
    });

    it('soma de probabilidades é exatamente 1.0 para masterWorkChests', () => {
        const probs = computeProbabilities('masterWorkChests', sampleQuantities);
        const sum = Object.values(probs).reduce((a, b) => a + b, 0);
        expect(Math.abs(sum - 1.0)).toBeLessThan(1e-10);
    });

    it('todas as 6 raridades estão presentes', () => {
        const probs = computeProbabilities('hextechChests', sampleQuantities);
        for (const r of RARITY_ORDER) {
            expect(probs).toHaveProperty(r);
            expect(typeof probs[r]).toBe('number');
        }
    });

    it('lança erro quando totalSkins é 0', () => {
        expect(() => computeProbabilities('hextechChests', { ...sampleQuantities, totalSkins: 0 }))
            .toThrow(/Nenhuma skin/);
    });

    it('lança erro quando totalSkins é negativo', () => {
        expect(() => computeProbabilities('hextechChests', { ...sampleQuantities, totalSkins: -10 }))
            .toThrow();
    });

    it('masterwork tem MENOS legacy que hextech', () => {
        const hextech = computeProbabilities('hextechChests', sampleQuantities);
        const masterwork = computeProbabilities('masterWorkChests', sampleQuantities);
        expect(masterwork.legacy).toBeLessThan(hextech.legacy);
    });

    it('todas as probabilidades são >= 0', () => {
        const probs = computeProbabilities('hextechChests', sampleQuantities);
        for (const r of RARITY_ORDER) {
            expect(probs[r]).toBeGreaterThanOrEqual(0);
        }
    });
});

// ─── pickRarity ────────────────────────────────────────────────────────────
describe('pickRarity', () => {
    const probs = {
        legacy: 0.5,
        epic: 0.3,
        legendary: 0.15,
        ultimate: 0.04,
        transcendent: 0.005,
        mythic: 0.005,
    };

    it('retorna legacy quando random < 0.5', () => {
        expect(pickRarity(probs, 0.4)).toBe('legacy');
    });

    it('retorna epic quando 0.5 <= random < 0.8', () => {
        expect(pickRarity(probs, 0.6)).toBe('epic');
    });

    it('retorna legendary quando 0.8 <= random < 0.95', () => {
        expect(pickRarity(probs, 0.9)).toBe('legendary');
    });

    it('retorna mythic quando random próximo de 1.0', () => {
        expect(pickRarity(probs, 0.999)).toBe('mythic');
    });

    it('retorna legacy quando random = 0', () => {
        expect(pickRarity(probs, 0)).toBe('legacy');
    });

    it('distribuição estatística em 10000 amostras', () => {
        // Teste estatístico: em 10000 amostras, a distribuição deve ser próxima das probs
        const counts = { legacy: 0, epic: 0, legendary: 0, ultimate: 0, transcendent: 0, mythic: 0 };
        for (let i = 0; i < 10000; i++) {
            const r = pickRarity(probs);
            counts[r]++;
        }
        // legacy deve ser ~5000 (±500)
        expect(counts.legacy).toBeGreaterThan(4500);
        expect(counts.legacy).toBeLessThan(5500);
        // mythic deve ser ~50 (±30)
        expect(counts.mythic).toBeGreaterThan(20);
        expect(counts.mythic).toBeLessThan(100);
    });

    it('retorna null quando random > soma (gap)', () => {
        const partialProbs = { legacy: 0.5, epic: 0.3 }; // soma = 0.8
        expect(pickRarity(partialProbs, 0.9)).toBeNull();
    });
});

// ─── rollSkin ──────────────────────────────────────────────────────────────
describe('rollSkin', () => {
    const sampleQuantities = {
        totalSkins: 1000,
        legacySkins: 500,
        epicSkins: 300,
        legendarySkins: 100,
        ultimateSkins: 50,
        transcendentSkins: 30,
        mythicSkins: 20,
    };

    it('retorna null quando spendKeyAndChest retorna null (sem recursos)', async () => {
        InventoryService.spendKeyAndChest.mockResolvedValueOnce(null);

        const result = await rollSkin('user-1', 'hextechChests');

        expect(result).toBeNull();
        // NÃO deve chamar addSkinToInventory
        expect(SkinService.addSkinToInventory).not.toHaveBeenCalled();
    });

    it('retorna skin quando débito e sorteio são bem-sucedidos', async () => {
        InventoryService.spendKeyAndChest.mockResolvedValueOnce({ keys: 4, hextechChests: 9 });
        SkinService.getSkinsQuantity.mockResolvedValueOnce(sampleQuantities);
        SkinService.getSkinsId.mockResolvedValueOnce([1001, 1002, 1003]);
        SkinService.getSkinInfo.mockResolvedValueOnce({
            id: 1001, name: 'Cool Skin', rarity: 'epic',
            championId: 1, championName: 'Annie', isBase: false, isLegacy: false,
            skinLines: ['default'], splashPath: '/splash', loadScreenPath: '/load',
            tilePath: '/tile', uncenteredSplashPath: '/uncentered',
        });
        SkinService.addSkinToInventory.mockResolvedValueOnce({});

        const result = await rollSkin('user-1', 'hextechChests');

        expect(result).not.toBeNull();
        expect(result.skinId).toBe(1001);
        expect(result.skinName).toBe('Cool Skin');
        expect(result.rarity).toBeDefined();
        expect(SkinService.addSkinToInventory).toHaveBeenCalledWith('user-1', 1001, expect.any(String));
    });

    it('reembolsa chave+baú quando sorteio falha após débito', async () => {
        InventoryService.spendKeyAndChest.mockResolvedValueOnce({ keys: 4 }); // débito OK
        // addInventory DEVE retornar uma Promise (o código faz .catch())
        InventoryService.addInventory.mockResolvedValue({});
        SkinService.getSkinsQuantity.mockRejectedValueOnce(new Error('DB down'));

        await expect(rollSkin('user-1', 'hextechChests')).rejects.toThrow('DB down');

        // Reembolso: addInventory chamado 2x (1 key + 1 chest)
        expect(InventoryService.addInventory).toHaveBeenCalledWith('user-1', 'keys', 1);
        expect(InventoryService.addInventory).toHaveBeenCalledWith('user-1', 'hextechChests', 1);
    });

    it('aceita masterWorkChests', async () => {
        InventoryService.spendKeyAndChest.mockResolvedValueOnce({ keys: 4 });
        SkinService.getSkinsQuantity.mockResolvedValueOnce(sampleQuantities);
        SkinService.getSkinsId.mockResolvedValueOnce([2002]);
        SkinService.getSkinInfo.mockResolvedValueOnce({
            id: 2002, name: 'MW Skin', rarity: 'legendary',
            championId: 2, championName: 'Ashe', isBase: false, isLegacy: false,
            skinLines: [], splashPath: '', loadScreenPath: '', tilePath: '', uncenteredSplashPath: '',
        });
        SkinService.addSkinToInventory.mockResolvedValueOnce({});

        const result = await rollSkin('user-2', 'masterWorkChests');

        expect(result).not.toBeNull();
        expect(InventoryService.spendKeyAndChest).toHaveBeenCalledWith('user-2', 'masterWorkChests');
    });

    it('propaga erro quando addSkinToInventory falha (com reembolso)', async () => {
        InventoryService.spendKeyAndChest.mockResolvedValueOnce({ keys: 4 });
        InventoryService.addInventory.mockResolvedValue({}); // para o reembolso
        SkinService.getSkinsQuantity.mockResolvedValueOnce(sampleQuantities);
        SkinService.getSkinsId.mockResolvedValueOnce([1001]);
        SkinService.getSkinInfo.mockResolvedValueOnce({
            id: 1001, name: 'Skin', rarity: 'epic',
            championId: 1, championName: 'A', isBase: false, isLegacy: false,
            skinLines: [], splashPath: '', loadScreenPath: '', tilePath: '', uncenteredSplashPath: '',
        });
        SkinService.addSkinToInventory.mockRejectedValueOnce(new Error('inventory failed'));

        await expect(rollSkin('user-1', 'hextechChests')).rejects.toThrow();
        // Reembolso
        expect(InventoryService.addInventory).toHaveBeenCalledWith('user-1', 'keys', 1);
        expect(InventoryService.addInventory).toHaveBeenCalledWith('user-1', 'hextechChests', 1);
    });
});
