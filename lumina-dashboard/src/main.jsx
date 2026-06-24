import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
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

import DashboardPage from './pages/dashboardPage/DashboardPage.jsx';
import DashboardSettingsPage from './pages/dashboardPage/DashboardSettingsPage.jsx';
import BotAdminPage from './pages/botAdminPage/BotAdminPage.jsx';

import NotFoundPage from './pages/notFoundPage/NotFoundPage.jsx';
export const DashboardWithAuth = withAuth(DashboardPage);
export const SettingsWithAuth = withAuth(DashboardSettingsPage);

export function AppRoutes() {
  return (
    <UserProvider>
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
          
          <Route path="/dashboard" element={<DashboardWithAuth />} />
          <Route path="/dashboard/settings" element={<SettingsWithAuth />} />
          <Route path="/admin" element={<BotAdminPage />} />
          
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRoutes />
  </StrictMode>,
);