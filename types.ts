export enum ModuleType {
  HOME = 'HOME',
  ANALYTICAL = 'ANALYTICAL',
  METROPOLIS = 'METROPOLIS',
  GIBBS = 'GIBBS',
  HMC = 'HMC',
  VARIATIONAL = 'VARIATIONAL',
}

export enum AnalyticalMode {
  BETA_BINOMIAL = 'BETA_BINOMIAL',
  NORMAL_NORMAL = 'NORMAL_NORMAL',
  GAMMA_POISSON = 'GAMMA_POISSON'
}

export interface Point2D {
  x: number;
  y: number;
}

export interface SimulationStep {
  position: Point2D;
  accepted: boolean;
  prob?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface ProgressState {
  tutorialStep: number; // 0 = not started, 1+ = active steps
  tutorialCompleted: boolean;
  completedModules: ModuleType[];
  achievements: Achievement[];
}
