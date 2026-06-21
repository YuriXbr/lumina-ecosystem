import { useState, useEffect, useRef } from 'react';
import { 
  CommandLineIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export default function ConsoleTab() {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [command, setCommand] = useState('');
  const [filter, setFilter] = useState('all');
  const consoleRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    // Auto scroll para o final quando novos logs chegam
    if (consoleRef.current && !isPaused) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const connectWebSocket = () => {
    try {
      // WebSocket para receber logs em tempo real
      const wsUrl = `ws://localhost:3001/console?token=${localStorage.getItem('token')}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        addLog('system', 'Conectado ao console do bot');
      };

      wsRef.current.onmessage = (event) => {
        const logData = JSON.parse(event.data);
        if (!isPaused) {
          addLog(logData.level, logData.message, logData.timestamp);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        addLog('system', 'Desconectado do console do bot');
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLog('error', 'Erro na conexão WebSocket');
      };
    } catch (error) {
      // Simular logs para demonstração se WebSocket falhar
      simulateLogs();
    }
  };

  const simulateLogs = () => {
    const mockLogs = [
      { level: 'info', message: 'Bot iniciado com sucesso', timestamp: new Date() },
      { level: 'info', message: 'Conectado ao Discord', timestamp: new Date(Date.now() - 1000) },
      { level: 'info', message: 'Carregando comandos...', timestamp: new Date(Date.now() - 2000) },
      { level: 'success', message: 'Comando /ping carregado', timestamp: new Date(Date.now() - 3000) },
      { level: 'success', message: 'Comando /leagueprofile carregado', timestamp: new Date(Date.now() - 4000) },
      { level: 'info', message: 'Conectando ao banco de dados...', timestamp: new Date(Date.now() - 5000) },
      { level: 'success', message: 'Banco de dados conectado', timestamp: new Date(Date.now() - 6000) },
      { level: 'warning', message: 'Rate limit atingido na API do Discord', timestamp: new Date(Date.now() - 7000) },
      { level: 'error', message: 'Erro ao executar comando: Usuário não encontrado', timestamp: new Date(Date.now() - 8000) },
      { level: 'info', message: 'Comando executado por UserTest#1234', timestamp: new Date(Date.now() - 9000) }
    ];

    setLogs(mockLogs);
    setIsConnected(true);
  };

  const addLog = (level, message, timestamp = new Date()) => {
    const newLog = {
      id: Date.now() + Math.random(),
      level,
      message,
      timestamp
    };
    
    setLogs(prev => [...prev, newLog]);
  };

  const executeCommand = async () => {
    if (!command.trim()) return;

    addLog('command', `> ${command}`);

    try {
      const response = await fetch('/api/admin/console/command', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command })
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

  const clearLogs = () => {
    setLogs([]);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connectWebSocket();
  };

  const getLogColor = (level) => {
    switch (level) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      case 'command':
        return 'text-blue-600 font-mono';
      case 'system':
        return 'text-purple-600';
      default:
        return 'text-gray-800';
    }
  };

  const getLogIcon = (level) => {
    switch (level) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'command':
        return '>';
      case 'system':
        return '🔧';
      default:
        return 'ℹ️';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
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
              {/* Filtros */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">Todos</option>
                <option value="info">Info</option>
                <option value="success">Sucesso</option>
                <option value="warning">Warning</option>
                <option value="error">Erro</option>
                <option value="command">Comandos</option>
              </select>

              {/* Controles */}
              <button
                onClick={togglePause}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {isPaused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
              </button>
              
              <button
                onClick={reconnect}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
              
              <button
                onClick={clearLogs}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Console Output */}
      <div className="bg-black rounded-lg shadow-lg">
        <div className="p-4">
          <div
            ref={consoleRef}
            className="bg-black text-green-400 font-mono text-sm h-96 overflow-y-auto p-4 rounded border border-gray-600"
            style={{ scrollBehavior: 'smooth' }}
          >
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
                📍 Console pausado - novos logs não serão exibidos
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
                  onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
                  placeholder="Digite um comando (ex: status, restart, eval console.log('Hello'))"
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

      {/* Informações do Sistema */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Informações do Sistema</h3>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status do Bot</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Online
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Uptime</dt>
              <dd className="mt-1 text-sm text-gray-900">7d 14h 32m</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Uso de Memória</dt>
              <dd className="mt-1 text-sm text-gray-900">245.7 MB</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Latência</dt>
              <dd className="mt-1 text-sm text-gray-900">120ms</dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
