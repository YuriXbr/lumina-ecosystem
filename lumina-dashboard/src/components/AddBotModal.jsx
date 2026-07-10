import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Modal explicativo mostrado quando o usuário clica em "Adicionar Bot"
 * em um servidor onde o Lumina ainda não está presente.
 *
 * Explica rapidamente o que o bot faz e depois oferece um botão que leva
 * direto ao fluxo de OAuth do Discord (com guild_id pré-selecionado).
 */
export default function AddBotModal({ guild, onClose }) {
  const [accepted, setAccepted] = useState(false);

  if (!guild) return null;

  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  // Permissions: base razoável para um bot de moderação + League
  // 274877991936 = applications.commands + bot + (Manage Roles, Manage Channels, Kick, Ban, Manage Messages, Embed Links, Read History, Send Messages)
  const permissions = '8'; // Administrator
  const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&guild_id=${guild.id}&scope=bot+applications.commands`;

  const features = [
    { icon: '🎮', title: 'Comandos de League of Legends', desc: 'Perfil, histórico, maestria e rotação gratuita.' },
    { icon: '🛡️', title: 'Moderação completa', desc: 'Ban, mute, warn com persistência e expiração.' },
    { icon: '💎', title: 'Sistema de skins', desc: 'Baús, inventário e recompensa diária.' },
    { icon: '📊', title: 'Dashboard próprio', desc: 'Configurações por servidor acessíveis via web.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {guild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
                alt={guild.name}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                {guild.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold text-gray-900">Adicionar Lumina Bot</h3>
              <p className="text-sm text-gray-500">em <strong>{guild.name}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Features */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600">
            Você está prestes a adicionar o Lumina Bot ao servidor <strong>{guild.name}</strong>.
            Veja o que ele oferece:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {features.map(f => (
              <div key={f.title} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="text-sm font-medium text-gray-900">{f.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>

          <label className="flex items-start gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-600">
              Entendo que o bot será adicionado com permissões para gerenciar cargos, canais e mensagens,
              e que terei acesso às configurações específicas deste servidor através do painel web.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row-reverse gap-2 sm:items-center">
          <a
            href={oauthUrl}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
              accepted ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed pointer-events-none'
            }`}
            onClick={e => { if (!accepted) e.preventDefault(); }}
          >
            Continuar para Discord
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
