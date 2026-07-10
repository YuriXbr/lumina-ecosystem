/**
 * Utilitários de validação de identidade pública (username + displayName).
 *
 * Regras de username:
 *   - 4 a 16 caracteres
 *   - Apenas [A-Za-z0-9_]
 *   - Não pode começar ou terminar com _
 *   - Não pode conter __ (dois underscores seguidos)
 *   - Case-insensitive para unicidade, mas preserva a capitalização original
 *   - Não pode ser palavra reservada (lumina, luminabot, admin, etc) nem
 *     nome de empresa famosa (lista curável abaixo)
 *
 * Regras de displayName:
 *   - 1 a 32 caracteres
 *   - Não pode ser vazio
 *   - Pode conter espaços, acentos, emoji
 *   - Não pode ser igual ao username (evita confusão)
 */

'use strict';

// ─── Blacklist de usernames proibidos ─────────────────────────────────────────
// Comparação sempre feita em lower-case. Inclui:
//   - Marcas/empresas famosas (parcial — não exaustivo)
//   - Palavras reservadas do produto (lumina, admin, etc)
//   - Termos ofensivos comuns (lista mínima — ampliar conforme necessário)
const BLACKLIST = new Set([
    // Reservados do produto
    'lumina', 'luminabot', 'luminabots', 'luminasink', 'admin', 'administrator',
    'administrator', 'adminbot', 'staff', 'mod', 'moderator', 'moderation',
    'owner', 'bot', 'system', 'official', 'support', 'help', 'api', 'root',
    'superuser', 'dev', 'developer', 'test', 'tester', 'null', 'undefined',
    'true', 'false', 'anonymous', 'guest', 'user', 'users', 'profile', 'settings',
    'login', 'register', 'logout', 'dashboard', 'members', 'member',

    // Marcas/empresas famosas (parcial)
    'discord', 'google', 'microsoft', 'apple', 'amazon', 'meta', 'facebook',
    'instagram', 'whatsapp', 'telegram', 'twitter', 'x', 'youtube', 'netflix',
    'spotify', 'tiktok', 'snapchat', 'reddit', 'linkedin', 'github', 'gitlab',
    'steam', 'valve', 'riot', 'riotgames', 'leagueoflegends', 'lol', 'valorant',
    'minecraft', 'mojang', 'epic', 'epicgames', 'fortnite', 'nintendo', 'sony',
    'playstation', 'xbox', 'nvidia', 'amd', 'intel', 'samsung', 'huawei', 'xiaomi',
    'openai', 'chatgpt', 'claude', 'anthropic', 'tesla', 'spacex', 'paypal',
    'visa', 'mastercard', 'americanexpress', 'amex', 'ibm', 'oracle', 'sap',
    'salesforce', 'cloudflare', 'vercel', 'netlify', 'heroku', 'aws', 'azure',
    'gcp', 'googlecloud', 'dropbox', 'box', 'slack', 'teams', 'zoom', 'webex',
    // Variantes comuns de tentativa de se passar por marcas
    'discordbot', 'discordstaff', 'discorddev', 'discordsupport',
    'googlebot', 'googlestaff', 'microsoftbot',
]);

/**
 * Valida sintaxe do username (sem checar unicidade nem blacklist).
 * @returns {{valid: boolean, error?: string}}
 */
function validateUsernameSyntax(username) {
    if (typeof username !== 'string') {
        return { valid: false, error: 'Username deve ser texto.' };
    }
    if (username.length < 4 || username.length > 16) {
        return { valid: false, error: 'Username deve ter entre 4 e 16 caracteres.' };
    }
    if (!/^[A-Za-z0-9_]+$/.test(username)) {
        return { valid: false, error: 'Username deve conter apenas letras, números e underscore (_).' };
    }
    if (username.startsWith('_') || username.endsWith('_')) {
        return { valid: false, error: 'Username não pode começar ou terminar com underscore.' };
    }
    if (username.includes('__')) {
        return { valid: false, error: 'Username não pode conter dois underscores seguidos.' };
    }
    if (/^[0-9]+$/.test(username)) {
        return { valid: false, error: 'Username não pode ser apenas números.' };
    }
    if (/^[0-9_]/.test(username)) {
        return { valid: false, error: 'Username deve começar com uma letra.' };
    }
    return { valid: true };
}

