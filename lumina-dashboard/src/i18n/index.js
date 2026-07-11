/**
 * i18n — sistema de tradução do dashboard.
 *
 * Estratégia: solução custom leve (sem i18next) — mesma arquitetura do bot.
 *
 * Resolução de idioma (por prioridade):
 *   1. user.language (vindo da conta do usuário, setado em /settings)
 *   2. navigator.language (idioma do browser)
 *   3. 'en-US' (fallback final)
 *
 * Suporta:
 *   - Interpolação: t('home.hero.title', { name: 'Lumina' })
 *   - Pluralização: t('days', { count: 1 }) → "1 day" / "5 days"
 *     (chaves _one / _other — suficiente para en/pt/es)
 *   - Fallback: se a chave não existir no idioma atual, tenta en-US;
 *               se também não existir, retorna a própria chave.
 */

import enUS from '../locales/en-US.json';
import ptBR from '../locales/pt-BR.json';
import esES from '../locales/es-ES.json';

export const SUPPORTED_LOCALES = ['en-US', 'pt-BR', 'es-ES'];
export const DEFAULT_LOCALE = 'en-US';

const _translations = {
    'en-US': enUS,
    'pt-BR': ptBR,
    'es-ES': esES,
};

/**
 * Normaliza um código de idioma para um dos suportados.
 */
export function normalizeLocale(locale) {
    if (!locale || typeof locale !== 'string') return DEFAULT_LOCALE;
    const lower = locale.toLowerCase();
    if (lower.startsWith('pt')) return 'pt-BR';
    if (lower.startsWith('es')) return 'es-ES';
    if (lower.startsWith('en')) return 'en-US';
    if (SUPPORTED_LOCALES.includes(locale)) return locale;
    return DEFAULT_LOCALE;
}

/**
 * Detecta o melhor idioma com base no usuário logado, localStorage, navegador e fallback.
 *
 * Prioridade:
 *   1. user.language (preferência da conta — só disponível se logado)
 *   2. localStorage 'lumina_preferred_locale' (escolha manual de usuários não-logados)
 *   3. navigator.language (idioma do browser)
 *   4. 'en-US' (fallback final)
 *
 * @param {object|null} user  objeto do usuário vindo do UserContext (ou null)
 * @returns {string} locale normalizado
 */
export function detectLocale(user) {
    // 1. User setting (salvo na conta)
    if (user?.language) {
        return normalizeLocale(user.language);
    }
    // 2. localStorage (usuário não-logado que trocou idioma manualmente)
    if (typeof localStorage !== 'undefined') {
        try {
            const saved = localStorage.getItem('lumina_preferred_locale');
            if (saved) return normalizeLocale(saved);
        } catch {
            // localStorage indisponível (modo privado) — continua
        }
    }
    // 3. Browser language
    if (typeof navigator !== 'undefined' && navigator.language) {
        return normalizeLocale(navigator.language);
    }
    // 4. Fallback
    return DEFAULT_LOCALE;
}

/**
 * Busca uma chave aninhada usando notação de ponto.
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
 * Substitui placeholders {name} pelos valores em params.
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
 */
export function getTranslator(locale) {
    const norm = normalizeLocale(locale);
    const bundle = _translations[norm] || {};
    const fallback = _translations[DEFAULT_LOCALE] || {};

    return function t(key, params) {
        // Pluralização
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
        // Último recurso: retorna a chave
        if (import.meta.env.DEV) {
            console.warn(`[i18n] chave sem tradução: ${key} (locale=${norm})`);
        }
        return key;
    };
}
