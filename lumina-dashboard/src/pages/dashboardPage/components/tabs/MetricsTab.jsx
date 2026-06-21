import { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  UsersIcon,
  ServerIcon,
  CommandLineIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function MetricsTab() {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalGuilds: 0,
    commandsExecuted: 0,
    errors: 0,
    uptime: '0h 0m',
    loading: true
  });

  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      const response = await fetch(`/api/admin/metrics?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics({ ...data, loading: false });
      } else {
        // Dados mock para demonstração
        setMetrics({
          totalUsers: 1247,
          activeUsers: 89,
          totalGuilds: 156,
          commandsExecuted: 3428,
          errors: 12,
          uptime: '7d 14h 32m',
          loading: false
        });
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      // Usar dados mock em caso de erro
      setMetrics({
        totalUsers: 1247,
        activeUsers: 89,
        totalGuilds: 156,
        commandsExecuted: 3428,
        errors: 12,
        uptime: '7d 14h 32m',
        loading: false
      });
    }
  };

  if (metrics.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total de Usuários',
      value: metrics.totalUsers.toLocaleString(),
      icon: UsersIcon,
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Usuários Ativos',
      value: metrics.activeUsers.toLocaleString(),
      icon: CheckCircleIcon,
      change: '+5%',
      changeType: 'positive'
    },
    {
      name: 'Servidores',
      value: metrics.totalGuilds.toLocaleString(),
      icon: ServerIcon,
      change: '+8%',
      changeType: 'positive'
    },
    {
      name: 'Comandos Executados',
      value: metrics.commandsExecuted.toLocaleString(),
      icon: CommandLineIcon,
      change: '+23%',
      changeType: 'positive'
    },
    {
      name: 'Erros',
      value: metrics.errors.toLocaleString(),
      icon: ExclamationTriangleIcon,
      change: '-15%',
      changeType: 'negative'
    },
    {
      name: 'Uptime',
      value: metrics.uptime,
      icon: ChartBarIcon,
      change: '99.9%',
      changeType: 'positive'
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl">
      {/* Filtro de Tempo */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-100">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              📊 Métricas do Sistema
            </h3>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="inline-flex items-center px-4 py-2 border-2 border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            >
              <option value="1h">⏰ Última Hora</option>
              <option value="24h">📅 Últimas 24h</option>
              <option value="7d">📈 Últimos 7 dias</option>
              <option value="30d">📊 Últimos 30 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
              <div className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className={`h-6 w-6 ${
                      stat.name === 'Erros' ? 'text-red-500' : 
                      stat.name === 'Uptime' ? 'text-green-500' :
                      'text-purple-500'
                    }`} />
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-600 truncate">{stat.name}</dt>
                      <dd className="flex flex-col sm:flex-row sm:items-baseline space-y-1 sm:space-y-0">
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</div>
                        <div className={`sm:ml-2 flex items-baseline text-xs sm:text-sm font-semibold ${
                          stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.changeType === 'positive' ? '↗️' : '↘️'} {stat.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico de Comandos por Dia */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-100">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            📈 Comandos Executados por Dia
          </h3>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="h-48 sm:h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
            <div className="text-center">
              <ChartBarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-purple-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Gráfico será implementado aqui</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Integração com Chart.js ou similar
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Comandos */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-100">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            🏆 Comandos Mais Usados
          </h3>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-4">
            {[
              { command: '/leagueprofile', uses: 1243, percentage: 36 },
              { command: '/leaguematchhistory', uses: 892, percentage: 26 },
              { command: '/ping', uses: 567, percentage: 17 },
              { command: '/leaguechampionrotation', uses: 445, percentage: 13 },
              { command: '/help', uses: 281, percentage: 8 }
            ].map((cmd, index) => (
              <div key={cmd.command} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 ml-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                    <span className="text-sm font-medium text-gray-900 font-mono">
                      {cmd.command}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-600 font-semibold">
                      {cmd.uses.toLocaleString()} usos
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${cmd.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status dos Serviços */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-100">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            🔧 Status dos Serviços
          </h3>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-4">
            {[
              { service: 'Bot Discord', status: 'online', latency: '120ms' },
              { service: 'API Principal', status: 'online', latency: '45ms' },
              { service: 'Banco de Dados', status: 'online', latency: '12ms' },
              { service: 'Riot Games API', status: 'online', latency: '234ms' },
              { service: 'Discord API', status: 'degraded', latency: '1.2s' }
            ].map((service) => (
              <div key={service.service} className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-3 ${
                    service.status === 'online' ? 'bg-green-400' :
                    service.status === 'degraded' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-900">{service.service}</span>
                </div>
                <div className="flex items-center space-x-3 ml-6 sm:ml-0">
                  <span className="text-xs sm:text-sm text-gray-600 font-mono">{service.latency}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    service.status === 'online' ? 'bg-green-100 text-green-800' :
                    service.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {service.status === 'online' ? '✅ Online' :
                     service.status === 'degraded' ? '⚠️ Degradado' : '❌ Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
