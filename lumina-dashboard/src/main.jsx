import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import ConsentModal from './components/ConsentModal.jsx';
import withAuth from './withAuth';
import './index.css';
import { initTelemetry } from './utils/telemetry';
initTelemetry();
import Header from './components/Header';
import SiteFooter from './components/SiteFooter';
import PageState from './components/PageState';
import RouteFrame from './components/RouteFrame';
const RegisterPage = lazy(() => import('./pages/registerPage/RegisterPage.jsx'));
const LoginPage = lazy(() => import('./pages/loginPage/LoginPage.jsx'));
const OAuthCompletePage = lazy(() => import('./pages/oauthCompletePage/OAuthCompletePage.jsx'));

const HomePage = lazy(() => import('./pages/homePage/HomePage.jsx'));
const PricingPage = lazy(() => import('./pages/pricingPage/PricingPage.jsx'));
const LegalPage = lazy(() => import('./pages/legalPage/LegalPage.jsx'));
const TermsPage = lazy(() => import('./pages/termsOfUsePage/TermsOfUsePage.jsx'));
const AboutPage = lazy(() => import('./pages/aboutPage/AboutPage.jsx'));
const InventoryPage = lazy(() => import('./pages/inventoryPage/InventoryPage.jsx'));
const CommandsPage = lazy(() => import('./pages/commandsPage/CommandsPage.jsx'));

// Novas páginas do redesign
const MembersAreaPage = lazy(() => import('./pages/membersAreaPage/MembersAreaPage.jsx'));
const SettingsPage = lazy(() => import('./pages/settingsPage/SettingsPage.jsx'));
const AdminPage = lazy(() => import('./pages/adminPage/AdminPage.jsx'));
const ServerSettingsPage = lazy(() => import('./pages/serverSettingsPage/ServerSettingsPage.jsx'));
const PublicProfilePage = lazy(() => import('./pages/publicProfilePage/PublicProfilePage.jsx'));

const NotFoundPage = lazy(() => import('./pages/notFoundPage/NotFoundPage.jsx'));

const EmailCodePage = lazy(() => import('./pages/emailCodePage/EmailCodePage'));
const RejectCodePage = lazy(() => import('./pages/emailCodePage/RejectCodePage'));

export const SettingsWithAuth = withAuth(SettingsPage);
export const AdminWithAuth = withAuth(AdminPage);
export const ServerSettingsWithAuth = withAuth(ServerSettingsPage);

export function AppRoutes() {
  return (
    <UserProvider>
      <LanguageProvider>
        <Router>
          <a href="#page-content" className="lumina-skip">Pular para o conteúdo</a>
          <Header />
          {import.meta.env.DEV && import.meta.env.VITE_UI_REVIEW === "true" && <p role="status" className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm text-center p-2">Revisão visual · dados simulados · sem alterações em produção</p>}
          <div id="page-content" tabIndex={-1} className="focus:outline-none">
          <RouteFrame><Suspense fallback={<PageState title="Carregando página…" loading />}><Routes>
          <Route path="/" element={<HomePage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<EmailCodePage purpose="verify" />} />
          <Route path="/forgot-password" element={<EmailCodePage purpose="reset" />} />
          <Route path="/security/code" element={<RejectCodePage />} />
          <Route path="/oauth/complete" element={<OAuthCompletePage />} />

          <Route path="/home" element={<HomePage />} />
          <Route path="/index" element={<HomePage />} />
          <Route path="/index.html" element={<HomePage />} />
          <Route path='/pricing' element={<PricingPage />} />
          <Route path='/terms' element={<TermsPage />} />
          <Route path='/privacy' element={<LegalPage type='privacy' />} />
          <Route path='/cookies' element={<LegalPage type='cookies' />} />
          <Route path='/politica-de-privacidade' element={<Navigate to='/privacy' replace />} />
          <Route path='/termos-de-uso' element={<Navigate to='/terms' replace />} />
          <Route path='/about' element={<AboutPage />} />
          <Route path='/inventory' element={<InventoryPage />} />
          <Route path='/commands' element={<CommandsPage />} />

          {/* Novas rotas do redesign */}
          <Route path="/members" element={<MembersAreaPage />} />
          <Route path="/settings" element={<SettingsWithAuth />} />
          <Route path="/admin" element={<AdminWithAuth />} />
          <Route path="/server/:guildId" element={<ServerSettingsWithAuth />} />
          <Route path="/u/:identifier" element={<PublicProfilePage />} />

          {/* Compatibilidade: redireciona URLs antigas */}
          <Route path="/dashboard" element={<Navigate to="/members" replace />} />
          <Route path="/dashboard/settings" element={<Navigate to="/settings" replace />} />

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes></Suspense></RouteFrame>
          </div>
          <SiteFooter />
          <ConsentModal />
        </Router>
      </LanguageProvider>
    </UserProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRoutes />
  </StrictMode>,
);
