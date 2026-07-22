import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, title, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-80">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
              className={`p-4 rounded-2xl shadow-xl border flex gap-3 items-start backdrop-blur-md ${
                n.type === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800' :
                n.type === 'error' ? 'bg-red-50/90 border-red-100 text-red-800' :
                'bg-white/90 border-gray-100 text-gray-800'
              }`}
            >
              <div className="mt-0.5">
                {n.type === 'success' ? <CheckCircle2 size={20} /> :
                 n.type === 'error' ? <AlertCircle size={20} /> :
                 <Info size={20} />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-black tracking-tight">{n.title}</div>
                <div className="text-xs font-medium opacity-80 leading-relaxed mt-0.5">{n.message}</div>
              </div>
              <button 
                onClick={() => removeNotification(n.id)}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}
