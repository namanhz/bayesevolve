import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { useProgress } from '../contexts/ProgressContext';
import { useLanguage } from '../contexts/LanguageContext';
import MathTex from './Math';

// ELBO decomposition canvas
const ELBO_BAR_WIDTH = 200;
const ELBO_BAR_HEIGHT = 100;

const WIDTH = 700;
const HEIGHT = 400;

// True posterior: mixture of two Gaussians (complex, multimodal)
const truePosterior = (x: number): number => {
  const g1 = Math.exp(-0.5 * Math.pow((x - 2) / 0.8, 2)) / (0.8 * Math.sqrt(2 * Math.PI));
  const g2 = Math.exp(-0.5 * Math.pow((x - 5) / 1.2, 2)) / (1.2 * Math.sqrt(2 * Math.PI));
  return 0.4 * g1 + 0.6 * g2;
};

// Variational approximation: single Gaussian q(θ) = N(μ, σ²)
const variationalQ = (x: number, mu: number, sigma: number): number => {
  return Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
};

// Compute ELBO with decomposition (returns likelihood term and entropy separately)
const computeELBODecomposition = (mu: number, sigma: number): { elbo: number, likelihoodTerm: number, entropyTerm: number } => {
  // ELBO = E_q[log p(x)] + H(q) where H(q) is entropy of q
  // For Gaussian q: H(q) = 0.5 * log(2πeσ²) = 0.5 * (1 + log(2π) + log(σ²))
  let likelihoodTerm = 0;
  const dx = 0.1;
  for (let x = -2; x <= 10; x += dx) {
    const q = variationalQ(x, mu, sigma);
    const p = truePosterior(x);
    if (q > 1e-10 && p > 1e-10) {
      likelihoodTerm += q * Math.log(p) * dx;
    }
  }
  
  // Entropy of Gaussian: 0.5 * ln(2πeσ²)
  const entropyTerm = 0.5 * (1 + Math.log(2 * Math.PI) + 2 * Math.log(sigma));
  
  return {
    elbo: likelihoodTerm + entropyTerm,
    likelihoodTerm,
    entropyTerm
  };
};

const computeELBO = (mu: number, sigma: number): number => {
  return computeELBODecomposition(mu, sigma).elbo;
};

// Compute KL divergence
const computeKL = (mu: number, sigma: number): number => {
  let kl = 0;
  const dx = 0.1;
  for (let x = -2; x <= 10; x += dx) {
    const q = variationalQ(x, mu, sigma);
    const p = truePosterior(x);
    if (q > 1e-10 && p > 1e-10) {
      kl += q * (Math.log(q) - Math.log(p)) * dx;
    }
  }
  return Math.max(0, kl);
};

