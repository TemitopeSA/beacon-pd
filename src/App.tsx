import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider } from './state/store';
import { TourProvider } from './tour/TourProvider';
import { GuidePanel, TourOverlay, WelcomeModal } from './tour/TourOverlay';
import { AppLayout } from './components/Layout';
import { Toaster } from './components/ui';
import { HomePage } from './pages/Home';
import { OverviewPage } from './pages/Overview';
import { VisibilityPage } from './pages/Visibility';
import { LoyaltyBridgePage } from './pages/LoyaltyBridge';
import { ResultsPage } from './pages/Results';
import { CustomerProfilePage, CustomersPage } from './pages/Customers';
import { HoursPage, LoyaltyPage, MarketingPage, MenuPage, OliviaPage, OrdersPage, UsersPage } from './pages/Other';

const TITLES: [string, string][] = [
  ['/ai-channels/overview', 'AI Channels'],
  ['/ai-channels/visibility', 'AI Visibility'],
  ['/ai-channels/loyalty-bridge', 'Loyalty Bridge'],
  ['/ai-channels/results', 'Beacon Results'],
  ['/customers/', 'Customer'],
  ['/customers', 'Customers'],
  ['/orders', 'Orders'],
  ['/menu', 'Menu'],
  ['/loyalty', 'Loyalty'],
  ['/marketing', 'Marketing'],
  ['/operations', 'Operational Times'],
  ['/settings', 'User Management'],
];

function ScrollAndTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const t = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? 'Home';
    document.title = `${t} · Per Diem Beacon (concept)`;
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <TourProvider>
          <ScrollAndTitle />
          <Routes>
            <Route
              element={
                <AppLayout
                  overlays={
                    <>
                      <WelcomeModal />
                      <TourOverlay />
                      <GuidePanel />
                      <Toaster />
                    </>
                  }
                />
              }
            >
              <Route index element={<HomePage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="menu" element={<MenuPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerProfilePage />} />
              <Route path="loyalty" element={<LoyaltyPage />} />
              <Route path="marketing" element={<Navigate to="/marketing/push" replace />} />
              <Route path="marketing/push" element={<MarketingPage key="push" channel="push" />} />
              <Route path="marketing/sms" element={<MarketingPage key="sms" channel="sms" />} />
              <Route path="marketing/email" element={<MarketingPage key="email" channel="email" />} />
              <Route path="marketing/olivia" element={<OliviaPage />} />
              <Route path="ai-channels" element={<Navigate to="/ai-channels/overview" replace />} />
              <Route path="ai-channels/overview" element={<OverviewPage />} />
              <Route path="ai-channels/visibility" element={<VisibilityPage />} />
              <Route path="ai-channels/loyalty-bridge" element={<LoyaltyBridgePage />} />
              <Route path="ai-channels/results" element={<ResultsPage />} />
              <Route path="operations" element={<Navigate to="/operations/hours" replace />} />
              <Route path="operations/hours" element={<HoursPage />} />
              <Route path="settings" element={<Navigate to="/settings/users" replace />} />
              <Route path="settings/users" element={<UsersPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </TourProvider>
      </StoreProvider>
    </BrowserRouter>
  );
}
