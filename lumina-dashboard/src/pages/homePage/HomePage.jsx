'use client'

import HomeNavBar from '../components/homeNavBar/HomeNavBar'
import { useT } from '../../i18n/LanguageContext.jsx'

export default function HomePage() {
  const t = useT();

  const features = [
    {
      title: t('home.features.league.title'),
      description: t('home.features.league.desc'),
      icon: "🎮",
      commands: ["/leagueprofile", "/leaguematchhistory", "/leaguemastery", "/leaguechampionrotation", "/leaguequeuesearch"]
    },
    {
      title: t('home.features.moderation.title'),
      description: t('home.features.moderation.desc'),
      icon: "🛡️",
      commands: ["/ban", "/mute", "/warn", "/setuproles", "/serversettings"]
    },
    {
      title: t('home.features.chests.title'),
      description: t('home.features.chests.desc'),
      icon: "💎",
      commands: ["/openchest", "/inventory"]
    },
    {
      title: t('commands.categories.utility'),
      description: t('home.features.dashboard.desc'),
      icon: "🔧",
      commands: ["/ping", "/server", "/user", "/help", "/dashboard"]
    }
  ]

  const stats = [
    { number: "25+", label: t('home.hero.stats.commands') },
    { number: "6", label: t('commands.title') },
    { number: "24/7", label: "Online" },
    { number: "Beta", label: t('about.subtitle') }
  ]

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
        <HomeNavBar />

        {/* Hero Section */}
        <section className="relative px-6 pt-14 lg:px-8">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="polygon-background opacity-20"/>
          </div>

          <div className="mx-auto max-w-7xl py-24 sm:py-32">
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-2 ring-indigo-600/20 hover:ring-indigo-600/30 bg-white/50 backdrop-blur-sm">
                  🚀 {t('home.hero.badge')}{' '}
                  <a href="https://github.com/" className="font-semibold text-indigo-600">
                    <span aria-hidden="true" className="absolute inset-0" />
                    GitHub <span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
              </div>

              <h1 className="text-6xl font-bold tracking-tight text-gray-900 sm:text-8xl">
                <span className="text-indigo-600">Lumina</span> Bot
              </h1>

              <p className="mt-6 text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
                {t('home.hero.subtitle')}
              </p>

              <div className="mt-10 flex items-center justify-center gap-x-6">
                <a
                  href={`https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID}`}
                  className="rounded-md bg-indigo-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-200"
                >
                  🔗 {t('members.servers.addBot')}
                </a>
                <a href="/members" className="text-lg font-semibold leading-6 text-gray-900 hover:text-indigo-600 transition-colors">
                  {t('nav.members')} <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white/50 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:max-w-none">
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  {t('home.features.subtitle')}
                </h2>
                <p className="mt-4 text-lg leading-8 text-gray-600">
                  {t('home.hero.subtitle')}
                </p>
              </div>
              <dl className="mt-16 grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl text-center sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col bg-gray-400/5 p-8">
                    <dt className="text-sm font-semibold leading-6 text-gray-600">{stat.label}</dt>
                    <dd className="order-first text-3xl font-semibold tracking-tight text-gray-900">{stat.number}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {t('home.features.title')}
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                {t('home.features.subtitle')}
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature.title} className="flex flex-col bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900">
                      <span className="text-3xl">{feature.icon}</span>
                      {feature.title}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                      <p className="flex-auto">{feature.description}</p>
                      <div className="mt-6">
                        <p className="text-sm font-semibold text-indigo-600 mb-2">{t('commands.title')}:</p>
                        <div className="flex flex-wrap gap-2">
                          {feature.commands.map((command) => (
                            <span
                              key={command}
                              className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10"
                            >
                              {command}
                            </span>
                          ))}
                        </div>
                      </div>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-indigo-600">
          <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t('home.hero.cta')}
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-indigo-200">
                {t('home.hero.subtitle')}
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <a
                  href={`https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID}`}
                  className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200"
                >
                  {t('members.servers.addBot')}
                </a>
                <a href="/members" className="text-lg font-semibold leading-6 text-white hover:text-indigo-200 transition-colors">
                  {t('nav.members')} <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
            <div className="flex justify-center space-x-6 md:order-2">
              <a href="https://github.com/" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
            <div className="mt-8 md:order-1 md:mt-0">
              <p className="text-center text-xs leading-5 text-gray-500">
                &copy; 2024 Lumina Bot. {t('about.description')}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
