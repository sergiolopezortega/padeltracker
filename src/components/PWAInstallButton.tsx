import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-emerald-200"
        title="Instalar App en el móvil"
      >
        <Download size={15} />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow or generic mobile prompt
  return (
    <>
      <button
        onClick={() => setShowIOSGuide(true)}
        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
        title="Instalar en el móvil"
      >
        <Smartphone size={15} className="text-emerald-600" />
        <span>Instalar App</span>
      </button>

      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-7 shadow-2xl border border-white/20"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Instalar en tu móvil</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Úsala como una app nativa</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-5 space-y-4">
                <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="bg-white p-2 rounded-xl shadow-xs text-emerald-600 shrink-0 mt-0.5">
                    <Share2 size={16} />
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-900 block font-bold mb-0.5">Paso 1</strong>
                    En el navegador (Safari o Chrome), pulsa el botón de <strong>Compartir</strong> en la barra inferior o menú.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="bg-white p-2 rounded-xl shadow-xs text-emerald-600 shrink-0 mt-0.5">
                    <PlusSquare size={16} />
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-900 block font-bold mb-0.5">Paso 2</strong>
                    Desplaza hacia abajo y selecciona <strong>«Añadir a pantalla de inicio»</strong>.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all active:scale-[0.98] shadow-md shadow-slate-200"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