/**
 * Valida username completo (sintaxe + blacklist).
 * NÃO checa unicidade — isso deve ser feito pelo service contra o banco.
 */
function validateUsername(username) {
    const syntax = validateUsernameSyntax(username);
    if (!syntax.valid) return syntax;

    const lower = username.toLowerCase();
    if (BLACKLIST.has(lower)) {
        return { valid: false, error: 'Este username não está disponível.' };
    }
    // Verifica se contém palavra blacklisted como substring (ex: "lumina_fan")
    for (const blocked of BLACKLIST) {
        if (blocked.length >= 5 && lower.includes(blocked)) {
            return { valid: false, error: 'Este username não está disponível.' };
        }
    }
    return { valid: true };
}

/**
 * Valida displayName.
 * Filtra zero-width chars e caracteres de controle que poderiam ser usados
 * para spoofing visual (ex: "Admin" com zero-width space no meio).
 */
function validateDisplayName(displayName) {
    if (typeof displayName !== 'string') {
        return { valid: false, error: 'Display name deve ser texto.' };
    }

    // Remove zero-width chars e caracteres de controle (exceto tab/newline normais)
    // Zero-width chars: U+200B (ZWSP), U+200C (ZWNJ), U+200D (ZWJ), U+FEFF (BOM/ZWNBSP)
    // Combining chars invisíveis: U+2060 (WJ), U+2061-U+2064, U+2066-U+2069
    // Direção control chars: U+202A-U+202E, U+2066-U+2069 (podem inverter texto)
    const sanitized = displayName.replace(/[\u200B-\u200D\uFEFF\u2060-\u2069\u202A-\u202E\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

    const trimmed = sanitized.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'Display name não pode ser vazio.' };
    }
    if (trimmed.length > 32) {
        return { valid: false, error: 'Display name deve ter no máximo 32 caracteres.' };
    }
    // Não pode ser apenas espaços/underscores
    if (/^[\s_]+$/.test(trimmed)) {
        return { valid: false, error: 'Display name deve conter caracteres válidos.' };
    }
    // Não pode conter apenas zero-width (já filtrado, mas checa se sobrou algo visível)
    if (!trimmed.replace(/\s/g, '').length) {
        return { valid: false, error: 'Display name deve conter caracteres visíveis.' };
    }
    return { valid: true };
}

/**
 * Sanitiza username para armazenar a forma lower-case (busca case-insensitive).
 */
function normalizeUsername(username) {
    return (username || '').toLowerCase();
}

/**
 * Cooldowns em milissegundos.
 */
const COOLDOWNS = {
    USERNAME: 30 * 24 * 60 * 60 * 1000,    // 30 dias
    DISPLAY_NAME: 24 * 60 * 60 * 1000,      // 24 horas
};

/**
 * Verifica se o usuário pode alterar o username agora.
 * @returns {{canChange: boolean, nextChangeAt: Date|null, msRemaining: number}}
 */
function canChangeUsername(usernameChangedAt) {
    if (!usernameChangedAt) return { canChange: true, nextChangeAt: null, msRemaining: 0 };
    const elapsed = Date.now() - new Date(usernameChangedAt).getTime();
    const msRemaining = Math.max(0, COOLDOWNS.USERNAME - elapsed);
    return {
        canChange: msRemaining === 0,
        nextChangeAt: msRemaining > 0 ? new Date(Date.now() + msRemaining) : null,
        msRemaining,
    };
}

function canChangeDisplayName(displayNameChangedAt) {
    if (!displayNameChangedAt) return { canChange: true, nextChangeAt: null, msRemaining: 0 };
    const elapsed = Date.now() - new Date(displayNameChangedAt).getTime();
    const msRemaining = Math.max(0, COOLDOWNS.DISPLAY_NAME - elapsed);
    return {
        canChange: msRemaining === 0,
        nextChangeAt: msRemaining > 0 ? new Date(Date.now() + msRemaining) : null,
        msRemaining,
    };
}

module.exports = {
    validateUsername,
    validateUsernameSyntax,
    validateDisplayName,
    normalizeUsername,
    canChangeUsername,
    canChangeDisplayName,
    COOLDOWNS,
    BLACKLIST,
};
