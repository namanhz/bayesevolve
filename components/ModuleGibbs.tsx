import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react';
import { useProgress } from '../contexts/ProgressContext';
import { useLanguage } from '../contexts/LanguageContext';
import MathTex from './Math';
import { bivariateNormalPdf } from '../services/mathUtils';
import { ArrowRight, Lock, Unlock } from 'lucide-react';

// Constants for conditional slice canvas
const SLICE_WIDTH = 400;
const SLICE_HEIGHT = 100;

// Smaller canvas to fit better without scrolling
const WIDTH = 450;
const HEIGHT = 450;
const SCALE = 45;
const ORIGIN_X = WIDTH / 2;
const ORIGIN_Y = HEIGHT / 2;

const ModuleGibbs: React.FC = () => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sliceCanvasRef = useRef<HTMLCanvasElement>(null);
  const [rho, setRho] = useState(0.8);
  const [position, setPosition] = useState({ x: -2, y: -2 });
  const [history, setHistory] = useState<{ x: number, y: number }[]>([]);
  const [turn, setTurn] = useState<'X' | 'Y'>('Y'); // Start by sampling Y given X
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const { unlockAchievement } = useProgress();
  
  // Refs for auto mode
  const positionRef = useRef(position);
  const turnRef = useRef(turn);
  const rhoRef = useRef(rho);
  
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { rhoRef.current = rho; }, [rho]);

  // Calculate correlation metrics
  const conditionalVariance = 1 - rho * rho;
  const conditionalStd = Math.sqrt(conditionalVariance);
  const mixingTime = rho > 0.99 ? Infinity : Math.ceil(1 / (1 - rho * rho));
  const correlationWarning = rho > 0.9;

  // Draw conditional slice (1D distribution)
  const drawConditionalSlice = useCallback(() => {
    const ctx = sliceCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, SLICE_WIDTH, SLICE_HEIGHT);

    // Draw border
    ctx.strokeStyle = '#d4cdc4';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, SLICE_WIDTH, SLICE_HEIGHT);

    // Calculate conditional mean and std
    const condMean = turn === 'X' 
      ? rho * position.y  // X | Y=y ~ N(rho*y, 1-rho^2)
      : rho * position.x; // Y | X=x ~ N(rho*x, 1-rho^2)
    const condStd = Math.sqrt(1 - rho * rho);

    // Draw the 1D Gaussian curve with FIXED x-range so curve visually moves
    ctx.beginPath();
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 2;

    // Fixed range from -4 to 4 so the curve moves across the canvas
    const xMin = -4;
    const xMax = 4;
    const xRange = xMax - xMin;

    // Draw x-axis ticks
    ctx.strokeStyle = '#d4cdc4';
    ctx.lineWidth = 1;
    for (let tick = -3; tick <= 3; tick++) {
      const tickX = ((tick - xMin) / xRange) * SLICE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(tickX, SLICE_HEIGHT - 10);
      ctx.lineTo(tickX, SLICE_HEIGHT - 5);
      ctx.stroke();
    }

    // Draw curve
    ctx.beginPath();
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 2;

    for (let i = 0; i <= SLICE_WIDTH; i++) {
      const x = xMin + (i / SLICE_WIDTH) * xRange;
      // Gaussian PDF
      const pdf = (1 / (condStd * Math.sqrt(2 * Math.PI))) * 
                  Math.exp(-0.5 * Math.pow((x - condMean) / condStd, 2));
      // Scale PDF for visualization (max height around 0.8 of canvas)
      const maxPdf = 1 / (condStd * Math.sqrt(2 * Math.PI));
      const normalizedPdf = pdf / maxPdf;
      const y = SLICE_HEIGHT - 10 - normalizedPdf * (SLICE_HEIGHT - 25);
      
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(SLICE_WIDTH, SLICE_HEIGHT - 10);
    ctx.lineTo(0, SLICE_HEIGHT - 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(139, 115, 85, 0.2)';
    ctx.fill();

    // Draw mean line (now it actually moves!)
    const meanX = ((condMean - xMin) / xRange) * SLICE_WIDTH;
    ctx.beginPath();
    ctx.strokeStyle = '#1a1a1a';
    ctx.setLineDash([3, 3]);
    ctx.moveTo(meanX, 0);
    ctx.lineTo(meanX, SLICE_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#6b6560';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText(`μ=${condMean.toFixed(2)}`, 5, 12);
    ctx.fillText(`σ=${condStd.toFixed(2)}`, SLICE_WIDTH - 45, 12);
    ctx.fillText(turn === 'X' ? 'p(x₁|x₂)' : 'p(x₂|x₁)', SLICE_WIDTH/2 - 20, SLICE_HEIGHT - 2);

  }, [turn, position, rho]);

  // Achievement check
  useEffect(() => {
    if (history.length >= 50) {
      unlockAchievement('STRATEGIST');
    }
  }, [history, unlockAchievement]);

  // Draw background contours
  const drawContours = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // Clear with paper color
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#e8e4df';
    ctx.lineWidth = 1;
    for(let i=0; i<WIDTH; i+=SCALE) {
      ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,HEIGHT); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(WIDTH,i); ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#d4cdc4';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ORIGIN_X, 0); ctx.lineTo(ORIGIN_X, HEIGHT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ORIGIN_Y); ctx.lineTo(WIDTH, ORIGIN_Y); ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = '#6b6560';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('x₁', WIDTH - 20, ORIGIN_Y - 8);
    ctx.fillText('x₂', ORIGIN_X + 8, 15);
    for (let i = -4; i <= 4; i += 2) {
      if (i !== 0) {
        ctx.fillText(i.toString(), ORIGIN_X + i * SCALE - 4, ORIGIN_Y + 14);
        ctx.fillText((-i).toString(), ORIGIN_X + 8, ORIGIN_Y + i * SCALE + 4);
      }
    }

    // Let's actually draw pixels for the heatmap once
    const imageData = ctx.createImageData(WIDTH, HEIGHT);
    const data = imageData.data;
    for (let py = 0; py < HEIGHT; py+=2) { // optimization: skip pixels
      for (let px = 0; px < WIDTH; px+=2) {
        const x = (px - ORIGIN_X) / SCALE;
        const y = -(py - ORIGIN_Y) / SCALE; // Flip Y
        const val = bivariateNormalPdf(x, y, 0, 0, 1, 1, rho);
        const intensity = Math.min(255, val * 1000);
        
        if (intensity > 10) {
            const idx = (py * WIDTH + px) * 4;
            // Draw 2x2 block - academic brown tone
            for(let dy=0; dy<2; dy++) {
                for(let dx=0; dx<2; dx++) {
                    const i = ((py+dy) * WIDTH + (px+dx)) * 4;
                    data[i] = 139;   // R
                    data[i+1] = 115; // G
                    data[i+2] = 85;  // B
                    data[i+3] = intensity * 0.5; // A
                }
            }
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);

  }, [rho]);

  // Draw Dynamic Elements (History, Current Line)
  const drawDynamic = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Draw history
    ctx.beginPath();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    if (history.length > 0) {
        const startX = ORIGIN_X + history[0].x * SCALE;
        const startY = ORIGIN_Y - history[0].y * SCALE;
        ctx.moveTo(startX, startY);
        for(let p of history) {
            ctx.lineTo(ORIGIN_X + p.x * SCALE, ORIGIN_Y - p.y * SCALE);
        }
    }
    // Draw line to current
    const currX = ORIGIN_X + position.x * SCALE;
    const currY = ORIGIN_Y - position.y * SCALE;
    ctx.lineTo(currX, currY);
    ctx.stroke();

    // Draw active constraint line
    ctx.beginPath();
    ctx.strokeStyle = '#6b5640';
    ctx.setLineDash([5, 5]);
    if (turn === 'X') {
        // Sampling X, Y is fixed (Horizontal line)
        ctx.moveTo(0, currY);
        ctx.lineTo(WIDTH, currY);
    } else {
        // Sampling Y, X is fixed (Vertical line)
        ctx.moveTo(currX, 0);
        ctx.lineTo(currX, HEIGHT);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw dot
    ctx.beginPath();
    ctx.fillStyle = '#1a1a1a';
    ctx.arc(currX, currY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#faf8f5';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [history, position, turn]);

  useEffect(() => {
    drawContours();
    drawDynamic();
  }, [drawContours, drawDynamic]);

  // Dedicated effect to update slice canvas when position/turn/rho changes
  useEffect(() => {
    drawConditionalSlice();
  }, [position, turn, rho, drawConditionalSlice]);


  const step = useCallback(() => {
    // Gibbs math:
    // If (X,Y) is Bivariate Normal with rho:
    // X | Y=y ~ N(rho*y, 1 - rho^2)
    // Y | X=x ~ N(rho*x, 1 - rho^2)
    const currentRho = rhoRef.current;
    const currentPosition = positionRef.current;
    const currentTurn = turnRef.current;

    const sd = Math.sqrt(1 - currentRho * currentRho);
    let newPos = { ...currentPosition };

    // Standard Normal Sample (Box-Muller)
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    if (currentTurn === 'X') {
       // Sample X given Y
       const mean = currentRho * currentPosition.y;
       newPos.x = mean + z * sd;
       setTurn('Y');
    } else {
       // Sample Y given X
       const mean = currentRho * currentPosition.x;
       newPos.y = mean + z * sd;
       setTurn('X');
    }

    setHistory(h => [...h, currentPosition]);
    setPosition(newPos);
  }, []);

  const reset = () => {
      setIsRunning(false);
      setHistory([]);
      setPosition({x: -2, y: -2});
      setTurn('Y');
  };

  // Auto mode
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      step();
    }, speed === 1 ? 500 : speed === 2 ? 100 : 20);
    return () => clearInterval(interval);
  }, [isRunning, speed, step]);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      <div className="flex-grow flex flex-col justify-center items-center bg-white rounded-xl border border-[#d4cdc4] p-4 shadow-sm">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="rounded cursor-crosshair" />
        
        {/* Conditional Slice Visualization */}
        <div className="mt-4 w-full max-w-[400px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6b6560] uppercase tracking-wider">
              Conditional Distribution (1D Slice)
            </span>
            <span className="text-xs text-[#9a9590] font-mono">
              {turn === 'X' ? `x₁ | x₂=${position.y.toFixed(2)}` : `x₂ | x₁=${position.x.toFixed(2)}`}
            </span>
          </div>
          <canvas 
            ref={sliceCanvasRef} 
            width={SLICE_WIDTH} 
            height={SLICE_HEIGHT} 
            className="rounded border border-[#d4cdc4]"
            style={{ width: SLICE_WIDTH, height: SLICE_HEIGHT }}
          />
        </div>
      </div>

      <div className="w-full lg:w-96 flex flex-col space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
        <div className="bg-white p-5 rounded-xl border border-[#d4cdc4] shadow-sm">
           <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">{t('gibbs.title')}</h2>
           
           <div className="space-y-4 mb-4">
             <div>
               <h4 className="text-sm font-bold text-[#8b7355] uppercase tracking-wider mb-2">{t('the_problem')}</h4>
               <div className="text-sm text-[#4a4540] leading-relaxed bg-[#faf8f5] p-3 rounded border border-[#e8e4df]">
                 <p className="mb-2">{t('gibbs.problem')}</p>
                 <div className="bg-white p-2 rounded border border-[#d4cdc4] text-center my-2">
                   <MathTex tex="P(\text{accept}) \approx \varepsilon^d" display />
                 </div>
                 <p className="text-xs">For d=100 with <MathTex tex="\varepsilon=0.9" />: <MathTex tex="0.9^{100} \approx 0.00003" />. {t('gibbs.problem_detail')}</p>
               </div>
             </div>
             
             <div>
               <h4 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider mb-2">{t('the_solution')}</h4>
               <p className="text-sm text-[#4a4540] leading-relaxed mb-2">
                 {t('gibbs.solution')} <strong>{t('gibbs.conditional')}</strong>.
               </p>
             </div>

             <div className="bg-[#1a1a1a] p-4 rounded space-y-2">
               <div className="text-[#e8e4df] text-sm">
                 <MathTex tex="\theta_1^{(t+1)} \sim \pi(\theta_1 | \theta_2^{(t)}, \ldots, \theta_d^{(t)}, D)" className="text-white" />
               </div>
               <div className="text-[#e8e4df] text-sm">
                 <MathTex tex="\theta_2^{(t+1)} \sim \pi(\theta_2 | \theta_1^{(t+1)}, \theta_3^{(t)}, \ldots, D)" className="text-white" />
               </div>
               <div className="text-[#6b6560] text-sm">...</div>
               <div className="text-[#8b7355] text-xs border-t border-[#4a4540] pt-2 mt-2">
                 Bivariate Normal: <MathTex tex="\theta_1|\theta_2 \sim \mathcal{N}\left(\mu_1 + \rho\frac{\sigma_1}{\sigma_2}(\theta_2-\mu_2), \sigma_1^2(1-\rho^2)\right)" className="text-[#8b7355]" />
               </div>
             </div>
           </div>

           <div className="bg-[#f0ebe4] p-3 rounded border border-[#d4cdc4] text-sm text-[#4a4540]">
             <strong>{t('in_simple_terms')}:</strong> {t('gibbs.eli5')}
           </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#d4cdc4] shadow-sm space-y-4">
           <div>
               <label className="text-sm text-[#6b6560] font-bold block mb-2">{t('gibbs.correlation')} (ρ): <span className="font-mono">{rho}</span></label>
               <input 
                 type="range" min="0" max="0.99" step="0.01" 
                 value={rho} onChange={(e) => {
                     setRho(Number(e.target.value));
                     reset();
                 }}
                 className="w-full accent-[#1a1a1a] h-2 bg-[#d4cdc4] rounded-lg appearance-none cursor-pointer"
               />
           </div>

           {/* Mixing Diagnostics - Compact */}
           <div className={`p-3 rounded-lg border ${correlationWarning ? 'border-amber-300 bg-amber-50' : 'border-[#e8e4df] bg-[#faf8f5]'}`}>
             <div className="flex items-center gap-2 mb-2">
               {correlationWarning && <AlertTriangle className="text-amber-500" size={14} />}
               <span className="text-xs font-bold text-[#6b6560] uppercase">Diagnostics</span>
               <span className="text-xs text-[#9a9590] ml-auto">{history.length} samples</span>
             </div>
             <div className="grid grid-cols-2 gap-2 text-xs font-mono">
               <div>
                 <span className="text-[#9a9590]">Var:</span>
                 <span className={`ml-1 font-bold ${conditionalVariance < 0.1 ? 'text-red-500' : 'text-[#1a1a1a]'}`}>
                   {conditionalVariance.toFixed(3)}
                 </span>
               </div>
               <div>
                 <span className="text-[#9a9590]">Mix:</span>
                 <span className={`ml-1 font-bold ${mixingTime > 50 ? 'text-red-500' : mixingTime > 10 ? 'text-amber-500' : 'text-green-600'}`}>
                   {mixingTime === Infinity ? '∞' : mixingTime}
                 </span>
               </div>
             </div>
           </div>

           <div className="p-3 bg-[#f5f0e8] rounded-lg border border-[#e8e4df] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                 <Lock className="text-[#6b5640]" size={14} />
                 <span className="font-mono">{turn === 'X' ? `x₂=${position.y.toFixed(2)}` : `x₁=${position.x.toFixed(2)}`}</span>
              </div>
              <ArrowRight className="text-[#9a9590]" size={14} />
              <span className="font-bold">Sample {turn === 'X' ? 'x₁' : 'x₂'}</span>
           </div>

           {/* Controls */}
           <div className="flex items-center gap-2">
             <button 
               onClick={step}
               disabled={isRunning}
               className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm"
             >
               Step
             </button>
             <button 
               onClick={() => setIsRunning(!isRunning)} 
               className={`p-2 rounded-lg ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'} text-white`}
             >
               {isRunning ? <Pause size={18} /> : <Play size={18} />}
             </button>
             <select 
               value={speed} 
               onChange={(e) => setSpeed(Number(e.target.value))}
               className="px-2 py-2 rounded-lg border border-[#d4cdc4] text-sm bg-white"
             >
               <option value={1}>1x</option>
               <option value={2}>5x</option>
               <option value={3}>50x</option>
             </select>
             <button onClick={reset} className="p-2 text-[#6b6560] hover:bg-[#f5f0e8] rounded-lg">
               <RotateCcw size={18} />
             </button>
           </div>
           
           <div className="pt-3 border-t border-[#e8e4df] text-[10px] text-[#9a9590] text-center">
             <span className="italic">References: Geman & Geman (1984), Box & Muller (1958)</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleGibbs;