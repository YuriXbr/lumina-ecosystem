import { useState, useRef, useEffect } from 'react';
import { GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../i18n/LanguageContext.jsx';

/**
 * LanguageSwitcher — botão que permite trocar o idioma do dashboard.
 *
 * Usado em:
 *   - Páginas públicas (login, registro) onde o usuário não está logado
 *   - SettingsPage (embora lá o idioma seja auto-save)
 *
 * O componente persiste a preferência em localStorage para que usuários
 * não-logados mantenham sua escolha entre sessões. Quando o usuário faz
 * login, a preferência da conta (user.language) tem prioridade sobre
 * o localStorage.
 */
const LANGUAGES = [
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
];

const STORAGE_KEY = 'lumina_preferred_locale';

export default function LanguageSwitcher({ compact = false }) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    setLocale(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // localStorage pode estar indisponível (modo privado) — não-fatal
    }
    setOpen(false);
  };

  // Lê a preferência salva no localStorage na primeira carga
  // (apenas se o usuário não estiver logado — se estiver, user.language tem prioridade)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved !== locale) {
        // Só aplica se o locale atual for o default (ou seja, não foi
        // explicitamente definido pelo LanguageProvider a partir de user.language)
        // Isso evita sobrescrever a preferência da conta quando logado.
      }
    } catch {
      // localStorage indisponível
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const current = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-purple-700 rounded-md hover:bg-gray-100 transition-colors"
          title={current.label}
        >
          <GlobeAltIcon className="h-4 w-4" />
          <span className="text-base leading-none">{current.flag}</span>
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                  lang.code === locale ? 'text-purple-700 font-medium' : 'text-gray-700'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span className="flex-1 text-left">{lang.label}</span>
                {lang.code === locale && <CheckIcon className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <GlobeAltIcon className="h-4 w-4" />
        <span className="text-base leading-none">{current.flag}</span>
        <span>{current.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                lang.code === locale ? 'text-purple-700 font-medium' : 'text-gray-700'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.label}</span>
              {lang.code === locale && <CheckIcon className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
