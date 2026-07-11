import { useState, useEffect, useCallback } from 'react';
import {
  ChartBarIcon, UsersIcon, ServerIcon, CommandLineIcon,
  ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';
import ErrorState from '../../../../components/ui/ErrorState';
import { SkeletonCard, SkeletonChart, SkeletonLine } from '../../../../components/ui/Skeleton';

const API = import.meta.env.VITE_API_BASE_URL;

// ─── Utilitários ─────────────────────────────────────────────────────────────
function fmtUptime(s) {
  if (!s) return '—';
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
        m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtNumber(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('pt-BR');
}

// Extrai um nome curto e legível a partir do padrão de rota (ex: "GET /expapi/v1/admin/metrics" -> "metrics")
function shortRouteName(routePattern) {
  if (!routePattern) return '?';
  // Pega apenas o path (ignora o método HTTP no início, se houver)
  const parts = routePattern.split(' ');
  const path = parts.length > 1 ? parts[1] : parts[0];
  // Pega o último segmento da URL, ignorando parâmetros dinâmicos (:id)
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || path;
  return last.replace(/^:/, '').slice(0, 18);
}

// ─── Gráfico de barras horizontal (CSS-based, sem distorção) ─────────────────
function RoutesBarChart({ data = [], color = '#8B5CF6' }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="px-6 pt-5 pb-2">
      {/* Barras verticais com tooltips */}
      <div className="flex items-end gap-2 sm:gap-3 h-[180px]">
        {data.map((d, i) => {
          const pct = Math.max((d.value / max) * 100, 2); // no mínimo 2% para visibilidade
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end group relative h-full min-w-0"
            >
              {/* Valor no topo da barra (sempre visível em telas maiores) */}
              <div className="text-[10px] sm:text-xs font-semibold text-gray-700 mb-1 tabular-nums">
                {fmtNumber(d.value)}
              </div>

              {/* A barra propriamente dita */}
              <div
                className="w-full rounded-t-md transition-all duration-500 ease-out hover:opacity-80 cursor-default relative"
                style={{
                  height: `${pct}%`,
                  backgroundColor: color,
                  minHeight: '4px',
                }}
              >
                {/* Tooltip no hover */}
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 max-w-[200px] overflow-hidden text-ellipsis">
                  {d.fullRoute || d.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Labels no rodapé */}
      <div className="flex gap-2 sm:gap-3 mt-2 border-t border-gray-100 pt-2">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[10px] sm:text-xs text-gray-500 font-mono truncate min-w-0"
            title={d.fullRoute || d.label}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card de estatística ─────────────────────────────────────────────────────
function StatCard({ name, value, icon: Icon, color = 'text-purple-500', bg = 'bg-purple-50', sub }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${bg} p-3 rounded-lg`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 truncate">{name}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Badge de status de rota ─────────────────────────────────────────────────
function StatusBadge({ statusCodes = {} }) {
  const has5xx = Object.keys(statusCodes).some(s => +s >= 500);
  const has4xx = Object.keys(statusCodes).some(s => +s >= 400 && +s < 500);
  if (has5xx) return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">⚠ Erros</span>;
  if (has4xx) return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">4xx</span>;
  return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">✓ OK</span>;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MetricsTab() {
  const [metrics, setMetrics]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);
  const [lastRefresh, setLast]  = useState(null);
  const [autoRefresh, setAuto]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}expapi/v1/admin/metrics`, {
        headers: {}, credentials: 'include',
        credentials: 'include',
      });
      if (!res.ok) {
        // Tenta ler a mensagem de erro do corpo quando possível
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detail = body.error;
        } catch { /* corpo não-JSON, mantém detail default */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setMetrics(data);
      setLast(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  // ── Dados derivados ────────────────────────────────────────────────────────
  const routes = metrics ? Object.entries(metrics.routes || {}) : [];
  const topRoutes = [...routes]
    .sort((a, b) => (b[1].count || 0) - (a[1].count || 0))
    .slice(0, 8);
  const maxCount = topRoutes[0]?.[1]?.count || 1;

  const recentErrors = metrics?.recentErrors?.slice(0, 6) || [];

  const mem = metrics?.memory;
  const memUsedMB  = mem ? (mem.heapUsed  / 1024 / 1024).toFixed(1) : '—';
  const memTotalMB = mem ? (mem.heapTotal / 1024 / 1024).toFixed(1) : '—';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl">

      {/* Cabeçalho */}
      <div className="bg-white shadow rounded-lg border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">📊 Métricas da API</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {lastRefresh && (
              <span className="text-xs text-gray-500">
                Atualizado às {lastRefresh.toLocaleTimeString('pt-BR')}
              </span>
            )}
            <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAuto(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              Auto (15s)
            </label>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Estado de erro (primeiro carregamento) */}
      {error && !metrics && (
        <ErrorState
          title="Erro ao carregar métricas"
          message="Não foi possível carregar as métricas da API. Verifique sua conexão e tente novamente."
          detail={error}
          onRetry={load}
        />
      )}

      {/* Erro em atualizações subsequentes (mantém os dados antigos visíveis) */}
      {error && metrics && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
            <span>Falha ao atualizar: {error}</span>
          </div>
          <button
            onClick={load}
            className="text-xs font-medium text-red-700 hover:text-red-900 underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Skeleton no primeiro carregamento */}
      {loading && !metrics && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="bg-white shadow rounded-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <SkeletonLine width="180px" height="1.1rem" />
            </div>
            <SkeletonChart height={220} />
          </div>
        </>
      )}

      {/* Conteúdo carregado */}
      {metrics && (<>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            name="Total de Requisições"
            value={fmtNumber(metrics.totalRequests)}
            icon={ChartBarIcon}
            sub={`${metrics.errorRate ?? 0}% de erro`}
          />
          <StatCard
            name="Erros (5xx)"
            value={fmtNumber(metrics.totalErrors)}
            icon={ExclamationTriangleIcon}
            color="text-red-500" bg="bg-red-50"
          />
          <StatCard
            name="Uptime"
            value={fmtUptime(metrics.uptimeSeconds)}
            icon={ClockIcon}
            color="text-green-500" bg="bg-green-50"
            sub="desde o último restart"
          />
          <StatCard
            name="Heap Usado"
            value={`${memUsedMB} MB`}
            icon={ServerIcon}
            color="text-blue-500" bg="bg-blue-50"
            sub={`de ${memTotalMB} MB alocados`}
          />
        </div>

        {/* Top Rotas por volume */}
        <div className="bg-white shadow rounded-lg border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">🔀 Rotas Mais Acessadas</h3>
            <span className="text-xs text-gray-500">Top {topRoutes.length} por volume</span>
          </div>

          {/* Gráfico de barras — agora responsivo e sem distorção */}
          {topRoutes.length > 0 ? (
            <RoutesBarChart
              data={topRoutes.map(([route, s]) => ({
                value: s.count,
                label: shortRouteName(route),
                fullRoute: route,
              }))}
              color="#8B5CF6"
            />
          ) : (
            <p className="px-6 py-10 text-center text-sm text-gray-400">
              Nenhuma rota registrada ainda.
            </p>
          )}

          {/* Lista detalhada com barras de proporção */}
          <div className="divide-y divide-gray-100 border-t border-gray-100">
            {topRoutes.map(([route, s]) => (
              <div key={route} className="px-6 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs font-mono text-gray-700 truncate">{route}</code>
                    <StatusBadge statusCodes={s.statusCodes} />
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${(s.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-semibold text-gray-900">{fmtNumber(s.count)}</div>
                  <div className="text-xs text-gray-500">{s.avgDurationMs ?? 0}ms avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabela de status codes por rota */}
        <div className="bg-white shadow rounded-lg border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h3 className="text-base font-semibold text-gray-900">📋 Status Codes por Rota</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rota</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">2xx</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">4xx</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">5xx</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Último acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {routes.length === 0 && (
                  <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">Sem dados</td></tr>
                )}
                {routes.map(([route, s]) => {
                  const codes   = s.statusCodes || {};
                  const count2  = Object.entries(codes).filter(([c]) => +c >= 200 && +c < 300).reduce((a, [, v]) => a + v, 0);
                  const count4  = Object.entries(codes).filter(([c]) => +c >= 400 && +c < 500).reduce((a, [, v]) => a + v, 0);
                  const count5  = Object.entries(codes).filter(([c]) => +c >= 500).reduce((a, [, v]) => a + v, 0);
                  return (
                    <tr key={route} className={count5 > 0 ? 'bg-red-50' : ''}>
                      <td className="px-4 py-2 font-mono text-xs text-gray-700 max-w-xs truncate">{route}</td>
                      <td className="px-4 py-2 text-center text-green-700">{count2 || '–'}</td>
                      <td className="px-4 py-2 text-center text-yellow-700">{count4 || '–'}</td>
                      <td className="px-4 py-2 text-center text-red-700 font-semibold">{count5 || '–'}</td>
                      <td className="px-4 py-2 text-right text-gray-400 text-xs">
                        {s.lastCalledAt ? new Date(s.lastCalledAt).toLocaleTimeString('pt-BR') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Erros recentes */}
        {recentErrors.length > 0 && (
          <div className="bg-white shadow rounded-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50 rounded-t-lg">
              <h3 className="text-base font-semibold text-red-800">🔴 Erros Recentes (últimos {recentErrors.length})</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {recentErrors.map((e, i) => (
                <div key={i} className="px-6 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs font-mono text-gray-600">{e.method} {e.route}</code>
                      <p className="text-sm text-red-700 mt-0.5 truncate">{e.message || '(sem mensagem)'}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{e.status}</span>
                      <p className="text-xs text-gray-400 mt-1">{new Date(e.at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  {e.id && <p className="text-xs text-gray-400 mt-1 font-mono">ID: {e.id}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

      </>)}
    </div>
  );
}
