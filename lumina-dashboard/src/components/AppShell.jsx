import { Link, useLocation } from 'react-router-dom';
import {
  Cog6ToothIcon, ShieldCheckIcon, UserIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import Header from './Header';
import { useT } from '../i18n/LanguageContext.jsx';

/**
 * AppShell — subheader abaixo do Header principal.
 *
 * Estrutura:
 *   <Header />          (header principal, em todas as páginas)
 *   <SubHeader />       (navegação contextual: engrenagem/escudo para /settings,/admin, etc)
 *   <main>{children}</main>
 *
 * O SubHeader adapta-se à rota atual:
 *   - /settings → mostra título "Configurações" + link escudo (admin)
 *   - /admin    → mostra título "Painel Admin" + tabs internas (passadas via children)
 *   - /server/:id → mostra título do servidor + botão voltar
 *   - /members  → NÃO mostra subheader (MembersAreaPage tem seu próprio layout)
 */
export default function AppShell({ children, maxWidth = 'max-w-7xl', title, subtitle, backTo, backLabel }) {
  const t = useT();
  const location = useLocation();

  const isAdmin = location.pathname.startsWith('/admin');
  const isSettings = location.pathname.startsWith('/settings');
  const isServer = location.pathname.startsWith('/server/');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Subheader contextual */}
      {(title || isAdmin || isSettings || isServer) && (
        <div className="bg-white border-b border-gray-200">
          <div className={`mx-auto ${maxWidth} px-4 sm:px-6 lg:px-8`}>
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3 min-w-0">
                {backTo && (
                  <Link
                    to={backTo}
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-purple-700"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{backLabel || t('common.back')}</span>
                  </Link>
                )}
                {title && (
                  <div className="min-w-0">
                    <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>
                    {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className={`mx-auto ${maxWidth} px-4 sm:px-6 lg:px-8 py-6 sm:py-8`}>
        {children}
      </main>
    </div>
  );
}
