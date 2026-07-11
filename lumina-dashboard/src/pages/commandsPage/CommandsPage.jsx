import HomeNavBar from '../components/homeNavBar/HomeNavBar'
import { useT } from '../../i18n/LanguageContext.jsx'

export default function CommandsPage() {
  const t = useT();
  const commandCategories = [
    {
      name: t("commands.categories.league"),
      description: t("commands.categoryDesc.league"),
      icon: "🎮",
      color: "from-blue-500 to-purple-600",
      commands: [
        {
          name: "/leagueprofile",
          description: t("commands.leagueCmd.profile.desc"),
          usage: t("commands.leagueCmd.profile.usage"),
          example: "/leagueprofile americas br1 Faker T1"
        },
        {
          name: "/leaguematchhistory",
          description: t("commands.leagueCmd.matchHistory.desc"),
          usage: t("commands.leagueCmd.matchHistory.usage"),
          example: "/leaguematchhistory americas br1 Faker T1"
        },
        {
          name: "/leaguemastery",
          description: t("commands.leagueCmd.mastery.desc"),
          usage: t("commands.leagueCmd.mastery.usage"),
          example: "/leaguemastery americas Faker T1"
        },
        {
          name: "/leaguechampionrotation",
          description: t("commands.leagueCmd.rotation.desc"),
          usage: t("commands.leagueCmd.rotation.usage"),
          example: "/leaguechampionrotation"
        },
        {
          name: "/leaguequeuesearch",
          description: t("commands.leagueCmd.queuesearch.desc"),
          usage: t("commands.leagueCmd.queuesearch.usage"),
          example: "/leaguequeuesearch br1 gold II"
        }
      ]
    },
    {
      name: t("commands.categories.moderation"),
      description: t("commands.categoryDesc.moderation"),
      icon: "🛡️",
      color: "from-red-500 to-orange-600",
      commands: [
        {
          name: "/ban",
          description: t("commands.moderationCmd.ban.desc"),
          usage: t("commands.moderationCmd.ban.usage"),
          example: "/ban @usuario spam 7d"
        },
        {
          name: "/mute",
          description: t("commands.moderationCmd.mute.desc"),
          usage: t("commands.moderationCmd.mute.usage"),
          example: "/mute @usuario comportamento inadequado 1h"
        },
        {
          name: "/warn",
          description: t("commands.moderationCmd.warn.desc"),
          usage: t("commands.moderationCmd.warn.usage"),
          example: "/warn @usuario linguagem inapropriada"
        },
        {
          name: "/unban",
          description: t("commands.moderationCmd.unban.desc"),
          usage: t("commands.moderationCmd.unban.usage"),
          example: "/unban @usuario"
        },
        {
          name: "/unmute",
          description: t("commands.moderationCmd.unmute.desc"),
          usage: t("commands.moderationCmd.unmute.usage"),
          example: "/unmute @usuario"
        },
        {
          name: "/unwarn",
          description: t("commands.moderationCmd.unwarn.desc"),
          usage: t("commands.moderationCmd.unwarn.usage"),
          example: "/unwarn @usuario"
        }
      ]
    },
    {
      name: t("commands.categories.chests"),
      description: t("commands.categoryDesc.chests"),
      icon: "💎",
      color: "from-purple-500 to-pink-600",
      commands: [
        {
          name: "/openchest",
          description: t("commands.chestsCmd.openchest.desc"),
          usage: t("commands.chestsCmd.openchest.usage"),
          example: "/openchest"
        },
        {
          name: "/daily",
          description: t("commands.chestsCmd.daily.desc"),
          usage: t("commands.chestsCmd.daily.usage"),
          example: "/daily"
        },
        {
          name: "/inventory",
          description: t("commands.chestsCmd.inventory.desc"),
          usage: t("commands.chestsCmd.inventory.usage"),
          example: "https://bot.luminasink.com/inventory"
        }
      ]
    },
    {
      name: t("commands.categories.setup"),
      description: t("commands.categoryDesc.setup"),
      icon: "⚙️",
      color: "from-green-500 to-teal-600",
      commands: [
        {
          name: "/setuproles",
          description: t("commands.setupCmd.setuproles.desc"),
          usage: t("commands.setupCmd.setuproles.usage"),
          example: "/setuproles @Muted @Banned #moderation"
        },
        {
          name: "/serversettings",
          description: t("commands.setupCmd.serversettings.desc"),
          usage: t("commands.setupCmd.serversettings.usage"),
          example: "/serversettings"
        }
      ]
    },
    {
      name: t("commands.categories.utility"),
      description: t("commands.categoryDesc.utility"),
      icon: "🔧",
      color: "from-gray-500 to-slate-600",
      commands: [
        {
          name: "/ping",
          description: t("commands.utilityCmd.ping.desc"),
          usage: t("commands.utilityCmd.ping.usage"),
          example: "/ping"
        },
        {
          name: "/server",
          description: t("commands.utilityCmd.server.desc"),
          usage: t("commands.utilityCmd.server.usage"),
          example: "/server"
        },
        {
          name: "/user",
          description: t("commands.utilityCmd.user.desc"),
          usage: t("commands.utilityCmd.user.usage"),
          example: "/user @usuario"
        },
        {
          name: "/help",
          description: t("commands.utilityCmd.help.desc"),
          usage: t("commands.utilityCmd.help.usage"),
          example: "/help"
        },
        {
          name: "/dashboard",
          description: t("commands.utilityCmd.dashboard.desc"),
          usage: t("commands.utilityCmd.dashboard.usage"),
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
              {t('commands.title')} <span className="text-indigo-600">Lumina Bot</span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
              {t('commands.subtitle')}
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
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("commands.syntax")}</p>
                            <code className="text-sm text-gray-800 font-mono break-all">
                              {command.usage}
                            </code>
                          </div>
                          
                          {/* Exemplo */}
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border-l-4 border-indigo-400">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-indigo-500">⚡</span>
                              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{t("commands.example")}</p>
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
                {t('commands.ready')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('commands.readyDesc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={`https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID}`}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                  🔗 {t('commands.addBot')}
                </a>
                <a
                  href="/members"
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-lg font-semibold text-gray-900 shadow-sm hover:bg-gray-50 transition-colors"
                >
                  📊 {t('commands.membersArea')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
