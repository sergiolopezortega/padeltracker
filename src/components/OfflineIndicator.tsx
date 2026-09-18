import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-xl border border-slate-700/50"
        >
          <WifiOff size={16} className="text-amber-400 shrink-0 animate-pulse" />
          <span>Modo sin conexión — Mostrando datos en caché.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
