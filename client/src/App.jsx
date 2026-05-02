import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import './i18n/index';

import Navbar from './components/common/Navbar';
import MobileBottomNav from './components/common/MobileBottomNav';
import EmergencyBanner from './components/common/EmergencyBanner';
import ToastContainer from './components/common/Toast';

import Landing from './pages/Landing';
import Search from './pages/Search';
import Results from './pages/Results';
import HospitalDetail from './pages/HospitalDetail';
import PMJAYCheck from './pages/PMJAYCheck';
import DrugComparator from './pages/DrugComparator';
import Telemedicine from './pages/Telemedicine';
import About from './pages/About';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

// Page title updater
function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const titles = {
      '/': 'HealthAssist — AI Healthcare Navigator for India',
      '/search': 'Search Hospitals & Costs — HealthAssist',
      '/results': 'Hospital Results — HealthAssist',
      '/pmjay-check': 'PMJAY Eligibility Checker — HealthAssist',
      '/drug-comparator': 'Generic Drug Comparator — HealthAssist',
      '/telemedicine': 'Telemedicine Triage — HealthAssist',
      '/about': 'About HealthAssist Healthcare Navigator',
    };
    document.title = titles[pathname] || 'HealthAssist Healthcare Navigator';
  }, [pathname]);
  return null;
}

function AppLayout() {
  return (
    <>
      <ScrollToTop />
      <PageTitle />
      <Navbar />
      <EmergencyBanner />
      <ToastContainer />
      
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/search" element={<Search />} />
        <Route path="/results" element={<Results />} />
        <Route path="/hospital/:id" element={<HospitalDetail />} />
        <Route path="/pmjay-check" element={<PMJAYCheck />} />
        <Route path="/drug-comparator" element={<DrugComparator />} />
        <Route path="/telemedicine" element={<Telemedicine />} />
        <Route path="/about" element={<About />} />
        {/* 404 */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-bg-main pt-16">
            <div className="text-center">
              <p className="text-6xl font-display font-extrabold text-primary mb-4">404</p>
              <p className="text-xl text-text-primary font-semibold mb-2">Page not found</p>
              <a href="/" className="text-primary hover:underline">← Go back home</a>
            </div>
          </div>
        } />
      </Routes>

      <MobileBottomNav />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AppProvider>
  );
}
