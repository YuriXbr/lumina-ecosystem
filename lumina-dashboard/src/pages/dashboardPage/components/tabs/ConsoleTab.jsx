import { useState, useEffect, useRef } from 'react';
import {
  CommandLineIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function ConsoleTab() {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [command, setCommand] = useState('');
  const [filter, setFilter] = useState('all');
  const [wsError, setWsError] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [systemInfoLoading, setSystemInfoLoading] = useState(true);
  const [systemInfoError, setSystemInfoError] = useState(null);
  const consoleRef = useRef(null);
  const wsRef = useRef(null);

  // ─── Conexão WebSocket para logs em tempo real ─────────────────────────────
  // NOTA: WebSocket não suporta credentials como fetch. O cookie httpOnly NÃO é
  // enviado automaticamente em conexões WS cross-origin. Para uma implementação
  // segura, o servidor WS deveria aceitar o cookie (same-origin) ou usar um
  // token de curta duração trocado via HTTP antes de abrir o WS.
  // Por enquanto, esta feature fica desativada até o backend WS ser atualizado.
  const connectWebSocket = () => {
    setWsError('Console em tempo real temporariamente indisponível. O sistema de autenticação foi migrado para cookies httpOnly e o WebSocket precisa ser atualizado para suportar isso.');
    setIsConnected(false);
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll para o final quando novos logs chegam
  useEffect(() => {
    if (consoleRef.current && !isPaused) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // ─── Carregar informações do sistema a partir da API ───────────────────────
  // Substitui os valores hardcoded antigos (Online / 7d 14h 32m / 245.7 MB / 120ms)
  const loadSystemInfo = async () => {
    setSystemInfoLoading(true);
    setSystemInfoError(null);
    try {
      const response = await fetch(`${API_BASE}expapi/v1/admin/metrics`, {
        headers: {}, credentials: 'include',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const mem = data.memory || {};
      setSystemInfo({
        uptimeSeconds: data.uptimeSeconds,
        memoryMb: mem.heapUsed ? (mem.heapUsed / 1024 / 1024).toFixed(1) : null,
        totalRequests: data.totalRequests,
        totalErrors: data.totalErrors,
      });
    } catch (err) {
      setSystemInfoError(err.message);
    } finally {
      setSystemInfoLoading(false);
    }
  };

  useEffect(() => {
    loadSystemInfo();
    const id = setInterval(loadSystemInfo, 30_000);
    return () => clearInterval(id);
  }, []);

  const addLog = (level, message, timestamp = new Date()) => {
    const newLog = {
      id: Date.now() + Math.random(),
      level,
      message,
      timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp)
    };
    setLogs(prev => [...prev, newLog]);
  };

  const executeCommand = async () => {
    if (!command.trim()) return;

    addLog('command', `> ${command}`);

    try {
      const response = await fetch(`${API_BASE}api/admin/console/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ command }),
      });

      const result = await response.json();

      if (response.ok) {
        addLog('success', result.output || 'Comando executado com sucesso');
      } else {
        addLog('error', result.error || 'Erro ao executar comando');
      }
    } catch (error) {
      addLog('error', `Erro de conexão: ${error.message}`);
    }

    setCommand('');
  };

  const clearLogs = () => setLogs([]);
  const togglePause = () => setIsPaused(!isPaused);
  const reconnect = () => {
    if (wsRef.current) wsRef.current.close();
    connectWebSocket();
  };

  const getLogColor = (level) => {
    switch (level) {
      case 'error':   return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'command': return 'text-blue-600 font-mono';
      case 'system':  return 'text-purple-600';
      default:        return 'text-gray-300';
    }
  };

  const getLogIcon = (level) => {
    switch (level) {
      case 'error':   return '❌';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'command': return '>';
      case 'system':  return '🔧';
      default:        return 'ℹ️';
    }
  };

  const filteredLogs = logs.filter(log => filter === 'all' ? true : log.level === filter);

  function fmtUptime(s) {
    if (!s) return '—';
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
          m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center">
              <CommandLineIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Console do Bot</h3>
              <div className="ml-4 flex items-center">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} mr-2`}></div>
                <span className="text-sm text-gray-500">
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-purple-500 focus:border-purple-500 bg-white"
              >
                <option value="all">Todos</option>
                <option value="info">Info</option>
                <option value="success">Sucesso</option>
                <option value="warning">Warning</option>
                <option value="error">Erro</option>
                <option value="command">Comandos</option>
              </select>

              <button
                onClick={togglePause}
                title={isPaused ? 'Retomar' : 'Pausar'}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {isPaused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
              </button>

              <button
                onClick={reconnect}
                title="Reconectar"
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>

              <button
                onClick={clearLogs}
                title="Limpar logs"
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Aviso de erro de WebSocket (não bloqueia o console, apenas informa) */}
      {wsError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-yellow-800">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{wsError}</span>
          </div>
          <button
            onClick={reconnect}
            className="inline-flex items-center gap-1 text-xs font-medium text-yellow-800 hover:text-yellow-900"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Console Output */}
      <div className="bg-black rounded-lg shadow-lg">
        <div className="p-4">
          <div
            ref={consoleRef}
            className="bg-black text-green-400 font-mono text-sm h-96 overflow-y-auto p-4 rounded border border-gray-600"
            style={{ scrollBehavior: 'smooth' }}
          >
            {filteredLogs.length === 0 && !wsError && (
              <div className="text-gray-500 italic">
                Aguardando logs do bot... Verifique se o bot está rodando e se a conexão WebSocket está ativa.
              </div>
            )}
            {filteredLogs.map((log) => (
              <div key={log.id} className="mb-1 flex items-start space-x-2">
                <span className="text-gray-500 text-xs mt-0.5 flex-shrink-0">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className="flex-shrink-0">{getLogIcon(log.level)}</span>
                <span className={getLogColor(log.level)}>{log.message}</span>
              </div>
            ))}

            {isPaused && (
              <div className="text-yellow-400 mt-4 p-2 bg-yellow-900 bg-opacity-20 rounded border border-yellow-600">
                📍 Console pausado — novos logs não serão exibidos
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input de Comando */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Executar Comando
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                  placeholder="Digite um comando (ex: status, restart)"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500 font-mono"
                  disabled={!isConnected}
                />
                <button
                  onClick={executeCommand}
                  disabled={!isConnected || !command.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Executar
                </button>
              </div>
            </div>
          </div>

          {/* Comandos Rápidos */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comandos Rápidos
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Status', command: 'status' },
                { label: 'Uptime', command: 'uptime' },
                { label: 'Guilds', command: 'guilds count' },
                { label: 'Users', command: 'users count' },
                { label: 'Memory', command: 'memory usage' },
                { label: 'Reload Commands', command: 'reload commands' }
              ].map((quick) => (
                <button
                  key={quick.command}
                  onClick={() => setCommand(quick.command)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  {quick.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Informações do Sistema — busca real da API, com skeleton e retry */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Informações do Sistema</h3>
          <button
            onClick={loadSystemInfo}
            disabled={systemInfoLoading}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
            title="Atualizar"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${systemInfoLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
        <div className="px-6 py-4">
          {systemInfoLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {!systemInfoLoading && systemInfoError && (
            <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-md px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-red-700">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>Erro ao carregar informações do sistema: {systemInfoError}</span>
              </div>
              <button
                onClick={loadSystemInfo}
                className="text-xs font-medium text-red-700 hover:text-red-900 underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!systemInfoLoading && !systemInfoError && systemInfo && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status do Bot</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Uptime</dt>
                <dd className="mt-1 text-sm text-gray-900">{fmtUptime(systemInfo.uptimeSeconds)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Uso de Memória (heap)</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {systemInfo.memoryMb ? `${systemInfo.memoryMb} MB` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total de Requisições</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {systemInfo.totalRequests?.toLocaleString('pt-BR') ?? '—'}
                </dd>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
