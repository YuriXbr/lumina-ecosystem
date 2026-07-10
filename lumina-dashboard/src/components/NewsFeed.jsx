import { useState, useEffect, useCallback } from 'react';
import { NewspaperIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { fetchNews } from '../utils/membersApi';
import { SkeletonLine } from './ui/Skeleton';

const TAG_META = {
  novidade:   { label: 'Novidade',   bg: 'bg-purple-100', text: 'text-purple-700' },
  atualizacao:{ label: 'Atualização',bg: 'bg-blue-100',   text: 'text-blue-700' },
  evento:     { label: 'Evento',     bg: 'bg-yellow-100', text: 'text-yellow-700' },
  aviso:      { label: 'Aviso',      bg: 'bg-red-100',    text: 'text-red-700' },
};

function TagBadge({ tag }) {
  const m = TAG_META[tag] || TAG_META.novidade;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000; // segundos
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/**
 * Sidebar com o feed de novidades.
 * Ordenado: mais recente primeiro (pinned sobrepõe).
 */
export default function NewsFeed({ limit = 15 }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNews({ limit, offset: 0 });
      setPosts(data.posts || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  const [expanded, setExpanded] = useState(null);

  return (
    <aside className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <NewspaperIcon className="h-4 w-4 text-purple-600" />
          Novidades
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="Atualizar"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-700 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>Erro ao carregar novidades.</p>
            <button onClick={load} className="text-red-700 underline mt-1 text-[10px] font-medium">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
              <SkeletonLine width="50%" height="0.8rem" />
              <SkeletonLine width="100%" height="0.7rem" />
              <SkeletonLine width="80%" height="0.7rem" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <NewspaperIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-500">Nenhuma novidade publicada ainda.</p>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 -mr-1">
          {posts.map(p => {
            const isExpanded = expanded === p.id;
            return (
              <article
                key={p.id}
                className="bg-white border border-gray-200 rounded-lg p-3 hover:border-purple-200 transition-colors cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : p.id)}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <TagBadge tag={p.tag} />
                  {p.pinned && (
                    <span className="text-[10px] text-purple-600 font-medium">📌 Fixado</span>
                  )}
                  <span className="text-[10px] text-gray-400 ml-auto">{formatDate(p.publishedAt)}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-900 leading-snug">{p.title}</h3>
                {p.excerpt && !isExpanded && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.excerpt}</p>
                )}
                {isExpanded && (
                  <div className="mt-2 space-y-2">
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-full rounded-md max-h-48 object-cover"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    )}
                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{p.body}</p>
                    {p.authorName && (
                      <p className="text-[10px] text-gray-400 mt-1">por {p.authorName}</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}
