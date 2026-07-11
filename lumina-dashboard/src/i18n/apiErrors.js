/**
 * Mapeia códigos de erro da API (campo `code` retornado pela API em respostas
 * de erro) para mensagens traduzidas.
 *
 * A API sempre retorna `{ error: <mensagem PT>, code: <CODE> }` em erros.
 * Em vez de traduzir no servidor (que exigiria header Accept-Language e
 * manutenção duplicada), o dashboard mapeia o `code` para uma chave de
 * tradução. Se o código não estiver mapeado, cai no fallback genérico.
 */

import { getTranslator } from './index.js';

// Mapa: API error code → i18n key
const ERROR_CODE_MAP = {
    // Auth
    MISSING_TOKEN:           'apiError.missingToken',
    INVALID_TOKEN:           'apiError.invalidToken',
    TOKEN_EXPIRED:           'apiError.tokenExpired',
    ACCOUNT_NOT_FOUND:       'apiError.accountNotFound',
    ACCOUNT_BANNED:          'apiError.accountBanned',
    ACCOUNT_BLOCKED:         'apiError.accountBlocked',
    ACCOUNT_SUSPENDED:       'apiError.accountSuspended',
    INSUFFICIENT_PERMISSION: 'apiError.insufficientPermission',

    // Validation
    MISSING_PARAMS:          'apiError.missingParams',
    INVALID_FIELD_TYPE:      'apiError.invalidFieldType',
    INVALID_GUILD_ID:        'apiError.invalidGuildId',
    INVALID_LANGUAGE:        'apiError.invalidLanguage',
    INVALID_TIMEZONE:        'apiError.invalidTimezone',

    // Conflict
    GUILD_ALREADY_EXISTS:    'apiError.guildAlreadyExists',
    EMAIL_EXISTS:            'apiError.emailExists',
    USERNAME_TAKEN:          'apiError.usernameTaken',
    DISCORD_ALREADY_LINKED:  'apiError.discordAlreadyLinked',

    // Discord OAuth
    DISCORD_NOT_LINKED:      'apiError.discordNotLinked',
    DISCORD_TOKEN_EXPIRED:   'apiError.discordTokenExpired',
    DISCORD_MISSING_GUILDS_SCOPE: 'apiError.discordMissingScope',
    NOT_GUILD_MEMBER:        'apiError.notGuildMember',

    // Rate limit / lockout
    RATE_LIMITED:            'apiError.rateLimited',
    ACCOUNT_LOCKED:          'apiError.accountLocked',

    // Not found
    GUILD_NOT_FOUND:         'apiError.guildNotFound',

    // Generic
    INTERNAL_ERROR:          'apiError.internalError',
    FETCH_GUILDS_ERROR:      'apiError.fetchGuildsError',
    UPDATE_GUILD_ADMIN_ERROR:'apiError.updateGuildError',
    NO_ALLOWED_FIELDS:       'apiError.noAllowedFields',
};

/**
 * Traduz um erro da API para o idioma atual.
 *
 * @param {Error|object} err  erro capturado (axios error ou similar)
 * @param {Function} t        translator function (vindo de useT())
 * @param {string} [fallbackKey]  chave de fallback se o código não estiver mapeado
 *                                 (default: 'apiError.generic')
 * @returns {string} mensagem traduzida
 */
export function translateApiError(err, t, fallbackKey = 'apiError.generic') {
    const code = err?.response?.data?.code || err?.code;
    if (code && ERROR_CODE_MAP[code]) {
        return t(ERROR_CODE_MAP[code]);
    }
    // Se não tem code mas tem message do servidor, retorna ela (já é PT, mas é melhor que nada)
    if (err?.response?.data?.error) {
        return err.response.data.error;
    }
    return t(fallbackKey);
}
