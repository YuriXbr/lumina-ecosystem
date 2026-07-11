import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import ConsentModal from './components/ConsentModal.jsx';
import withAuth from './withAuth';
import './index.css';
import RegisterPage from './pages/registerPage/RegisterPage.jsx';
import LoginPage from './pages/loginPage/LoginPage.jsx';
import OAuthCompletePage from './pages/oauthCompletePage/OAuthCompletePage.jsx';

import HomePage from './pages/homePage/HomePage.jsx';
import PricingPage from './pages/pricingPage/PricingPage.jsx';
import TermsPage from './pages/termsOfUsePage/TermsOfUsePage.jsx';
import AboutPage from './pages/aboutPage/AboutPage.jsx';
import InventoryPage from './pages/inventoryPage/InventoryPage.jsx';
import CommandsPage from './pages/commandsPage/CommandsPage.jsx';

// Novas páginas do redesign
import MembersAreaPage from './pages/membersAreaPage/MembersAreaPage.jsx';
import SettingsPage from './pages/settingsPage/SettingsPage.jsx';
import AdminPage from './pages/adminPage/AdminPage.jsx';
import ServerSettingsPage from './pages/serverSettingsPage/ServerSettingsPage.jsx';
import PublicProfilePage from './pages/publicProfilePage/PublicProfilePage.jsx';

import NotFoundPage from './pages/notFoundPage/NotFoundPage.jsx';

export const SettingsWithAuth = withAuth(SettingsPage);
export const AdminWithAuth = withAuth(AdminPage);
export const ServerSettingsWithAuth = withAuth(ServerSettingsPage);

export function AppRoutes() {
  return (
    <UserProvider>
      <LanguageProvider>
        <Router>
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/complete" element={<OAuthCompletePage />} />

          <Route path="/home" element={<HomePage />} />
          <Route path="/index" element={<HomePage />} />
          <Route path="/index.html" element={<HomePage />} />
          <Route path='/pricing' element={<PricingPage />} />
          <Route path='/terms' element={<TermsPage />} />
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
        </Routes>
        </Router>
      <ConsentModal />
      </LanguageProvider>
    </UserProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRoutes />
  </StrictMode>,
);
