import { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon, FunnelIcon, ArrowPathIcon,
  ChevronLeftIcon, ChevronRightIcon, XMarkIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import ErrorState from '../../../../components/ui/ErrorState';
import ErrorBanner from '../../../../components/ui/ErrorBanner';
import { SkeletonRow } from '../../../../components/ui/Skeleton';

const API = import.meta.env.VITE_API_BASE_URL;

// ─── Metadados de nível ───────────────────────────────────────────────────────
const LEVEL_META = {
  debug:     { label: 'Debug',     bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
  info:      { label: 'Info',      bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400'   },
  warn:      { label: 'Warn',      bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-400' },
  error:     { label: 'Erro',      bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500'    },
  critical:  { label: 'Crítico',   bg: 'bg-red-100',    text: 'text-red-900',    dot: 'bg-red-700'    },
  security:  { label: 'Segurança', bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-500' },
  auth:      { label: 'Auth',      bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-400'  },
  gacha:     { label: 'Gacha',     bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'  },
  ratelimit: { label: 'Rate Limit',bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-400' },
};

function LevelBadge({ level }) {
  const m = LEVEL_META[level] || { label: level, bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ─── Modal de detalhe de um log ───────────────────────────────────────────────
function LogDetailModal({ log, onClose }) {
  if (!log) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Detalhes do Log</h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{log._id || log.requestId || '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-xs text-gray-500 block mb-1">Nível</span><LevelBadge level={log.level} /></div>
            <div><span className="text-xs text-gray-500 block mb-1">Tipo</span><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{log.type || '—'}</code></div>
            <div><span className="text-xs text-gray-500 block mb-1">Ação</span><code className="text-xs text-gray-700">{log.action || '—'}</code></div>
            <div><span className="text-xs text-gray-500 block mb-1">Status HTTP</span><span className={`font-mono font-semibold ${log.statusCode >= 500 ? 'text-red-600' : log.statusCode >= 400 ? 'text-yellow-600' : 'text-green-600'}`}>{log.statusCode || '—'}</span></div>
            <div><span className="text-xs text-gray-500 block mb-1">Duração</span><span className="font-mono">{log.durationMs ? `${log.durationMs.toFixed(1)}ms` : '—'}</span></div>
            <div><span className="text-xs text-gray-500 block mb-1">IP</span><code className="text-xs">{log.ip || '—'}</code></div>
            <div><span className="text-xs text-gray-500 block mb-1">Usuário</span><span>{log.userEmail || '—'}</span></div>
            <div><span className="text-xs text-gray-500 block mb-1">Ambiente</span><span className={`text-xs font-medium ${log.environment === 'production' ? 'text-red-600' : 'text-blue-600'}`}>{log.environment || '—'}</span></div>
          </div>

          <div>
            <span className="text-xs text-gray-500 block mb-1">Rota</span>
            <code className="text-xs bg-gray-100 px-3 py-2 rounded block break-all">{log.method} {log.route}</code>
          </div>

          <div>
            <span className="text-xs text-gray-500 block mb-1">Mensagem</span>
            <p className="text-gray-700 bg-gray-50 px-3 py-2 rounded text-xs leading-relaxed">{log.message || '—'}</p>
          </div>

          {log.requestId && (
            <div>
              <span className="text-xs text-gray-500 block mb-1">Request ID</span>
              <code className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded break-all">{log.requestId}</code>
            </div>
          )}

          {log.extra && Object.keys(log.extra).length > 0 && (
            <div>
              <span className="text-xs text-gray-500 block mb-1">Extra</span>
              <pre className="text-xs bg-gray-900 text-green-400 px-3 py-2 rounded overflow-x-auto leading-relaxed">
                {JSON.stringify(log.extra, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <span className="text-xs text-gray-500 block mb-1">Timestamp</span>
            <span className="text-xs text-gray-600">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LogsTab() {
  const [logs,    setLogs]    = useState([]);
  const [meta,    setMeta]    = useState({ total: 0, page: 1, pages: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [detail,  setDetail]  = useState(null);

  // Filtros
  const [filters, setFilters] = useState({
    level: '', type: '', route: '', requestId: '', startDate: '', endDate: ''
  });
  const [page,    setPage]    = useState(1);
  const [limit]               = useState(50);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ page, limit });
      Object.entries(filters).forEach(([k, v]) => { if (v) q.set(k, v); });

      const res = await fetch(`${API}expapi/v1/admin/logs?${q}`, {
        headers: {}, credentials: 'include',
        credentials: 'include',
      });

      if (res.status === 403) throw new Error('Permissão insuficiente para visualizar logs.');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setLogs(data.logs || []);
      setMeta({ total: data.total, page: data.page, pages: data.pages, limit: data.limit });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ level: '', type: '', route: '', requestId: '', startDate: '', endDate: '' });
    setPage(1);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `lumina-logs-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-4 max-w-7xl">

      {/* Cabeçalho */}
      <div className="bg-white shadow rounded-lg border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-lg flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">📋 Logs da API</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {meta.total.toLocaleString('pt-BR')} entradas • TTL 30 dias
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={exportJson}
              disabled={!logs.length}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nível</label>
                <select
                  value={filters.level}
                  onChange={e => handleFilterChange('level', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Todos</option>
                  {Object.entries(LEVEL_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select
                  value={filters.type}
                  onChange={e => handleFilterChange('type', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Todos</option>
                  {['API','DB','AUTH','OAUTH','GACHA','COMMAND','RATE_LIMIT'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rota (contém)</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.route}
                    onChange={e => handleFilterChange('route', e.target.value)}
                    placeholder="/expapi/v1/..."
                    className="w-full text-sm border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Request ID</label>
                <input
                  type="text"
                  value={filters.requestId}
                  onChange={e => handleFilterChange('requestId', e.target.value)}
                  placeholder="uuid..."
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data início</label>
                <input
                  type="datetime-local"
                  value={filters.startDate}
                  onChange={e => handleFilterChange('startDate', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data fim</label>
                <input
                  type="datetime-local"
                  value={filters.endDate}
                  onChange={e => handleFilterChange('endDate', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-3.5 w-3.5" /> Limpar filtros
              </button>
            )}
          </div>
        )}

        {error && logs.length === 0 && (
          <ErrorState
            title="Erro ao carregar logs"
            message="Não foi possível buscar os logs da API. Verifique sua conexão e tente novamente."
            detail={error}
            onRetry={load}
            compact
          />
        )}

        {error && logs.length > 0 && (
          <ErrorBanner error={`Falha ao atualizar: ${error}`} onRetry={load} />
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Horário</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nível</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rota / Ação</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mensagem</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">ms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && logs.length === 0 && (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} columns={7} />)
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-400 text-sm">
                  Nenhum log encontrado com os filtros atuais.
                </td></tr>
              )}
              {logs.map((log, i) => {
                const m = LEVEL_META[log.level] || { bg: '', dot: 'bg-gray-300' };
                return (
                  <tr
                    key={log._id || i}
                    onClick={() => setDetail(log)}
                    className={`cursor-pointer transition-colors hover:bg-purple-50 ${
                      log.level === 'error' || log.level === 'critical' ? 'bg-red-50/40' : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap font-mono">
                      {new Date(log.createdAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="px-4 py-2"><LevelBadge level={log.level} /></td>
                    <td className="px-4 py-2">
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{log.type || '—'}</code>
                    </td>
                    <td className="px-4 py-2 max-w-xs">
                      <div className="text-xs font-mono text-gray-700 truncate">{log.method && `${log.method} `}{log.route || log.action || '—'}</div>
                    </td>
                    <td className="px-4 py-2 max-w-sm">
                      <p className="text-xs text-gray-600 truncate">{log.message || '—'}</p>
                      {log.ip && <p className="text-xs text-gray-400 mt-0.5">{log.ip}</p>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {log.statusCode ? (
                        <span className={`text-xs font-mono font-semibold ${
                          log.statusCode >= 500 ? 'text-red-600' :
                          log.statusCode >= 400 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>{log.statusCode}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-gray-500 font-mono">
                      {log.durationMs ? `${log.durationMs.toFixed(0)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {meta.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-500">
              Página <strong>{meta.page}</strong> de <strong>{meta.pages}</strong> — {meta.total.toLocaleString('pt-BR')} entradas
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                disabled={meta.page >= meta.pages}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalhe */}
      {detail && <LogDetailModal log={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
