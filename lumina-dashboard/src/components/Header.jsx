import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogPanel } from '@headlessui/react';
import {
  Bars3Icon, XMarkIcon, UserCircleIcon,
  Cog6ToothIcon, ShieldCheckIcon, ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { useT } from '../i18n/LanguageContext.jsx';
import monochromeLogo from '../pages/assets/monochromeBlack.svg';

/**
 * Header principal — presente em TODAS as páginas do produto.
 *
 * Navegação:
 *   - Logo → /members (logado) ou / (não logado)
 *   - Links públicos: Comandos, Inventário, Assinaturas, Sobre
 *   - Quando logado: avatar + dropdown com /members, /settings, /admin (se staff), Sair
 *
 * É o "header principal" do produto. Subheaders (tabs internas de /settings, /admin,
 * e a topbar antiga do AppShell) ficam abaixo deste, em suas próprias páginas.
 */
const NAV_LINK_KEYS = [
  { labelKey: 'nav.commands', href: '/commands' },
  { labelKey: 'nav.inventory', href: '/inventory' },
  { labelKey: 'nav.pricing', href: '/pricing' },
  { labelKey: 'nav.about', href: '/about' },
];

export default function Header() {
  const t = useT();
  const { user, loading, isAdmin, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fecha menus ao trocar de rota
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = () => setUserMenuOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [userMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const avatarUrl = user && ((user.id && user.avatar) || (user.discordOauth2Id && user.discordAvatar))
    ? `https://cdn.discordapp.com/avatars/${user.id || user.discordOauth2Id}/${user.avatar || user.discordAvatar}.png?size=64`
    : null;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Lado esquerdo: logo + nav desktop */}
          <div className="flex items-center gap-6">
            <Link to={user ? '/members' : '/'} className="flex items-center gap-2 group">
              <img src={monochromeLogo} alt="Lumina Bot" className="h-6 w-auto" />
            </Link>

            <nav className="hidden md:flex items-center gap-5">
              {NAV_LINK_KEYS.map(item => {
                const active = location.pathname === item.href ||
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`text-sm font-medium transition-colors ${
                      active ? 'text-purple-700' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Lado direito: auth state */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />
            ) : user ? (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
                  className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label={t("common.openMenu")}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full border border-gray-200"
                      onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <span className={`h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-700 ${avatarUrl ? 'hidden' : ''}`}>
                    {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                  </span>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
                    {user.displayName || user.firstName || user.username || t('common.account')}
                  </span>
                </button>

                {/* Dropdown do usuário */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.displayName || `${user.firstName} ${user.lastName}`}
                      </p>
                      {user.username && (
                        <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                      )}
                      <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                    </div>
                    <Link to="/members" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <UserCircleIcon className="h-4 w-4" />
                      {t('header.area')}
                    </Link>
                    <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Cog6ToothIcon className="h-4 w-4" />
                      {t('header.settings')}
                    </Link>
                    {isAdmin() && (
                      <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-purple-700 hover:bg-purple-50">
                        <ShieldCheckIcon className="h-4 w-4" />
                        {t('header.adminPanel')}
                      </Link>
                    )}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        {t('common.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-purple-700">
                  {t('header.login')}
                </Link>
                <Link to="/register" className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700">
                  {t('header.signup')}
                </Link>
              </div>
            )}

            {/* Botão hambúrguer mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              aria-label={t("common.openMenu")}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="md:hidden relative z-50">
        <div className="fixed inset-0 bg-black/30" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-white shadow-xl overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <img src={monochromeLogo} alt="Lumina Bot" className="h-5 w-auto" />
            <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-gray-500">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <nav className="p-2 space-y-1">
            {NAV_LINK_KEYS.map(item => (
              <Link
                key={item.href}
                to={item.href}
                className="block px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <div className="border-t border-gray-100 my-2" />
            {user ? (
              <>
                <Link to="/members" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                  <UserCircleIcon className="h-5 w-5" />
                  {t('header.area')}
                </Link>
                <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                  <Cog6ToothIcon className="h-5 w-5" />
                  {t('header.settings')}
                </Link>
                {isAdmin() && (
                  <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-purple-700 hover:bg-purple-50">
                    <ShieldCheckIcon className="h-5 w-5" />
                    {t('header.adminPanel')}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  {t('common.logout')}
                </button>
              </>
            ) : (
              <div className="space-y-1 pt-2">
                <Link to="/login" className="block px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                  {t('header.login')}
                </Link>
                <Link to="/register" className="block px-3 py-2.5 rounded-md text-sm font-medium text-white bg-purple-600 text-center">
                  {t('header.signup')}
                </Link>
              </div>
            )}
          </nav>
        </DialogPanel>
      </Dialog>
    </header>
  );
}
