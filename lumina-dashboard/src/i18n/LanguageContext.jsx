/**
 * LanguageContext — provê o locale atual e uma função `t` para tradução.
 *
 * Resolução do locale (uma única vez na montagem, e re-resolvido quando o
 * usuário loga/desloga):
 *   1. user.language (preferência da conta)
 *   2. navigator.language (idioma do browser)
 *   3. 'en-US' (fallback final)
 *
 * Quando o usuário muda o idioma em /settings, o componente SettingsPage
 * chama `setLanguage(newLocale)` que atualiza o estado local + persiste
 * via PUT /expapi/v1/user/settings.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getTranslator, detectLocale, normalizeLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from './index.js';
import { useUser } from '../contexts/UserContext.jsx';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const { user } = useUser();
    const [locale, setLocaleState] = useState(() => detectLocale(user));

    // Re-resolve quando o usuário muda (login/logout/settings update)
    useEffect(() => {
        const next = detectLocale(user);
        setLocaleState(next);
    }, [user?.language]);  // intentionally only depends on user.language

    // Atualiza <html lang="..."> para acessibilidade e SEO
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = locale;
        }
    }, [locale]);

    const setLocale = useCallback((nextLocale) => {
        const normalized = normalizeLocale(nextLocale);
        setLocaleState(normalized);
        if (typeof document !== 'undefined') {
            document.documentElement.lang = normalized;
        }
    }, []);

    // Memoiza o translator — só recria quando locale muda
    const t = useMemo(() => getTranslator(locale), [locale]);

    const value = useMemo(() => ({
        locale,
        setLocale,
        t,
        supportedLocales: SUPPORTED_LOCALES,
        defaultLocale: DEFAULT_LOCALE,
    }), [locale, setLocale, t]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useI18n() {
    const ctx = useContext(LanguageContext);
    if (!ctx) {
        throw new Error('useI18n must be used within a LanguageProvider');
    }
    return ctx;
}

// Atalho para componentes que só precisam de `t`
export function useT() {
    return useI18n().t;
}
