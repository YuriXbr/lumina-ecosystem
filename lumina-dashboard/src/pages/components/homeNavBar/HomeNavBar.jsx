import { useState, useEffect } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import monochrome from '../../assets/monochromeBlack.svg'
import { checkSession, API_BASE } from '../../../utils/apiFetch'
import { useT } from '../../../i18n/LanguageContext.jsx'

export default function HomeNavBar() {
  const t = useT();
  const navigation = [
    { name: t('nav.commands'), href: '/commands' },
    { name: t('nav.inventory'), href: '/inventory' },
    { name: t('nav.pricing'), href: '/pricing' },
    { name: t('nav.about'), href: '/about' },
  ]

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [discordInfo, setDiscordInfo] = useState(null)

  useEffect(() => {
    // Usa /session para verificar se está logado (cookie httpOnly)
    checkSession()
      .then(async data => {
        if (data.authenticated && data.user) {
          setIsLoggedIn(true)
          // Busca info adicional do Discord (avatar/username)
          try {
            const res = await fetch(`${API_BASE}expapi/v1/discordinfo`, {
              credentials: 'include',
            })
            if (res.ok) {
              const info = await res.json()
              setDiscordInfo(info)
            }
          } catch {}
        }
      })
      .catch(() => setIsLoggedIn(false))
  }, [])

  const avatarUrl = discordInfo?.avatar && discordInfo?.id
    ? `https://cdn.discordapp.com/avatars/${discordInfo.id}/${discordInfo.avatar}.png`
    : null

  return (
    <div className="bg-white">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav aria-label="Global" className="flex items-center justify-between p-6 lg:px-8">
          <div className="flex lg:flex-1">
            <a href={isLoggedIn ? '/members' : '/'} className="-m-1.5 p-1.5">
              <span className="sr-only">LuminaBot</span>
              <img alt="LuminaBot" src={monochrome} className="h-4 w-auto" />
            </a>
          </div>

          {/* Botão hambúrguer mobile */}
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            >
              <span className="sr-only">{t('common.openMenu', { defaultValue: 'Open menu' })}</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6" />
            </button>
          </div>

          {/* Links de navegação desktop */}
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map((item) => (
              <a key={item.name} href={item.href} className="text-sm font-semibold leading-6 text-gray-900">
                {item.name}
              </a>
            ))}
          </div>

          {/* Área de auth desktop */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            {isLoggedIn ? (
              <a
                href="/members"
                className="flex items-center space-x-2 text-sm font-semibold leading-6 text-gray-900 hover:text-gray-600 transition-colors"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-6 h-6 rounded-full border border-gray-200"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  // Placeholder genérico enquanto discordinfo carrega ou sem Discord vinculado
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">
                    {discordInfo?.username?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
                <span>{discordInfo?.username || t('nav.dashboard')}</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
            ) : (
              <a href="/login" className="text-sm font-semibold leading-6 text-gray-900">
                {t('nav.login')} <span aria-hidden="true">&rarr;</span>
              </a>
            )}
          </div>
        </nav>

        {/* Menu mobile */}
        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
          <div className="fixed inset-0 z-50" />
          <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <a href={isLoggedIn ? '/members' : '/'} className="-m-1.5 p-1.5">
                <span className="sr-only">LuminaBot</span>
                <img alt="LuminaBot" src={monochrome} className="h-8 w-auto" />
              </a>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
              >
                <span className="sr-only">{t('common.closeMenu', { defaultValue: 'Close menu' })}</span>
                <XMarkIcon aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
                <div className="py-6">
                  {isLoggedIn ? (
                    <a
                      href="/members"
                      className="-mx-3 flex items-center space-x-3 rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-7 h-7 rounded-full border border-gray-200"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">
                          {discordInfo?.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                      <span>{discordInfo?.username || t('nav.dashboard')}</span>
                    </a>
                  ) : (
                    <a
                      href="/login"
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    >
                      {t('nav.login')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>
    </div>
  )
}