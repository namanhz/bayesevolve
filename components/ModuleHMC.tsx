import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const ModuleHMC: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full items-center justify-center gap-8 p-8">
      <div className="max-w-2xl w-full bg-white p-8 rounded-xl border border-[#d4cdc4] shadow-sm text-center">
        <h2 className="text-3xl font-bold text-[#1a1a1a] mb-6">{t('hmc.title')}</h2>
        
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6 mb-6">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-xl font-bold text-amber-800 mb-3">Module Under Development</h3>
          <p className="text-amber-700 text-base leading-relaxed">
            The Hamiltonian Monte Carlo (HMC) module is currently being developed by the author. 
            This advanced sampling technique will be released in a future update.
          </p>
        </div>

        <div className="bg-[#faf8f5] p-4 rounded border border-[#e8e4df] text-left">
          <h4 className="text-sm font-bold text-[#8b7355] uppercase tracking-wider mb-2">Coming Soon</h4>
          <ul className="text-sm text-[#4a4540] space-y-2">
            <li>• Interactive Hamiltonian dynamics visualization</li>
            <li>• Energy-conserving leapfrog integrator</li>
            <li>• Gradient field exploration</li>
            <li>• Automatic momentum resampling</li>
          </ul>
        </div>

        <div className="mt-6 text-xs text-[#9a9590] italic">
          Stay tuned for updates!
        </div>
      </div>
    </div>
  );
};

export default ModuleHMC;