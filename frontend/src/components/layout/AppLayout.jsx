import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { NotificationProvider } from '../ui/NotificationHub';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = window.localStorage.getItem('amypo_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (_) {}
    return 'light';
  });

  useEffect(() => {
    try {
      document.documentElement.dataset.theme = theme;
      window.localStorage.setItem('amypo_theme', theme);
    } catch (_) {}
  }, [theme]);

  useEffect(() => {
    const onThemeChange = (e) => {
      const next = e?.detail?.theme;
      if (next === 'dark' || next === 'light') setTheme(next);
    };
    window.addEventListener('amypo-theme-change', onThemeChange);
    return () => window.removeEventListener('amypo-theme-change', onThemeChange);
  }, []);

  const toggleTheme = useMemo(() => {
    return () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <NotificationProvider>
      <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden relative">
        {/* Mobile Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <TopNav
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            theme={theme}
            toggleTheme={toggleTheme}
          />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
