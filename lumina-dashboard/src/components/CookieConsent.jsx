import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const STORAGE_KEY = 'lumina_cookie_consent';
const CONSENT_VERSION = '1'; // Incrementar quando a política mudar

/**
 * Banner de consentimento de cookies.
 * Aparece na parte inferior da tela e some quando o usuário aceita.
 * Usa localStorage para não mostrar novamente (a menos que a versão mude).
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== CONSENT_VERSION) {
        // Pequeno delay para não aparecer imediatamente no load
        const t = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(t);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, CONSENT_VERSION);
    } catch {}
    setVisible(false);
  };

  const handleDismiss = () => {
    // Dismiss temporário — mostra novamente na próxima visita
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] pointer-events-none">
      <div className="mx-auto max-w-4xl m-4 pointer-events-auto">
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              🍪 Nós usamos cookies
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Este site usa cookies para autenticação, segurança e funcionalidade.
              O cookie de sessão (<code className="bg-gray-100 px-1 rounded text-[10px]">lumina_token</code>) é
              <strong> httpOnly</strong> (não acessível via JavaScript) e essencial para o login.
              Cookies CSRF protegem contra ataques cross-site. Não usamos cookies de rastreamento ou publicidade.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleAccept}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors whitespace-nowrap"
            >
              Entendi
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Fechar"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
