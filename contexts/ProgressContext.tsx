import React, { createContext, useContext, useState, useEffect } from 'react';
import { Achievement, ModuleType } from '../types';

interface ProgressContextType {
  tutorialStep: number;
  setTutorialStep: (step: number) => void;
  advanceTutorial: () => void;
  completeModule: (module: ModuleType) => void;
  unlockAchievement: (id: string) => void;
  achievements: Achievement[];
  modulesCompleted: ModuleType[];
}

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'FIRST_FLIP', title: 'The Coin Master', description: 'Completed the Beta-Binomial Tutorial', icon: '🪙', unlocked: false },
  { id: 'SENSOR_CALIB', title: 'The Engineer', description: 'Calibrated the Normal Sensor', icon: '🌡️', unlocked: false },
  { id: 'BUS_WAIT', title: 'The Commuter', description: 'Estimated Bus Arrivals', icon: '🚌', unlocked: false },
  { id: 'EXPLORER', title: 'The Explorer', description: 'Took 500 steps in Metropolis-Hastings', icon: '🥾', unlocked: false },
  { id: 'STRATEGIST', title: 'The Strategist', description: 'Took 50 steps using Gibbs Sampling', icon: '♟️', unlocked: false },
  { id: 'PHYSICIST', title: 'The Physicist', description: 'Collected 20 samples with HMC', icon: '⚛️', unlocked: false },
];

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tutorialStep, setTutorialStep] = useState(0); // 0 = off, 1 = start
  const [modulesCompleted, setModulesCompleted] = useState<ModuleType[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);

  const unlockAchievement = (id: string) => {
    setAchievements(prev => {
      const achievement = prev.find(a => a.id === id);
      if (achievement && !achievement.unlocked) {
        // You could add a toast notification here if you had a toast system
        return prev.map(a => a.id === id ? { ...a, unlocked: true } : a);
      }
      return prev;
    });
  };

  const advanceTutorial = () => {
    setTutorialStep(prev => prev + 1);
    if (tutorialStep === 3) {
      unlockAchievement('FIRST_FLIP');
      setTutorialStep(0); // End tutorial
    }
  };

  const completeModule = (module: ModuleType) => {
    if (!modulesCompleted.includes(module)) {
      setModulesCompleted(prev => [...prev, module]);
    }
  };

  return (
    <ProgressContext.Provider value={{
      tutorialStep,
      setTutorialStep,
      advanceTutorial,
      completeModule,
      unlockAchievement,
      achievements,
      modulesCompleted
    }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};