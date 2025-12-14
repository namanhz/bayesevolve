import React, { useState } from 'react';
import Layout from './components/Layout';
import ModuleHome from './components/ModuleHome';
import ModuleAnalytical from './components/ModuleAnalytical';
import ModuleMetropolis from './components/ModuleMetropolis';
import ModuleGibbs from './components/ModuleGibbs';
import ModuleHMC from './components/ModuleHMC';
import ModuleVariational from './components/ModuleVariational';
import { ModuleType } from './types';
import { ProgressProvider } from './contexts/ProgressContext';
import { LanguageProvider } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<ModuleType>(ModuleType.HOME);

  const handleNavigate = (moduleId: string) => {
    const moduleMap: Record<string, ModuleType> = {
      'home': ModuleType.HOME,
      'analytical': ModuleType.ANALYTICAL,
      'metropolis': ModuleType.METROPOLIS,
      'gibbs': ModuleType.GIBBS,
      'hmc': ModuleType.HMC,
      'variational': ModuleType.VARIATIONAL,
    };
    setCurrentModule(moduleMap[moduleId] || ModuleType.HOME);
  };

  const renderModule = () => {
    switch (currentModule) {
      case ModuleType.HOME:
        return <ModuleHome onNavigate={handleNavigate} />;
      case ModuleType.ANALYTICAL:
        return <ModuleAnalytical />;
      case ModuleType.METROPOLIS:
        return <ModuleMetropolis />;
      case ModuleType.GIBBS:
        return <ModuleGibbs />;
      case ModuleType.HMC:
        return <ModuleHMC />;
      case ModuleType.VARIATIONAL:
        return <ModuleVariational />;
      default:
        return <ModuleHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout currentModule={currentModule} onModuleChange={setCurrentModule}>
      {renderModule()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <ProgressProvider>
        <AppContent />
      </ProgressProvider>
    </LanguageProvider>
  );
};

export default App;
