import { useState, useEffect, useCallback } from 'react';
import {
  ServerIcon, CheckCircleIcon, XCircleIcon, PlusIcon,
  Cog6ToothIcon, ArrowPathIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { fetchMyGuilds } from '../utils/membersApi';
import ErrorState from './ui/ErrorState';
import AddBotModal from './AddBotModal';
import { Link } from 'react-router-dom';

function GuildIcon({ guild, size = 40 }) {
  if (guild.icon) {
    return (
      <img
        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
        alt={guild.name}
        className="rounded-full"
        style={{ width: size, height: size }}
        onError={(e) => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-purple-200 to-purple-400 flex items-center justify-center text-purple-700 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {guild.name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function GuildCard({ guild, onAddBot }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <GuildIcon guild={guild} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{guild.name}</h3>
            {guild.hasBot ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                <CheckCircleIcon className="h-3 w-3" />
                Bot ativo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                <XCircleIcon className="h-3 w-3" />
                Sem bot
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 font-mono mb-2 truncate">{guild.id}</p>

          {guild.hasBot && guild.botConfig && (
            <div className="flex flex-wrap gap-1 mb-3">
              {guild.botConfig.welcomeEnabled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Boas-vindas</span>
              )}
              {guild.botConfig.moderationEnabled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700">Moderação</span>
              )}
              {guild.botConfig.musicEnabled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">Música</span>
              )}
              {guild.botConfig.memberCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  {guild.botConfig.memberCount.toLocaleString('pt-BR')} membros
                </span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {guild.hasBot && guild.canManage && (
              <Link
                to={`/server/${guild.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <Cog6ToothIcon className="h-3.5 w-3.5" />
                Configurar
              </Link>
            )}
            {guild.hasBot && !guild.canManage && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 italic">
                Sem permissão para gerenciar
              </span>
            )}
            {!guild.hasBot && guild.canManage && (
              <button
                onClick={() => onAddBot(guild)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Adicionar Bot
              </button>
            )}
            {!guild.hasBot && !guild.canManage && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 italic">
                Sem permissão para adicionar
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MutualGuildsList() {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all | with-bot | without-bot | manageable
  const [addBotTarget, setAddBotTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyGuilds();
      setGuilds(data.guilds || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && guilds.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-gray-200 rounded" />
                <div className="h-2 w-20 bg-gray-100 rounded" />
                <div className="h-6 w-24 bg-gray-100 rounded mt-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && guilds.length === 0) {
    return (
      <ErrorState
        title="Não foi possível carregar seus servidores"
        message={error}
        onRetry={load}
      />
    );
  }

  // Aplica filtro
  const filtered = guilds.filter(g => {
    if (filter === 'with-bot') return g.hasBot;
    if (filter === 'without-bot') return !g.hasBot;
    if (filter === 'manageable') return g.canManage;
    return true;
  });

  const counts = {
    all: guilds.length,
    'with-bot': guilds.filter(g => g.hasBot).length,
    'without-bot': guilds.filter(g => !g.hasBot).length,
    manageable: guilds.filter(g => g.canManage).length,
  };

  const filterButtons = [
    { id: 'all', label: 'Todos' },
    { id: 'with-bot', label: 'Com bot' },
    { id: 'without-bot', label: 'Sem bot' },
    { id: 'manageable', label: 'Gerencio' },
  ];

  return (
    <div>
      {/* Filtros + refresh */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {filterButtons.map(b => (
            <button
              key={b.id}
              onClick={() => setFilter(b.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === b.id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {b.label} <span className="text-gray-400">({counts[b.id]})</span>
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-purple-700 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Erro de refresh (mantém cards antigos) */}
      {error && guilds.length > 0 && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-700 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span>Falha ao atualizar: {error}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <ServerIcon className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Nenhum servidor encontrado neste filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(g => (
            <GuildCard key={g.id} guild={g} onAddBot={setAddBotTarget} />
          ))}
        </div>
      )}

      {addBotTarget && (
        <AddBotModal guild={addBotTarget} onClose={() => setAddBotTarget(null)} />
      )}
    </div>
  );
}
