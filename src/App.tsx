import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/hooks/useAppStore';
import DesktopApp from './DesktopApp';
import MobileApp from './MobileApp';

function RootRedirect() {
  const [target, setTarget] = useState<'desktop' | 'mobile' | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setTarget(mq.matches ? 'mobile' : 'desktop');

    const handler = (e: MediaQueryListEvent) => {
      setTarget(e.matches ? 'mobile' : 'desktop');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!target) return null;
  return <Navigate to={`/${target}`} replace />;
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/desktop" element={<DesktopApp />} />
        <Route path="/mobile" element={<MobileApp />} />
        <Route path="/mobile/:code" element={<MobileApp />} />
      </Routes>
    </AppProvider>
  );
}