const ModuleVariational: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elboCanvasRef = useRef<HTMLCanvasElement>(null);
  const [mu, setMu] = useState(3.5);
  const [sigma, setSigma] = useState(1.5);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [elbo, setElbo] = useState(0);
  const [kl, setKL] = useState(0);
  const [likelihoodTerm, setLikelihoodTerm] = useState(0);
  const [entropyTerm, setEntropyTerm] = useState(0);
  const [optimizationHistory, setOptimizationHistory] = useState<{mu: number, sigma: number, elbo: number}[]>([]);
  const animationRef = useRef<number | null>(null);
  
  const { unlockAchievement } = useProgress();
  const { t } = useLanguage();

  // Update ELBO decomposition and KL when parameters change
  useEffect(() => {
    const decomp = computeELBODecomposition(mu, sigma);
    setElbo(decomp.elbo);
    setLikelihoodTerm(decomp.likelihoodTerm);
    setEntropyTerm(decomp.entropyTerm);
    setKL(computeKL(mu, sigma));
  }, [mu, sigma]);

  // Draw ELBO decomposition bar chart
  const drawELBODecomposition = useCallback(() => {
    const ctx = elboCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, ELBO_BAR_WIDTH, ELBO_BAR_HEIGHT);
    ctx.strokeStyle = '#d4cdc4';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, ELBO_BAR_WIDTH, ELBO_BAR_HEIGHT);

    const barWidth = 60;
    const maxHeight = ELBO_BAR_HEIGHT - 30;
    const baseline = ELBO_BAR_HEIGHT - 15;
    
    // Scale factor for visualization
    const scale = maxHeight / 3;

    // Likelihood term (negative, goes down from baseline)
    const likelihoodHeight = Math.min(maxHeight, Math.abs(likelihoodTerm) * scale);
    ctx.fillStyle = likelihoodTerm < 0 ? '#ef4444' : '#22c55e';
    ctx.fillRect(20, baseline - (likelihoodTerm > 0 ? likelihoodHeight : 0), barWidth, likelihoodHeight);
    
    // Entropy term (positive, goes up from baseline)
    const entropyHeight = Math.min(maxHeight, Math.abs(entropyTerm) * scale);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(100, baseline - entropyHeight, barWidth, entropyHeight);

    // Draw baseline
    ctx.strokeStyle = '#1a1a1a';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, baseline);
    ctx.lineTo(ELBO_BAR_WIDTH, baseline);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#6b6560';
    ctx.font = '9px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('E[log p]', 50, ELBO_BAR_HEIGHT - 2);
    ctx.fillText('H(q)', 130, ELBO_BAR_HEIGHT - 2);
    ctx.fillText(`${likelihoodTerm.toFixed(2)}`, 50, 10);
    ctx.fillText(`${entropyTerm.toFixed(2)}`, 130, 10);

    // ELBO result
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText(`ELBO = ${elbo.toFixed(2)}`, ELBO_BAR_WIDTH / 2, 22);

  }, [likelihoodTerm, entropyTerm, elbo]);

  useEffect(() => {
    drawELBODecomposition();
  }, [drawELBODecomposition]);

  // Render the distributions
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#e8e4df';
    ctx.lineWidth = 1;
    for (let x = 0; x <= WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    // X-axis
    const xMin = -1;
    const xMax = 9;
    const yMax = 0.5;
    
    const toCanvasX = (x: number) => ((x - xMin) / (xMax - xMin)) * WIDTH;
    const toCanvasY = (y: number) => HEIGHT - (y / yMax) * HEIGHT;

    // Draw axis
    ctx.strokeStyle = '#9a9590';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 1);
    ctx.lineTo(WIDTH, HEIGHT - 1);
    ctx.stroke();

    // Draw true posterior (filled area)
    ctx.beginPath();
    ctx.moveTo(toCanvasX(xMin), HEIGHT);
    for (let x = xMin; x <= xMax; x += 0.05) {
      const y = truePosterior(x);
      ctx.lineTo(toCanvasX(x), toCanvasY(y));
    }
    ctx.lineTo(toCanvasX(xMax), HEIGHT);
    ctx.closePath();
    ctx.fillStyle = 'rgba(139, 115, 85, 0.3)';
    ctx.fill();
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw variational approximation (dashed line with fill)
    ctx.beginPath();
    ctx.moveTo(toCanvasX(xMin), HEIGHT);
    for (let x = xMin; x <= xMax; x += 0.05) {
      const y = variationalQ(x, mu, sigma);
      ctx.lineTo(toCanvasX(x), toCanvasY(y));
    }
    ctx.lineTo(toCanvasX(xMax), HEIGHT);
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw optimization path trail if optimizing
    if (optimizationHistory.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      
      for (let i = 0; i < optimizationHistory.length; i++) {
        const h = optimizationHistory[i];
        const hY = variationalQ(h.mu, h.mu, h.sigma);
        const x = toCanvasX(h.mu);
        const y = toCanvasY(hY);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw small dots along the path
        ctx.fillStyle = `rgba(34, 197, 94, ${0.3 + (i / optimizationHistory.length) * 0.7})`;
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw mu marker with glow effect when optimizing
    if (isOptimizing) {
      // Glow effect
      ctx.beginPath();
      ctx.arc(toCanvasX(mu), toCanvasY(variationalQ(mu, mu, sigma)), 16, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(toCanvasX(mu), toCanvasY(variationalQ(mu, mu, sigma)), 12, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.fill();
    }
    
    ctx.beginPath();
    ctx.arc(toCanvasX(mu), toCanvasY(variationalQ(mu, mu, sigma)), 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Legend
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(WIDTH - 150, 10, 12, 12);
    ctx.fillStyle = '#4a4540';
    ctx.fillText('True posterior p(θ|D)', WIDTH - 132, 20);
    
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(WIDTH - 150, 28, 12, 12);
    ctx.fillStyle = '#4a4540';
    ctx.fillText('Approximation q(θ)', WIDTH - 132, 38);

  }, [mu, sigma, optimizationHistory, isOptimizing]);

  useEffect(() => {
    render();
  }, [render]);

  // Gradient ascent optimization
  const optimizationStep = useCallback(() => {
    const learningRate = 0.05;
    const eps = 0.01;
    
    // Numerical gradient for mu
    const elbo_plus_mu = computeELBO(mu + eps, sigma);
    const elbo_minus_mu = computeELBO(mu - eps, sigma);
    const grad_mu = (elbo_plus_mu - elbo_minus_mu) / (2 * eps);
    
    // Numerical gradient for sigma
    const elbo_plus_sigma = computeELBO(mu, sigma + eps);
    const elbo_minus_sigma = computeELBO(mu, sigma - eps);
    const grad_sigma = (elbo_plus_sigma - elbo_minus_sigma) / (2 * eps);
    
    const newMu = mu + learningRate * grad_mu;
    const newSigma = Math.max(0.3, sigma + learningRate * grad_sigma);
    
    setMu(newMu);
    setSigma(newSigma);
    
    const newElbo = computeELBO(newMu, newSigma);
    setOptimizationHistory(h => [...h, { mu: newMu, sigma: newSigma, elbo: newElbo }]);
    
    // Check convergence
    if (Math.abs(grad_mu) < 0.01 && Math.abs(grad_sigma) < 0.01) {
      setIsOptimizing(false);
      unlockAchievement('vi_master');
    }
  }, [mu, sigma, unlockAchievement]);

  useEffect(() => {
    if (isOptimizing) {
      const interval = setInterval(optimizationStep, 100);
      return () => clearInterval(interval);
    }
  }, [isOptimizing, optimizationStep]);

  const handleReset = () => {
    setMu(3.5);
    setSigma(1.5);
    setIsOptimizing(false);
    setOptimizationHistory([]);
  };

  const toggleOptimization = () => {
    if (!isOptimizing) {
      setOptimizationHistory([]);
    }
    setIsOptimizing(!isOptimizing);
  };

  return (
    <div className="flex flex-col space-y-4 h-full overflow-y-auto">
      {/* Explanation Panel */}
      <div className="bg-white p-6 rounded-xl border border-[#d4cdc4] shadow-sm">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">{t('vi.title')}</h2>
        
        <div className="space-y-4 mb-4">
          <div>
            <h4 className="text-sm font-bold text-[#8b7355] uppercase tracking-wider mb-2">{t('the_problem')}</h4>
            <div className="text-sm text-[#4a4540] leading-relaxed bg-[#faf8f5] p-3 rounded border border-[#e8e4df]">
              <p className="mb-2">{t('vi.problem')} <MathTex tex="n \to \infty" />, {t('vi.problem_detail')}</p>
              <div className="bg-white p-2 rounded border border-[#d4cdc4] text-center my-2">
                <MathTex tex="\text{Cost per sample} = O(n) \text{ likelihood evaluations}" display />
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider mb-2">{t('the_solution')}</h4>
            <p className="text-sm text-[#4a4540] leading-relaxed mb-2">
              {t('vi.solution')} <MathTex tex="q(\theta)" /> {t('vi.solution_detail')} <MathTex tex="p(\theta|D)" /> {t('vi.solution_detail2')}
            </p>
          </div>

          <div className="bg-[#1a1a1a] p-4 rounded space-y-2">
            <div className="text-[#e8e4df] text-sm">
              <MathTex tex="\text{ELBO}(q) = \mathbb{E}_{q(\theta)}[\log p(D|\theta)] - \text{KL}(q(\theta) \| p(\theta))" className="text-white" />
            </div>
            <div className="text-[#e8e4df] text-sm mt-2">
              <MathTex tex="\log p(D) = \text{ELBO}(q) + \text{KL}(q \| p) \geq \text{ELBO}(q)" className="text-white" />
            </div>
            <div className="text-[#8b7355] text-xs border-t border-[#4a4540] pt-2 mt-2">
              Maximizing ELBO ≈ Minimizing KL divergence to true posterior
            </div>
          </div>
        </div>

        <div className="bg-[#f0ebe4] p-3 rounded border border-[#d4cdc4] text-sm text-[#4a4540]">
          <strong>{t('in_simple_terms')}:</strong> {t('vi.eli5')}
        </div>
      </div>

      {/* Interactive Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Canvas */}
        <div className={`flex-1 bg-white p-4 rounded-xl border-2 shadow-sm transition-all duration-300 ${isOptimizing ? 'border-blue-400 shadow-blue-100 shadow-lg' : 'border-[#d4cdc4]'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
              <Sparkles size={20} className={isOptimizing ? 'animate-spin' : ''} /> {t('vi.distribution_fitting')}
            </h3>
            <div className="flex items-center gap-2">
              {isOptimizing && (
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded animate-pulse flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                  Optimizing...
                </span>
              )}
              <span className="text-xs font-mono text-[#6b6560] bg-[#f5f0e8] px-2 py-1 rounded">
                Brown = p(θ|D), Blue = q(θ)
              </span>
            </div>
          </div>
          
          <div className={`relative ${isOptimizing ? 'ring-2 ring-blue-300 ring-offset-2 rounded' : ''}`}>
            <canvas 
              ref={canvasRef} 
              width={WIDTH} 
              height={HEIGHT} 
              className="rounded border border-[#e8e4df] w-full"
              style={{ maxWidth: WIDTH }}
            />
            {optimizationHistory.length > 0 && (
              <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-mono text-green-600 border border-green-200">
                Path: {optimizationHistory.length} steps
              </div>
            )}
          </div>
          
          {/* Parameter Controls */}
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#4a4540]">{t('vi.mean')} <MathTex tex="\mu" /></span>
                <span className="font-mono text-[#1a1a1a]">{mu.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="0.1"
                value={mu}
                onChange={(e) => !isOptimizing && setMu(Number(e.target.value))}
                disabled={isOptimizing}
                className="w-full accent-[#3b82f6] h-2 bg-[#e8e4df] rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#4a4540]">{t('vi.std_dev')} <MathTex tex="\sigma" /></span>
                <span className="font-mono text-[#1a1a1a]">{sigma.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="3"
                step="0.1"
                value={sigma}
                onChange={(e) => !isOptimizing && setSigma(Number(e.target.value))}
                disabled={isOptimizing}
                className="w-full accent-[#3b82f6] h-2 bg-[#e8e4df] rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Controls & Metrics Panel */}
        <div className="w-full lg:w-80 space-y-4">
          {/* ELBO Decomposition */}
          <div className="bg-white p-4 rounded-xl border border-[#d4cdc4] shadow-sm">
            <h4 className="text-sm font-bold text-[#6b6560] uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp size={16} /> ELBO Decomposition
            </h4>
            
            <div className="mb-3">
              <canvas 
                ref={elboCanvasRef}
                width={ELBO_BAR_WIDTH}
                height={ELBO_BAR_HEIGHT}
                className="w-full rounded border border-[#e8e4df]"
                style={{ maxWidth: ELBO_BAR_WIDTH }}
              />
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center p-2 bg-[#fef2f2] rounded border border-red-100">
                <span className="text-red-700">E_q[log p(x)]</span>
                <span className="font-bold text-red-600">{likelihoodTerm.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-[#eff6ff] rounded border border-blue-100">
                <span className="text-blue-700">H(q) entropy</span>
                <span className="font-bold text-blue-600">+{entropyTerm.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-[#f0fdf4] rounded border border-green-200 font-bold">
                <span className="text-green-700">ELBO = sum</span>
                <span className={`${elbo > -1 ? 'text-green-600' : 'text-[#1a1a1a]'}`}>{elbo.toFixed(3)}</span>
              </div>
            </div>

            <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>Single Gaussian can't capture bimodal posterior! KL: {kl.toFixed(2)}</span>
            </div>
          </div>

          {/* Metrics */}
          <div className="bg-white p-4 rounded-xl border border-[#d4cdc4] shadow-sm">
            <h4 className="text-sm font-bold text-[#6b6560] uppercase tracking-wider mb-3">
              {t('vi.optimization_metrics')}
            </h4>
            
            <div className="space-y-3">
              <div className="bg-[#f5f0e8] p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#4a4540]">KL Divergence</span>
                  <span className={`font-mono font-bold ${kl < 0.5 ? 'text-green-600' : 'text-[#1a1a1a]'}`}>
                    {kl.toFixed(3)}
                  </span>
                </div>
                <div className="text-xs text-[#9a9590] mt-1">{t('vi.lower_better')}</div>
              </div>
              
              <div className="bg-[#f5f0e8] p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#4a4540]">{t('vi.iterations')}</span>
                  <span className="font-mono font-bold text-[#1a1a1a]">{optimizationHistory.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white p-4 rounded-xl border border-[#d4cdc4] shadow-sm">
            <h4 className="text-sm font-bold text-[#6b6560] uppercase tracking-wider mb-3">
              {t('controls')}
            </h4>
            
            <div className="space-y-3">
              <button
                onClick={toggleOptimization}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
                  isOptimizing
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-[#1a1a1a] hover:bg-[#2c2c2c] text-white'
                }`}
              >
                {isOptimizing ? <Pause size={18} /> : <Play size={18} />}
                {isOptimizing ? t('vi.pause') : t('vi.run_gradient')}
              </button>
              
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold bg-[#f5f0e8] hover:bg-[#e8e4df] text-[#4a4540] transition-all"
              >
                <RotateCcw size={18} />
                {t('reset')}
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-[#faf8f5] rounded-lg border border-[#e8e4df] text-xs text-[#6b6560]">
              <p className="font-semibold mb-1">{t('vi.try_hint')}</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>{t('vi.hint1')}</li>
                <li>{t('vi.hint2')}</li>
                <li>{t('vi.hint3')}</li>
                <li>{t('vi.hint4')}</li>
              </ol>
            </div>
            
            <div className="mt-4 pt-3 border-t border-[#e8e4df] text-[10px] text-[#9a9590] text-center">
              <span className="italic">References: Kullback & Leibler (1951), Blei et al. (2017)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleVariational;
