import React from 'react';
import { ModuleType } from '../types';
import { Home, BookOpen, Activity, Grid, Zap, Sparkles, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
  currentModule: ModuleType;
  onModuleChange: (m: ModuleType) => void;
  children: React.ReactNode;
}

const navItems = [
  { id: ModuleType.HOME, labelKey: 'nav.home', icon: Home },
  { id: ModuleType.ANALYTICAL, labelKey: 'nav.analytical', icon: BookOpen },
  { id: ModuleType.METROPOLIS, labelKey: 'nav.metropolis', icon: Activity },
  { id: ModuleType.GIBBS, labelKey: 'nav.gibbs', icon: Grid },
  { id: ModuleType.HMC, labelKey: 'nav.hmc', icon: Zap },
  { id: ModuleType.VARIATIONAL, labelKey: 'nav.variational', icon: Sparkles },
];

const Layout: React.FC<LayoutProps> = ({ currentModule, onModuleChange, children }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#faf8f5] text-[#1a1a1a]">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-72 bg-[#f0ebe4] border-r border-[#d4cdc4] p-6 flex flex-col shrink-0 overflow-y-auto h-screen sticky top-0">
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#2c2c2c]">
              {t('app.title')}
            </h1>
            <button
              onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[#6b6560] hover:text-[#1a1a1a] hover:bg-[#e8e4df] rounded transition-colors"
              title={language === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang Tiếng Anh'}
            >
              <Globe size={14} />
              {language === 'en' ? 'EN' : 'VI'}
            </button>
          </div>
          <p className="text-xs text-[#6b6560] mt-2 uppercase tracking-wider">{t('app.subtitle')}</p>
        </div>

        <div className="space-y-2 mb-10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onModuleChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                  isActive 
                    ? 'bg-[#1a1a1a] text-[#faf8f5] border border-[#2c2c2c] shadow-md' 
                    : 'text-[#4a4540] hover:bg-[#e8e4df] hover:text-[#1a1a1a]'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-[#faf8f5]' : 'text-[#6b6560]'} />
                <span className="font-medium text-sm">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </div>
        
        <div className="mt-auto pt-6 border-t border-[#d4cdc4]">
           <p className="text-xs text-[#6b6560] leading-relaxed italic">
             {t('footer')}
           </p>
           <p className="text-[10px] text-[#9a9590] leading-relaxed mt-2">
             {t('footer_dev_note')}
           </p>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-8 overflow-auto h-screen">
        <div className="w-full h-full">
           {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
