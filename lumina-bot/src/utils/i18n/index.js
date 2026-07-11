'use strict';

/**
 * i18n — sistema de tradução do bot.
 *
 * Fluxo de resolução de idioma (por prioridade):
 *   1. interaction.locale (Discord per-user — o que o usuário configurou no cliente)
 *   2. interaction.guildLocale (Discord per-guild — idioma predominante do servidor)
 *   3. 'en-US' (fallback final)
 *
 * Suporta:
 *   - Interpolação: t('cmd.daily.streak', { count: 5 }) → "5 dias"
 *   - Pluralização: t('cmd.daily.days', { count: 1 }) → "1 dia",
 *                   t('cmd.daily.days', { count: 5 }) → "5 dias"
 *                   (chaves _one / _other — suficiente para en/pt/es)
 *   - Fallback: se a chave não existir no idioma atual, tenta en-US;
 *               se também não existir, retorna a própria chave.
 */

const fs = require('node:fs');
const path = require('node:path');

const LOCALES_DIR = path.join(__dirname, '..', '..', 'locales');
const SUPPORTED_LOCALES = ['en-US', 'pt-BR', 'es-ES'];
const DEFAULT_LOCALE = 'en-US';

// Cache de traduções carregadas (loaded once at startup)
const _translations = {};

/**
 * Carrega todos os arquivos de tradução na inicialização.
 * Lança erro se o arquivo default não existir — é erro de programação.
 */
function _loadAll() {
    for (const locale of SUPPORTED_LOCALES) {
        const filePath = path.join(LOCALES_DIR, `${locale}.json`);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            _translations[locale] = JSON.parse(content);
        } catch (err) {
            if (locale === DEFAULT_LOCALE) {
                console.error(`[i18n] FATAL: arquivo de tradução default não encontrado: ${filePath}`);
                throw err;
            }
            console.warn(`[i18n] Arquivo de tradução ausente para ${locale}, usando fallback.`);
            _translations[locale] = {};
        }
    }
}

// Carrega na primeira require
_loadAll();

/**
 * Normaliza um código de idioma para um dos suportados.
 * Aceita variações como 'pt', 'pt-BR', 'pt-br', 'en', 'en-US', 'es', 'es-ES'.
 */
function normalizeLocale(locale) {
    if (!locale || typeof locale !== 'string') return DEFAULT_LOCALE;
    const lower = locale.toLowerCase();
    if (lower.startsWith('pt')) return 'pt-BR';
    if (lower.startsWith('es')) return 'es-ES';
    if (lower.startsWith('en')) return 'en-US';
    if (SUPPORTED_LOCALES.includes(locale)) return locale;
    return DEFAULT_LOCALE;
}

/**
 * Resolve o idioma a partir de uma interação do Discord.
 * @param {import('discord.js').Interaction} interaction
 * @returns {string} locale normalizado
 */
function resolveFromInteraction(interaction) {
    if (interaction?.locale) {
        return normalizeLocale(interaction.locale);
    }
    if (interaction?.guildLocale) {
        return normalizeLocale(interaction.guildLocale);
    }
    return DEFAULT_LOCALE;
}

/**
 * Busca uma chave aninhada em um objeto usando notação de ponto.
 */
function _lookup(obj, key) {
    if (!obj || typeof key !== 'string') return undefined;
    const parts = key.split('.');
    let cur = obj;
    for (const part of parts) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[part];
    }
    return cur;
}

/**
 * Substitui placeholders {name} no template pelos valores em params.
 */
function _interpolate(template, params) {
    if (!params || typeof template !== 'string') return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => {
        const value = params[name];
        return value === undefined || value === null ? match : String(value);
    });
}

/**
 * Cria uma função `t(key, params)` para um locale específico.
 *
 * @param {string} locale  locale normalizado (deve estar em SUPPORTED_LOCALES)
 * @returns {(key: string, params?: object) => string}
 */
function getTranslator(locale) {
    const norm = normalizeLocale(locale);
    const bundle = _translations[norm] || {};
    const fallback = _translations[DEFAULT_LOCALE] || {};

    return function t(key, params) {
        // Pluralização: se params tem `count`, tenta chave_one/chave_other antes de chave
        if (params && typeof params.count === 'number') {
            const pluralRule = params.count === 1 ? 'one' : 'other';
            const pluralKey = `${key}_${pluralRule}`;
            const pluralValue = _lookup(bundle, pluralKey) ?? _lookup(fallback, pluralKey);
            if (typeof pluralValue === 'string') {
                return _interpolate(pluralValue, params);
            }
        }

        const value = _lookup(bundle, key) ?? _lookup(fallback, key);
        if (typeof value === 'string') {
            return _interpolate(value, params);
        }
        console.warn(`[i18n] chave sem tradução: ${key} (locale=${norm})`);
        return key;
    };
}

module.exports = {
    SUPPORTED_LOCALES,
    DEFAULT_LOCALE,
    normalizeLocale,
    resolveFromInteraction,
    getTranslator,
};
