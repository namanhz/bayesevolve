import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { betaPdf, normalPdf, gammaPdf } from '../services/mathUtils';
import { RefreshCw, TrendingUp, Info, ChevronRight, CheckCircle2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { AnalyticalMode } from '../types';
import { useProgress } from '../contexts/ProgressContext';
import MathTex from './Math';

const ModuleAnalytical: React.FC = () => {
  const [mode, setMode] = useState<AnalyticalMode>(AnalyticalMode.BETA_BINOMIAL);
  const [showMath, setShowMath] = useState(false);
  const { tutorialStep, setTutorialStep, advanceTutorial, achievements, unlockAchievement } = useProgress();

  // --- BETA-BINOMIAL STATE ---
  const [alphaPrior, setAlphaPrior] = useState(2);
  const [betaPrior, setBetaPrior] = useState(2);
  const [heads, setHeads] = useState(0);
  const [tails, setTails] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  // --- NORMAL-NORMAL STATE ---
  const [priorMean, setPriorMean] = useState(20); // e.g., temperature
  const [priorStd, setPriorStd] = useState(5); // uncertainty
  const [sensorData, setSensorData] = useState<number[]>([]);
  
  // --- GAMMA-POISSON STATE ---
  const [gammaAlpha, setGammaAlpha] = useState(2); // Shape (events)
  const [gammaBeta, setGammaBeta] = useState(1); // Rate (time units)
  const [busCounts, setBusCounts] = useState<number[]>([]);

  // Start tutorial only on first visit to Beta-Binomial
  useEffect(() => {
    const hasBadge = achievements.find(a => a.id === 'FIRST_FLIP')?.unlocked;
    if (mode === AnalyticalMode.BETA_BINOMIAL && !hasBadge && tutorialStep === 0) {
      setTutorialStep(1);
    }
  }, [mode, achievements, tutorialStep, setTutorialStep]);

  // Check for other badges
  useEffect(() => {
    if (mode === AnalyticalMode.NORMAL_NORMAL && sensorData.length >= 5) {
      unlockAchievement('SENSOR_CALIB');
    }
    if (mode === AnalyticalMode.GAMMA_POISSON && busCounts.length >= 5) {
      unlockAchievement('BUS_WAIT');
    }
  }, [mode, sensorData, busCounts, unlockAchievement]);

  // --- DATA GENERATION ---

  const data = useMemo(() => {
    const points = [];
    const steps = 100;
    
    if (mode === AnalyticalMode.BETA_BINOMIAL) {
      const alphaPost = alphaPrior + heads;
      const betaPost = betaPrior + tails;
      for (let i = 0; i <= steps; i++) {
        const x = i / steps;
        points.push({
          x: x.toFixed(2),
          prior: betaPdf(x, alphaPrior, betaPrior),
          posterior: betaPdf(x, alphaPost, betaPost),
        });
      }
    } else if (mode === AnalyticalMode.NORMAL_NORMAL) {
      const likelihoodSigma = 5;
      const n = sensorData.length;
      
      let postMean = priorMean;
      let postStd = priorStd;

      if (n > 0) {
        const dataMean = sensorData.reduce((a,b)=>a+b,0) / n;
        const priorPrec = 1 / (priorStd**2);
        const dataPrec = n / (likelihoodSigma**2);
        const postPrec = priorPrec + dataPrec;
        const postVar = 1 / postPrec;
        postStd = Math.sqrt(postVar);
        postMean = postVar * (priorPrec * priorMean + dataPrec * dataMean);
      }

      const minX = 0; 
      const maxX = 40;
      
      for (let i = 0; i <= steps; i++) {
        const x = minX + (i / steps) * (maxX - minX);
        points.push({
          x: x.toFixed(1),
          prior: normalPdf(x, priorMean, priorStd),
          posterior: normalPdf(x, postMean, postStd),
        });
      }
    } else if (mode === AnalyticalMode.GAMMA_POISSON) {
      const n = busCounts.length;
      const sumK = busCounts.reduce((a,b) => a+b, 0);
      const postAlpha = gammaAlpha + sumK;
      const postBeta = gammaBeta + n;

      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * 10; // Rate range 0-10
        points.push({
          x: x.toFixed(2),
          prior: gammaPdf(x, gammaAlpha, gammaBeta),
          posterior: gammaPdf(x, postAlpha, postBeta),
        });
      }
    }
    return points;
  }, [mode, alphaPrior, betaPrior, heads, tails, priorMean, priorStd, sensorData, gammaAlpha, gammaBeta, busCounts]);

  // --- ACTIONS ---

  const handleFlip = () => {
    if (tutorialStep === 2) advanceTutorial();
    setIsFlipping(true);
    setTimeout(() => {
      Math.random() > 0.5 ? setHeads(h => h + 1) : setTails(t => t + 1);
      setIsFlipping(false);
      if (tutorialStep === 3) advanceTutorial();
    }, 400);
  };

  const handleAddSensorData = () => {
    const reading = 25 + (Math.random() - 0.5) * 5;
    setSensorData(d => [...d, reading]);
  };

  const handleAddBusData = () => {
    const count = Math.floor(Math.random() * 4) + 2; 
    setBusCounts(c => [...c, count]);
  };

  // --- NARRATIVE TEXT ---
  
  const getNarrative = () => {
    switch (mode) {
      case AnalyticalMode.BETA_BINOMIAL:
        return {
          title: "Beta-Binomial Conjugacy",
          subtitle: "Closed-form posterior for Bernoulli trials",
          technical: "The Beta distribution is conjugate to the Binomial likelihood. If θ ~ Beta(α,β) and we observe k successes in n trials, the posterior is θ|D ~ Beta(α+k, β+n-k). The normalizing constant B(α,β) = Γ(α)Γ(β)/Γ(α+β) is known analytically.",
          eli5: "The posterior concentrates around the maximum likelihood estimate as sample size increases, with variance decreasing proportionally to 1/n. Conjugacy enables exact Bayesian updating without numerical integration."
        };
      case AnalyticalMode.NORMAL_NORMAL:
        return {
          title: "Normal-Normal Conjugacy",
          subtitle: "Precision-weighted averaging",
          technical: "With prior μ ~ N(μ₀, σ₀²) and likelihood x|μ ~ N(μ, σ²), the posterior is μ|D ~ N(μₙ, σₙ²) where μₙ = (μ₀/σ₀² + nx̄/σ²) / (1/σ₀² + n/σ²). The posterior mean is a precision-weighted average of prior and data means.",
          eli5: "The posterior mean is a precision-weighted combination of prior belief and observed data. Higher precision (lower variance) sources receive proportionally greater weight in the final estimate."
        };
      case AnalyticalMode.GAMMA_POISSON:
        return {
          title: "Gamma-Poisson Conjugacy",
          subtitle: "Rate estimation for count data",
          technical: "With prior λ ~ Gamma(α,β) and likelihood k|λ ~ Poisson(λT), the posterior is λ|D ~ Gamma(α+Σk, β+T). We add observed events to the shape parameter and observation time to the rate parameter.",
          eli5: "Conjugate updating accumulates sufficient statistics: total event count increases the shape parameter while total observation time increases the rate parameter, naturally encoding uncertainty reduction."
        };
    }
  };

  // --- MATH FORMULAS ---

  const renderMathFormula = () => {
    switch(mode) {
      case AnalyticalMode.BETA_BINOMIAL:
        return (
          <div className="font-mono text-sm space-y-4 text-[#4a4540]">
             <div>
               <p className="font-bold text-[#1a1a1a] mb-1">Why Beta-Binomial?</p>
               <p className="text-xs text-[#6b6560]">Because probabilities are bounded between 0 and 1. The Beta distribution is the perfect shape for "Probabilities of Probabilities".</p>
             </div>
             <div className="bg-[#f5f0e8] p-3 rounded border border-[#d4cdc4]">
               <p className="text-[#1a1a1a] mb-1">Prior: Beta(α={alphaPrior}, β={betaPrior})</p>
               <p className="text-[#6b5640] mb-1">Data: Heads={heads}, Tails={tails}</p>
               <div className="border-t border-[#d4cdc4] my-2"></div>
               <p className="text-[#1a1a1a] font-bold">
                 Posterior ∝ Prior × Likelihood
               </p>
               <p className="text-[#4a4540] mt-1">
                 Beta({alphaPrior} + <span className="text-[#8b7355] font-bold">{heads}</span>, {betaPrior} + <span className="text-[#8b7355] font-bold">{tails}</span>)
               </p>
             </div>
             <p className="text-xs text-[#9a9590] italic">In the Analytical era, "learning" is just addition!</p>
          </div>
        );
      case AnalyticalMode.NORMAL_NORMAL:
        return (
          <div className="font-mono text-sm space-y-4 text-[#4a4540]">
             <div>
               <p className="font-bold text-[#1a1a1a] mb-1">Why Normal-Normal?</p>
               <p className="text-xs text-[#6b6560]">Nature often follows a bell curve (Central Limit Theorem). This model assumes your Error and your Belief are both bell-shaped.</p>
             </div>
             <div className="bg-[#f5f0e8] p-3 rounded border border-[#d4cdc4]">
               <p className="text-[#1a1a1a] mb-1">Prior Mean: μ₀ = {priorMean}</p>
               <p className="text-[#6b5640] mb-1">Data Mean: x̄ = {sensorData.length > 0 ? (sensorData.reduce((a,b)=>a+b,0)/sensorData.length).toFixed(2) : 'No Data'}</p>
               <div className="border-t border-[#d4cdc4] my-2"></div>
               <p className="text-[#1a1a1a] font-bold">
                 Posterior Mean = Weighted Average
               </p>
             </div>
             <p className="text-xs text-[#9a9590] italic">The weight depends on who is more precise: your Prior or the Sensor.</p>
          </div>
        );
      case AnalyticalMode.GAMMA_POISSON:
        return (
          <div className="font-mono text-sm space-y-4 text-[#4a4540]">
             <div>
               <p className="font-bold text-[#1a1a1a] mb-1">Why Gamma-Poisson?</p>
               <p className="text-xs text-[#6b6560]">Because rates (like buses per hour) must be positive. Gamma handles the "skew" of waiting times.</p>
             </div>
             <div className="bg-[#f5f0e8] p-3 rounded border border-[#d4cdc4]">
               <p className="text-[#1a1a1a] mb-1">Prior: Gamma(α={gammaAlpha}, β={gammaBeta})</p>
               <p className="text-[#6b5640] mb-1">Data: Σk={busCounts.reduce((a,b)=>a+b,0)}, T={busCounts.length}</p>
               <div className="border-t border-[#d4cdc4] my-2"></div>
               <p className="text-[#1a1a1a] font-bold">
                 Posterior: Gamma({gammaAlpha} + K, {gammaBeta} + T)
               </p>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 relative">
      
      {/* HEADER & NARRATIVE */}
      <div className="bg-white p-6 rounded-xl border border-[#d4cdc4] shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex gap-2 mb-4">
              {[
                { id: AnalyticalMode.BETA_BINOMIAL, label: 'Coin (Beta)' },
                { id: AnalyticalMode.NORMAL_NORMAL, label: 'Sensor (Normal)' },
                { id: AnalyticalMode.GAMMA_POISSON, label: 'Bus (Gamma)' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id);
                    // Reset specific data
                    if(m.id === AnalyticalMode.BETA_BINOMIAL) { setHeads(0); setTails(0); }
                    if(m.id === AnalyticalMode.NORMAL_NORMAL) { setSensorData([]); }
                    if(m.id === AnalyticalMode.GAMMA_POISSON) { setBusCounts([]); }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    mode === m.id 
                      ? 'bg-[#1a1a1a] text-[#faf8f5] shadow-md' 
                      : 'bg-[#e8e4df] text-[#6b6560] hover:bg-[#d4cdc4]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-1">{getNarrative()?.title}</h2>
            <p className="text-xs text-[#6b5640] font-bold uppercase tracking-widest mb-3">{getNarrative()?.subtitle}</p>
            <div className="space-y-3 max-w-3xl">
              <p className="text-sm text-[#4a4540] leading-relaxed font-mono bg-[#faf8f5] p-3 rounded border border-[#e8e4df]">
                {getNarrative()?.technical}
              </p>
              <p className="text-sm text-[#4a4540] leading-relaxed bg-[#f0ebe4] p-3 rounded border border-[#d4cdc4]">
                {getNarrative()?.eli5}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowMath(!showMath)}
            className="flex items-center gap-2 text-[#6b6560] hover:text-[#1a1a1a] transition-colors bg-[#f5f0e8] px-4 py-2 rounded-lg border border-[#d4cdc4]"
          >
            <span className="text-xs font-bold uppercase tracking-widest">{showMath ? 'Hide Math' : 'Show Math'}</span>
            {showMath ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {showMath && (
           <div className="mt-6 border-t border-[#d4cdc4] pt-6 animate-in slide-in-from-top-4">
              {renderMathFormula()}
           </div>
        )}
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-[450px]">
        
        {/* --- PANEL 1: PRIOR CONTROLS --- */}
        <div className="bg-white p-5 rounded-lg border border-[#d4cdc4] flex flex-col relative shadow-sm">
          {tutorialStep === 1 && (
             <div className="absolute inset-0 z-10 bg-[#1a1a1a]/5 border-2 border-[#1a1a1a] animate-pulse rounded-lg pointer-events-none flex items-start justify-end p-2">
                <span className="bg-[#1a1a1a] text-[#faf8f5] text-xs font-bold px-2 py-1 rounded">Interactive Zone</span>
             </div>
          )}
          
          <h3 className="text-[#1a1a1a] font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} /> Prior Belief <span className="text-xs font-normal text-[#6b6560] ml-2 font-mono">π(θ)</span>
          </h3>
          <div className="flex-grow h-72 min-h-[280px] bg-[#faf8f5] border border-[#e8e4df] rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorPrior" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#6b6560' }} axisLine={{ stroke: '#d4cdc4' }} tickLine={{ stroke: '#d4cdc4' }} label={{ value: 'θ', position: 'bottom', fontSize: 12, fill: '#1a1a1a', fontStyle: 'italic' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6560' }} axisLine={{ stroke: '#d4cdc4' }} tickLine={{ stroke: '#d4cdc4' }} label={{ value: 'f(θ)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#1a1a1a', fontStyle: 'italic' }} />
                <Area type="monotone" dataKey="prior" stroke="#1a1a1a" strokeWidth={2} fillOpacity={1} fill="url(#colorPrior)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Specific Controls per Mode */}
          <div className="mt-4 space-y-4 bg-[#f5f0e8] p-3 rounded border border-[#e8e4df]">
            {mode === AnalyticalMode.BETA_BINOMIAL && (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#4a4540] font-medium"><span>Bias Towards Heads (α)</span><span className="font-mono">{alphaPrior}</span></div>
                  <input type="range" min="1" max="20" value={alphaPrior} onChange={(e) => setAlphaPrior(Number(e.target.value))} className="w-full accent-[#1a1a1a] h-2 bg-[#d4cdc4] rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#4a4540] font-medium"><span>Bias Towards Tails (β)</span><span className="font-mono">{betaPrior}</span></div>
                  <input type="range" min="1" max="20" value={betaPrior} onChange={(e) => setBetaPrior(Number(e.target.value))} className="w-full accent-[#1a1a1a] h-2 bg-[#d4cdc4] rounded-lg appearance-none cursor-pointer" />
                </div>
              </>
            )}
            {mode === AnalyticalMode.NORMAL_NORMAL && (
              <>
                 <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#4a4540] font-medium"><span>Prior Mean (μ₀)</span><span className="font-mono">{priorMean}°C</span></div>
                  <input type="range" min="0" max="40" value={priorMean} onChange={(e) => setPriorMean(Number(e.target.value))} className="w-full accent-[#1a1a1a] h-2 bg-[#d4cdc4] rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#4a4540] font-medium"><span>Prior Std (σ₀)</span><span className="font-mono">{priorStd}</span></div>
                  <input type="range" min="1" max="10" value={priorStd} onChange={(e) => setPriorStd(Number(e.target.value))} className="w-full accent-[#1a1a1a] h-2 bg-[#d4cdc4] rounded-lg appearance-none cursor-pointer" />
                </div>
              </>
            )}
            {mode === AnalyticalMode.GAMMA_POISSON && (
              <>
                 <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#4a4540] font-medium"><span>Shape (α)</span><span className="font-mono">{gammaAlpha}</span></div>
                  <input type="range" min="1" max="10" value={gammaAlpha} onChange={(e) => setGammaAlpha(Number(e.target.value))} className="w-full accent-[#1a1a1a] h-2 bg-[#d4cdc4] rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#4a4540] font-medium"><span>Rate (β)</span><span className="font-mono">{gammaBeta}</span></div>
                  <input type="range" min="1" max="10" value={gammaBeta} onChange={(e) => setGammaBeta(Number(e.target.value))} className="w-full accent-[#1a1a1a] h-2 bg-[#d4cdc4] rounded-lg appearance-none cursor-pointer" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* --- PANEL 2: DATA INPUT --- */}
        <div className="bg-white p-5 rounded-lg border border-[#d4cdc4] flex flex-col relative overflow-hidden shadow-sm">
          {tutorialStep === 2 && (
             <div className="absolute inset-0 z-10 bg-[#8b7355]/10 border-2 border-[#8b7355] animate-pulse rounded-lg pointer-events-none flex items-start justify-end p-2">
                <span className="bg-[#8b7355] text-white text-xs font-bold px-2 py-1 rounded">Interactive Zone</span>
             </div>
          )}

          <h3 className="text-[#6b5640] font-bold mb-4 flex items-center gap-2">
            The Evidence <span className="text-xs font-normal text-[#6b6560] ml-2 font-mono">D = {'{'}x₁, x₂, ...{'}'}</span>
          </h3>
          <div className="flex-grow flex flex-col items-center justify-center space-y-6">
             
             {mode === AnalyticalMode.BETA_BINOMIAL && (
               <>
                 <div className="flex gap-8 text-center">
                    <div><div className="text-4xl font-bold text-[#1a1a1a] font-mono">{heads}</div><div className="text-xs uppercase tracking-widest text-[#6b6560] mt-1">Heads</div></div>
                    <div><div className="text-4xl font-bold text-[#1a1a1a] font-mono">{tails}</div><div className="text-xs uppercase tracking-widest text-[#6b6560] mt-1">Tails</div></div>
                 </div>
                 <button 
                    onClick={handleFlip}
                    disabled={isFlipping}
                    className={`px-8 py-3 rounded-lg font-bold transition-all transform active:scale-95 border ${isFlipping ? 'bg-[#e8e4df] text-[#9a9590] border-[#d4cdc4]' : 'bg-[#1a1a1a] text-[#faf8f5] hover:bg-[#2c2c2c] border-[#1a1a1a] shadow-md'}`}
                 >
                   {isFlipping ? 'Flipping...' : 'Flip Coin'}
                 </button>
               </>
             )}

             {mode === AnalyticalMode.NORMAL_NORMAL && (
               <>
                 <div className="text-center">
                    <div className="text-4xl font-bold text-[#1a1a1a] font-mono">n = {sensorData.length}</div>
                    <div className="text-xs uppercase tracking-widest text-[#6b6560] mt-1">Observations</div>
                    <div className="mt-2 text-xs text-[#6b6560] h-6 font-mono">
                      {sensorData.length > 0 && `xₙ = ${sensorData[sensorData.length-1].toFixed(1)}°C`}
                    </div>
                 </div>
                 <button 
                    onClick={handleAddSensorData}
                    className="px-8 py-3 rounded-lg font-bold bg-[#1a1a1a] text-[#faf8f5] hover:bg-[#2c2c2c] shadow-md transition-all transform active:scale-95"
                 >
                   Read Sensor
                 </button>
               </>
             )}

             {mode === AnalyticalMode.GAMMA_POISSON && (
               <>
                 <div className="text-center">
                    <div className="text-4xl font-bold text-[#1a1a1a] font-mono">Σk = {busCounts.reduce((a,b)=>a+b, 0)}</div>
                    <div className="text-xs uppercase tracking-widest text-[#6b6560] mt-1">Total Events</div>
                    <div className="text-sm text-[#6b6560] mt-1 font-mono">T = {busCounts.length} time units</div>
                 </div>
                 <button 
                    onClick={handleAddBusData}
                    className="px-8 py-3 rounded-lg font-bold bg-[#1a1a1a] text-[#faf8f5] hover:bg-[#2c2c2c] shadow-md transition-all transform active:scale-95"
                 >
                   Wait 1 Hour
                 </button>
               </>
             )}

             <button 
                onClick={() => {
                   setHeads(0); setTails(0);
                   setSensorData([]);
                   setBusCounts([]);
                }} 
                className="text-[#9a9590] hover:text-[#4a4540] text-sm flex items-center gap-1"
             >
               <RefreshCw size={14} /> Reset Data
             </button>
          </div>
        </div>

        {/* --- PANEL 3: POSTERIOR RESULT --- */}
        <div className="bg-white p-5 rounded-lg border border-[#d4cdc4] flex flex-col relative overflow-hidden shadow-sm">
          {tutorialStep === 3 && (
             <div className="absolute inset-0 z-10 bg-[#8b7355]/10 border-2 border-[#8b7355] animate-pulse rounded-lg pointer-events-none flex items-start justify-end p-2">
                <span className="bg-[#8b7355] text-white text-xs font-bold px-2 py-1 rounded">Updated</span>
             </div>
          )}

          <h3 className="text-[#1a1a1a] font-bold mb-4 flex items-center gap-2">
             Posterior <span className="text-xs font-normal text-[#6b6560] ml-2 font-mono">π(θ|D)</span>
          </h3>
          <div className="flex-grow relative h-72 min-h-[280px] bg-[#faf8f5] border border-[#e8e4df] rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorPost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b7355" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#8b7355" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#6b6560' }} axisLine={{ stroke: '#d4cdc4' }} tickLine={{ stroke: '#d4cdc4' }} label={{ value: 'θ', position: 'bottom', fontSize: 12, fill: '#1a1a1a', fontStyle: 'italic' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6560' }} axisLine={{ stroke: '#d4cdc4' }} tickLine={{ stroke: '#d4cdc4' }} label={{ value: 'f(θ|D)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#1a1a1a', fontStyle: 'italic' }} />
                <Area type="monotone" dataKey="posterior" stroke="#8b7355" strokeWidth={2} strokeDasharray="5 3" fillOpacity={1} fill="url(#colorPost)" animationDuration={400} />
              </AreaChart>
            </ResponsiveContainer>
            
            <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
               <div className="text-xs text-[#1a1a1a] bg-[#f5f0e8] px-2 py-1 rounded border border-[#d4cdc4] font-mono">
                 {mode === AnalyticalMode.BETA_BINOMIAL && `E[θ|D] = ${((alphaPrior + heads) / (alphaPrior + betaPrior + heads + tails)).toFixed(3)}`}
                 {mode === AnalyticalMode.NORMAL_NORMAL && `μₙ = ${data[data.reduce((iMax, x, i, arr) => x.posterior > arr[iMax].posterior ? i : iMax, 0)].x}`}
                 {mode === AnalyticalMode.GAMMA_POISSON && `λ̂ = ${((gammaAlpha + busCounts.reduce((a,b)=>a+b,0))/(gammaBeta + busCounts.length)).toFixed(3)}`}
               </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-[#4a4540] text-center font-mono">
            π(θ|D) ∝ π(θ) × L(D|θ)<br/>
            <span className="text-[#9a9590] text-xs not-italic" style={{ fontFamily: 'inherit' }}>
               {mode === AnalyticalMode.BETA_BINOMIAL && "Conjugacy: posterior parameters are sums of prior + data."}
               {mode === AnalyticalMode.NORMAL_NORMAL && "Precision-weighted average of prior and likelihood."}
               {mode === AnalyticalMode.GAMMA_POISSON && "Posterior shape = α + Σk, posterior rate = β + T."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleAnalytical;