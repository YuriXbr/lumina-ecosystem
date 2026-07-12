/**
 * __tests__/utils/identityValidation.test.js
 *
 * Suite para src/utils/identityValidation.js
 *
 * Testa:
 *   - validateUsernameSyntax: comprimento, chars, underscore, números
 *   - validateUsername: sintaxe + blacklist
 *   - validateDisplayName: zero-width chars, comprimento, visibilidade
 *   - normalizeUsername: lowercase
 *   - canChangeUsername / canChangeDisplayName: cooldowns
 *   - COOLDOWNS: 30d username, 24h displayName
 */

'use strict';

const {
    validateUsername, validateUsernameSyntax, validateDisplayName,
    normalizeUsername, canChangeUsername, canChangeDisplayName,
    COOLDOWNS, BLACKLIST,
} = require('../../src/utils/identityValidation');

beforeAll(() => {
    process.env.NODE_ENV = 'test';
});

// ─── COOLDOWNS ─────────────────────────────────────────────────────────────
describe('COOLDOWNS', () => {
    it('USERNAME é 30 dias em ms', () => {
        expect(COOLDOWNS.USERNAME).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it('DISPLAY_NAME é 24 horas em ms', () => {
        expect(COOLDOWNS.DISPLAY_NAME).toBe(24 * 60 * 60 * 1000);
    });
});

// ─── validateUsernameSyntax ────────────────────────────────────────────────
describe('validateUsernameSyntax', () => {
    it('válido: "joao123"', () => {
        expect(validateUsernameSyntax('joao123').valid).toBe(true);
    });

    it('válido: "user_name"', () => {
        expect(validateUsernameSyntax('user_name').valid).toBe(true);
    });

    it('válido: "Test"', () => {
        expect(validateUsernameSyntax('Test').valid).toBe(true);
    });

    it('inválido: muito curto (< 4)', () => {
        const r = validateUsernameSyntax('abc');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/4 e 16/);
    });

    it('inválido: muito longo (> 16)', () => {
        const r = validateUsernameSyntax('abcdefghijklmnopqr');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/4 e 16/);
    });

    it('inválido: caracteres especiais', () => {
        const r = validateUsernameSyntax('user@name');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/apenas letras/);
    });

    it('inválido: começa com _', () => {
        const r = validateUsernameSyntax('_maria');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/começar ou terminar com underscore/);
    });

    it('inválido: termina com _', () => {
        const r = validateUsernameSyntax('maria_');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/começar ou terminar com underscore/);
    });

    it('inválido: dois underscores seguidos', () => {
        const r = validateUsernameSyntax('maria__joao');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/dois underscores seguidos/);
    });

    it('inválido: apenas números', () => {
        const r = validateUsernameSyntax('123456');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/apenas números/);
    });

    it('inválido: começa com número', () => {
        const r = validateUsernameSyntax('123abc');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/começar com uma letra/);
    });

    it('inválido: não é string', () => {
        const r = validateUsernameSyntax(123);
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/texto/);
    });

    it('inválido: null', () => {
        const r = validateUsernameSyntax(null);
        expect(r.valid).toBe(false);
    });

    it('inválido: undefined', () => {
        const r = validateUsernameSyntax(undefined);
        expect(r.valid).toBe(false);
    });
});

// ─── validateUsername (sintaxe + blacklist) ────────────────────────────────
describe('validateUsername', () => {
    it('válido: "joao123"', () => {
        expect(validateUsername('joao123').valid).toBe(true);
    });

    it('inválido: blacklisted "admin"', () => {
        const r = validateUsername('admin');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/não está disponível/);
    });

    it('inválido: blacklisted "lumina"', () => {
        const r = validateUsername('lumina');
        expect(r.valid).toBe(false);
    });

    it('inválido: blacklisted "discord"', () => {
        const r = validateUsername('discord');
        expect(r.valid).toBe(false);
    });

    it('inválido: blacklisted "riot"', () => {
        const r = validateUsername('riot');
        expect(r.valid).toBe(false);
    });

    it('inválido: blacklisted "support"', () => {
        const r = validateUsername('support');
        expect(r.valid).toBe(false);
    });

    it('BLACKLIST inclui "lumina"', () => {
        expect(BLACKLIST.has('lumina')).toBe(true);
    });

    it('BLACKLIST inclui "discord"', () => {
        expect(BLACKLIST.has('discord')).toBe(true);
    });

    it('válido: "lumina_fan" (substring mas não palavra isolada)', () => {
        // Audit #14: "lumina_fan" NÃO é mais bloqueado por substring
        // porque underscore é word-char em JS regex
        expect(validateUsername('lumina_fan').valid).toBe(true);
    });

    it('válido: "illumina" (substring mas não palavra isolada)', () => {
        expect(validateUsername('illumina').valid).toBe(true);
    });

    it('inválido: falha sintaxe primeiro (curto)', () => {
        const r = validateUsername('ab');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/4 e 16/);
    });
});

// ─── validateDisplayName ───────────────────────────────────────────────────
describe('validateDisplayName', () => {
    it('válido: "João Silva"', () => {
        const r = validateDisplayName('João Silva');
        expect(r.valid).toBe(true);
        expect(r.sanitized).toBe('João Silva');
    });

    it('válido: "Maria"', () => {
        expect(validateDisplayName('Maria').valid).toBe(true);
    });

    it('válido: com emoji', () => {
        expect(validateDisplayName('João 🎮').valid).toBe(true);
    });

    it('válido: com acentos', () => {
        expect(validateDisplayName('São Paulo').valid).toBe(true);
    });

    it('inválido: vazio', () => {
        const r = validateDisplayName('');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/vazio/);
    });

    it('inválido: apenas espaços', () => {
        const r = validateDisplayName('   ');
        expect(r.valid).toBe(false);
    });

    it('inválido: > 32 chars', () => {
        const r = validateDisplayName('a'.repeat(33));
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/32 caracteres/);
    });

    it('válido: exatamente 32 chars', () => {
        expect(validateDisplayName('a'.repeat(32)).valid).toBe(true);
    });

    it('inválido: apenas underscores', () => {
        const r = validateDisplayName('___');
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/caracteres válidos/);
    });

    it('sanitiza zero-width chars (U+200B)', () => {
        const r = validateDisplayName('Ad\u200Bmin');
        expect(r.valid).toBe(true);
        expect(r.sanitized).toBe('Admin'); // zero-width removido
    });

    it('sanitiza zero-width joiner (U+200D)', () => {
        const r = validateDisplayName('Tes\u200Dt');
        expect(r.valid).toBe(true);
        expect(r.sanitized).toBe('Test');
    });

    it('sanitiza BOM (U+FEFF)', () => {
        const r = validateDisplayName('\uFEFFHello');
        expect(r.valid).toBe(true);
        expect(r.sanitized).toBe('Hello');
    });

    it('sanitiza direction control chars (U+202A-U+202E)', () => {
        const r = validateDisplayName('Adm\u202Ein');
        expect(r.valid).toBe(true);
        expect(r.sanitized).toBe('Admin');
    });

    it('sanitiza combining chars invisíveis (U+2060-U+2069)', () => {
        const r = validateDisplayName('Adm\u2060in');
        expect(r.valid).toBe(true);
        expect(r.sanitized).toBe('Admin');
    });

    it('inválido: apenas zero-width chars (depois da sanitização fica vazio)', () => {
        const r = validateDisplayName('\u200B\u200C\u200D');
        expect(r.valid).toBe(false);
    });

    it('inválido: não é string', () => {
        const r = validateDisplayName(123);
        expect(r.valid).toBe(false);
    });

    it('sanitized preserva espaços nas bordas (trim é responsabilidade do caller)', () => {
        // validateDisplayName retorna sanitized SEM trim — o caller (rota)
        // faz .trim() ao armazenar. Isso é intentional para que o caller
        // veja exatamente o que foi sanitizado.
        const r = validateDisplayName('  João  ');
        expect(r.valid).toBe(true);
        expect(r.sanitized).toBe('  João  ');
    });
});

// ─── normalizeUsername ─────────────────────────────────────────────────────
describe('normalizeUsername', () => {
    it('converte para lowercase', () => {
        expect(normalizeUsername('JOAO')).toBe('joao');
    });

    it('preserva lowercase', () => {
        expect(normalizeUsername('joao')).toBe('joao');
    });

    it('null vira string vazia', () => {
        expect(normalizeUsername(null)).toBe('');
    });

    it('undefined vira string vazia', () => {
        expect(normalizeUsername(undefined)).toBe('');
    });
});

// ─── canChangeUsername ─────────────────────────────────────────────────────
describe('canChangeUsername', () => {
    it('pode mudar quando nunca mudou (null)', () => {
        const r = canChangeUsername(null);
        expect(r.canChange).toBe(true);
        expect(r.msRemaining).toBe(0);
        expect(r.nextChangeAt).toBeNull();
    });

    it('pode mudar quando última mudança foi há 31 dias', () => {
        const r = canChangeUsername(new Date(Date.now() - 31 * 24 * 60 * 60 * 1000));
        expect(r.canChange).toBe(true);
    });

    it('NÃO pode mudar quando mudou há 1 dia (cooldown 30d)', () => {
        const r = canChangeUsername(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000));
        expect(r.canChange).toBe(false);
        expect(r.msRemaining).toBeGreaterThan(0);
        expect(r.nextChangeAt).toBeInstanceOf(Date);
    });

    it('NÃO pode mudar quando mudou há 29 dias', () => {
        const r = canChangeUsername(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
        expect(r.canChange).toBe(false);
    });
});

// ─── canChangeDisplayName ──────────────────────────────────────────────────
describe('canChangeDisplayName', () => {
    it('pode mudar quando nunca mudou (null)', () => {
        const r = canChangeDisplayName(null);
        expect(r.canChange).toBe(true);
    });

    it('pode mudar quando última mudança foi há 25 horas', () => {
        const r = canChangeDisplayName(new Date(Date.now() - 25 * 60 * 60 * 1000));
        expect(r.canChange).toBe(true);
    });

    it('NÃO pode mudar quando mudou há 1 hora (cooldown 24h)', () => {
        const r = canChangeDisplayName(new Date(Date.now() - 1 * 60 * 60 * 1000));
        expect(r.canChange).toBe(false);
        expect(r.msRemaining).toBeGreaterThan(0);
    });

    it('NÃO pode mudar quando mudou há 23 horas', () => {
        const r = canChangeDisplayName(new Date(Date.now() - 23 * 60 * 60 * 1000));
        expect(r.canChange).toBe(false);
    });
});
