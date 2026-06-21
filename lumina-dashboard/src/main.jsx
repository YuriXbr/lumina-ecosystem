import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import withAuth from './withAuth';
import './index.css';
import DashboardPage from './pages/dashboardPage/DashboardPage.jsx';
import LoginPage from './pages/loginPage/LoginPage.jsx';
import HomePage from './pages/homePage/HomePage.jsx';
import DashboardSettingsPage from './pages/dashboardPage/DashboardSettingsPage.jsx';
import PricingPage from './pages/pricingPage/PricingPage.jsx';
import NotFoundPage from './pages/notFoundPage/NotFoundPage.jsx';
import TermsPage from './pages/termsOfUsePage/TermsOfUsePage.jsx';
import RegisterPage from './pages/registerPage/RegisterPage.jsx';
import BotAdminPage from './pages/botAdminPage/BotAdminPage.jsx';
import AboutPage from './pages/aboutPage/AboutPage.jsx';
import InventoryPage from './pages/inventoryPage/InventoryPage.jsx';
import CommandsPage from './pages/commandsPage/CommandsPage.jsx';

export const DashboardWithAuth = withAuth(DashboardPage);
export const SettingsWithAuth = withAuth(DashboardSettingsPage);

export function AppRoutes() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/index" element={<HomePage />} />
          <Route path="/index.html" element={<HomePage />} />
          <Route path="/admin" element={<BotAdminPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='/about' element={<AboutPage />} />
          <Route path='/commands' element={<CommandsPage />} />
          <Route path='/pricing' element={<PricingPage />} />
          <Route path="/dashboard" element={<DashboardWithAuth />} />
          <Route path="/dashboard/settings" element={<SettingsWithAuth />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path='/terms' element={<TermsPage />} />
          <Route path='/inventory' element={<InventoryPage />} />
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