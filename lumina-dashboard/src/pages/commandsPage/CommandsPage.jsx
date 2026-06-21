import HomeNavBar from '../components/homeNavBar/HomeNavBar'

export default function CommandsPage() {
  const commandCategories = [
    {
      name: "League of Legends",
      description: "Comandos relacionados ao League of Legends",
      icon: "🎮",
      color: "from-blue-500 to-purple-600",
      commands: [
        {
          name: "/leagueprofile",
          description: "Exibe o perfil de um jogador do League of Legends",
          usage: "/leagueprofile <região> <servidor> <nome> <tag>",
          example: "/leagueprofile americas br1 Faker T1"
        },
        {
          name: "/leaguematchhistory",
          description: "Mostra o histórico de partidas de um jogador",
          usage: "/leaguematchhistory <região> <servidor> <nome> <tag>",
          example: "/leaguematchhistory americas br1 Faker T1"
        },
        {
          name: "/leaguemastery",
          description: "Mostra a maestria de campeões de um jogador",
          usage: "/leaguemastery <região> <nome> <tag>",
          example: "/leaguemastery americas Faker T1"
        },
        {
          name: "/leaguechampionrotation",
          description: "Mostra os campeões em rotação gratuita",
          usage: "/leaguechampionrotation",
          example: "/leaguechampionrotation"
        },
        {
          name: "/leaguequeuesearch",
          description: "Busca por filas ranqueadas baseado em elo e divisão",
          usage: "/leaguequeuesearch <servidor> <elo> <divisão>",
          example: "/leaguequeuesearch br1 gold II"
        }
      ]
    },
    {
      name: "Moderação",
      description: "Comandos para moderação do servidor",
      icon: "🛡️",
      color: "from-red-500 to-orange-600",
      commands: [
        {
          name: "/ban",
          description: "Bane um usuário do servidor",
          usage: "/ban <usuário> [motivo] [tempo]",
          example: "/ban @usuario spam 7d"
        },
        {
          name: "/mute",
          description: "Silencia um usuário no servidor",
          usage: "/mute <usuário> [motivo] [tempo]",
          example: "/mute @usuario comportamento inadequado 1h"
        },
        {
          name: "/warn",
          description: "Aplica uma advertência a um usuário",
          usage: "/warn <usuário> [motivo] [tempo]",
          example: "/warn @usuario linguagem inapropriada"
        },
        {
          name: "/unban",
          description: "Remove o banimento de um usuário",
          usage: "/unban <usuário>",
          example: "/unban @usuario"
        },
        {
          name: "/unmute",
          description: "Remove o silenciamento de um usuário",
          usage: "/unmute <usuário>",
          example: "/unmute @usuario"
        },
        {
          name: "/unwarn",
          description: "Remove uma advertência de um usuário",
          usage: "/unwarn <usuário>",
          example: "/unwarn @usuario"
        }
      ]
    },
    {
      name: "Sistema de Skins",
      description: "Comandos para o sistema de coleta de skins",
      icon: "💎",
      color: "from-purple-500 to-pink-600",
      commands: [
        {
          name: "/openchest",
          description: "Abre baús para obter skins do League of Legends",
          usage: "/openchest",
          example: "/openchest"
        },
        {
          name: "/inventory",
          description: "Mostra seu inventário de skins (via dashboard)",
          usage: "Acesse /inventory no navegador",
          example: "${import.meta.env.VITE_DASHBOARD_HOST}/inventory"
        }
      ]
    },
    {
      name: "Configuração",
      description: "Comandos para configurar o bot no servidor",
      icon: "⚙️",
      color: "from-green-500 to-teal-600",
      commands: [
        {
          name: "/setuproles",
          description: "Configura cargos de moderação e canal de logs",
          usage: "/setuproles [cargo_mute] [cargo_ban] [canal_moderação]",
          example: "/setuproles @Muted @Banned #moderation"
        },
        {
          name: "/serversettings",
          description: "Visualiza e modifica configurações do servidor",
          usage: "/serversettings",
          example: "/serversettings"
        }
      ]
    },
    {
      name: "Utilidades",
      description: "Comandos úteis e informativos",
      icon: "🔧",
      color: "from-gray-500 to-slate-600",
      commands: [
        {
          name: "/ping",
          description: "Verifica a latência do bot",
          usage: "/ping",
          example: "/ping"
        },
        {
          name: "/server",
          description: "Mostra informações sobre o servidor",
          usage: "/server",
          example: "/server"
        },
        {
          name: "/user",
          description: "Mostra informações sobre um usuário",
          usage: "/user [usuário]",
          example: "/user @usuario"
        },
        {
          name: "/help",
          description: "Mostra a lista de comandos disponíveis",
          usage: "/help",
          example: "/help"
        },
        {
          name: "/dashboard",
          description: "Fornece o link para o dashboard web",
          usage: "/dashboard",
          example: "/dashboard"
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <HomeNavBar />
      
      <div className="px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Comandos do <span className="text-indigo-600">Lumina Bot</span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
              Explore todos os comandos disponíveis do Lumina Bot. Cada comando foi projetado para melhorar sua experiência no Discord.
            </p>
          </div>

          {/* Command Categories */}
          <div className="space-y-16">
            {commandCategories.map((category, categoryIndex) => (
              <div key={category.name} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Category Header */}
                <div className={`bg-gradient-to-r ${category.color} px-8 py-6`}>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{category.icon}</span>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{category.name}</h2>
                      <p className="text-white/80">{category.description}</p>
                    </div>
                  </div>
                </div>

                {/* Commands Grid */}
                <div className="p-8">
                  <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {category.commands.map((command, commandIndex) => (
                      <div key={command.name} className="group border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50">
                        <div className="mb-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-indigo-100 p-2 rounded-lg">
                              <span className="text-indigo-600 font-mono text-sm font-bold">/</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 font-mono group-hover:text-indigo-600 transition-colors">
                              {command.name.slice(1)}
                            </h3>
                          </div>
                          <p className="text-gray-600 leading-relaxed">{command.description}</p>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Sintaxe */}
                          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sintaxe</p>
                            <code className="text-sm text-gray-800 font-mono break-all">
                              {command.usage}
                            </code>
                          </div>
                          
                          {/* Exemplo */}
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border-l-4 border-indigo-400">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-indigo-500">⚡</span>
                              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Exemplo</p>
                            </div>
                            <div className="bg-white/70 rounded-md p-3 border border-indigo-200/50">
                              <code className="text-sm text-indigo-800 font-mono break-all">
                                {command.example}
                              </code>
                            </div>
                          </div>
                        </div>

                        {/* Hover effect indicator */}
                        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Pronto para usar o Lumina Bot?
              </h3>
              <p className="text-gray-600 mb-6">
                Adicione o bot ao seu servidor e comece a usar todos esses comandos incríveis!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={`https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID}`}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                  🔗 Adicionar ao Discord
                </a>
                <a
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-lg font-semibold text-gray-900 shadow-sm hover:bg-gray-50 transition-colors"
                >
                  📊 Acessar Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
