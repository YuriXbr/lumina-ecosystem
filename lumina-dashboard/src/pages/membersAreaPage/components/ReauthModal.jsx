import { useState } from 'react';
import { ArrowPathIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Modal que aparece para usuários cujo token OAuth2 do Discord não tem o scope
 * `guilds.members.read` (necessário para buscar informações de guilda sem o bot token).
 *
 * Oferece um botão "Re-sincronizar" que redireciona para o fluxo OAuth com
 * intent=link, que re-autoriza com os novos scopes.
 */
export default function ReauthModal({ onClose }) {
  const [linking, setLinking] = useState(false);

  const handleReauth = () => {
    setLinking(true);
    const origin = window.location.origin;
    const params = new URLSearchParams({ origin, intent: 'link' });
    // O linkToken é lido do cookie httpOnly pelo authStart.js
    window.location.href = `${API_BASE}expapi/oauth2/discord/auth/start?${params}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Header com gradiente */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 px-6 py-5 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white p-1"
            aria-label="Fechar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-white">
            <ArrowPathIcon className="h-6 w-6" />
            <h2 className="text-lg font-bold">Re-sincronização necessária</h2>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 flex items-start gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              Sua conexão com o Discord precisa ser atualizada para incluir novas
              permissões. Isso permite que o Lumina acesse informações dos seus
              servidores sem precisar do token do bot.
            </span>
          </div>

          <p className="text-sm text-gray-600">
            Detectamos que sua conta Discord foi conectada antes de uma atualização
            do sistema. Para garantir que todas as funcionalidades funcionem
            corretamente (incluindo visualização de servidores e configurações),
            você precisa reautorizar o acesso.
          </p>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">O que será atualizado:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Permissão para ler seus servidores (<code>guilds</code>)</li>
              <li>Permissão para ler seu perfil de membro (<code>guilds.members.read</code>)</li>
              <li>Permissão para ler seu email e avatar (<code>identify email</code>)</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Mais tarde
            </button>
            <button
              onClick={handleReauth}
              disabled={linking}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {linking ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Redirecionando...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4" />
                  Re-sincronizar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
