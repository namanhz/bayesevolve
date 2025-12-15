import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, MousePointer2, RefreshCcw, AlertTriangle, Zap } from 'lucide-react';
import { useProgress } from '../contexts/ProgressContext';
import { useLanguage } from '../contexts/LanguageContext';
import { donutGradient } from '../services/mathUtils';
import MathTex from './Math';

// Energy canvas dimensions
const ENERGY_WIDTH = 250;
const ENERGY_HEIGHT = 80;

const WIDTH = 700;
const HEIGHT = 600;
const SCALE = 50;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

interface Particle {
  q: { x: number, y: number }; // Position
  p: { x: number, y: number }; // Momentum
  path: { x: number, y: number }[];
}

// Potential energy function (donut)
const potentialEnergy = (x: number, y: number) => {
  const R = 5; // Donut radius
  const r = Math.sqrt(x * x + y * y);
  return Math.pow(r - R, 2);
};

// Kinetic energy
const kineticEnergy = (px: number, py: number, m: number) => {
  return (px * px + py * py) / (2 * m);
};

// Physics Config (must be before component to avoid hoisting issues)
const mass = 1.0;

const ModuleHMC: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const energyCanvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useLanguage();
  const [particle, setParticle] = useState<Particle>({
    q: { x: 3, y: 0 },
    p: { x: 0, y: 0 },
    path: []
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [samples, setSamples] = useState<{x: number, y: number}[]>([]);
  const requestRef = useRef<number>();
  const draggingRef = useRef<{startX: number, startY: number} | null>(null);
  const [mousePos, setMousePos] = useState({x:0, y:0});
  const { unlockAchievement } = useProgress();
  const particleRef = useRef(particle);
  
  // New state for improvements
  const [dt, setDt] = useState(0.015); // Adjustable step size - very low for stability
  const [showGradient, setShowGradient] = useState(true);
  const [energyHistory, setEnergyHistory] = useState<{U: number, K: number, H: number}[]>([]);
  const [initialEnergy, setInitialEnergy] = useState<number | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    particleRef.current = particle;
  }, [particle]);

  // Calculate current energies
  const currentU = potentialEnergy(particle.q.x, particle.q.y);
  const currentK = kineticEnergy(particle.p.x, particle.p.y, mass);
  const currentH = currentU + currentK;
  const energyDrift = initialEnergy !== null ? Math.abs(currentH - initialEnergy) : 0;
  const energyDriftPercent = initialEnergy !== null && initialEnergy !== 0 ? (energyDrift / initialEnergy) * 100 : 0;
  const isUnstable = energyDriftPercent > 40; // Very forgiving threshold

  // Achievement check
  useEffect(() => {
    if (samples.length >= 20) {
      unlockAchievement('PHYSICIST');
    }
  }, [samples, unlockAchievement]);

  // Render Loop
  const render = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Clear with paper color
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw coordinate grid
    ctx.strokeStyle = '#e8e4df';
    ctx.lineWidth = 1;
    for (let i = 0; i <= WIDTH; i += SCALE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, HEIGHT);
      ctx.stroke();
    }
    for (let j = 0; j <= HEIGHT; j += SCALE) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(WIDTH, j);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#d4cdc4';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CENTER_X, 0); ctx.lineTo(CENTER_X, HEIGHT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, CENTER_Y); ctx.lineTo(WIDTH, CENTER_Y); ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = '#6b6560';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('q₁', WIDTH - 20, CENTER_Y - 8);
    ctx.fillText('q₂', CENTER_X + 8, 15);

    // Draw gradient field (arrows showing -∇U direction)
    if (showGradient && !isSimulating) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 1;
      
      for (let gx = -6; gx <= 6; gx += 1.5) {
        for (let gy = -5; gy <= 5; gy += 1.5) {
          const grad = donutGradient(gx, gy);
          const magnitude = Math.sqrt(grad.dx * grad.dx + grad.dy * grad.dy);
          if (magnitude > 0.1) {
            const scale = Math.min(0.8, magnitude * 0.15);
            const nx = -grad.dx / magnitude * scale;
            const ny = -grad.dy / magnitude * scale;
            
            const startX = CENTER_X + gx * SCALE;
            const startY = CENTER_Y + gy * SCALE;
            const endX = startX + nx * SCALE;
            const endY = startY + ny * SCALE;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Arrowhead
            const angle = Math.atan2(ny, nx);
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - 5 * Math.cos(angle - 0.5), endY - 5 * Math.sin(angle - 0.5));
            ctx.lineTo(endX - 5 * Math.cos(angle + 0.5), endY - 5 * Math.sin(angle + 0.5));
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    // Draw Potential Surface (The Donut Bowl)
    // We visualize this as rings
    ctx.lineWidth = 1;
    for (let r = 1; r < 9; r += 0.5) {
      const energy = Math.pow(r - 5, 2); // (r-R)^2
      const alpha = Math.max(0.05, 0.4 - energy * 0.08);
      ctx.beginPath();
      ctx.strokeStyle = `rgba(139, 115, 85, ${alpha})`; // Academic brown
      ctx.arc(CENTER_X, CENTER_Y, r * SCALE, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw Collected Samples
    ctx.fillStyle = 'rgba(26, 26, 26, 0.4)';
    for(const s of samples) {
        ctx.beginPath();
        ctx.arc(CENTER_X + s.x * SCALE, CENTER_Y + s.y * SCALE, 3, 0, Math.PI*2);
        ctx.fill();
    }

    // Draw Particle Path
    if (particle.path.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#6b5640';
      ctx.lineWidth = 2;
      const start = particle.path[0];
      ctx.moveTo(CENTER_X + start.x * SCALE, CENTER_Y + start.y * SCALE);
      for (const pt of particle.path) {
        ctx.lineTo(CENTER_X + pt.x * SCALE, CENTER_Y + pt.y * SCALE);
      }
      ctx.stroke();
    }

    // Draw Particle
    const px = CENTER_X + particle.q.x * SCALE;
    const py = CENTER_Y + particle.q.y * SCALE;
    
    ctx.beginPath();
    ctx.fillStyle = '#1a1a1a';
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#faf8f5';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Drag Vector (Flick)
    if (draggingRef.current && !isSimulating) {
        ctx.beginPath();
        ctx.strokeStyle = '#6b5640';
        ctx.setLineDash([5, 5]);
        ctx.moveTo(px, py);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

  }, [particle, samples, isSimulating, mousePos, showGradient]);

  // Draw energy conservation plot
  const drawEnergyPlot = useCallback(() => {
    const ctx = energyCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, ENERGY_WIDTH, ENERGY_HEIGHT);
    ctx.strokeStyle = '#d4cdc4';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, ENERGY_WIDTH, ENERGY_HEIGHT);

    if (energyHistory.length < 2) {
      ctx.fillStyle = '#9a9590';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText('Energy plot appears during simulation', 10, ENERGY_HEIGHT / 2);
      return;
    }

    // Find scale
    const maxH = Math.max(...energyHistory.map(e => e.H)) * 1.2;
    const minH = Math.min(...energyHistory.map(e => e.H)) * 0.8;
    const range = maxH - minH || 1;

    // Draw H line (total energy - should be constant)
    ctx.beginPath();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    energyHistory.forEach((e, i) => {
      const x = (i / (energyHistory.length - 1)) * ENERGY_WIDTH;
      const y = ENERGY_HEIGHT - ((e.H - minH) / range) * (ENERGY_HEIGHT - 10) - 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw initial energy reference line
    if (initialEnergy !== null) {
      const refY = ENERGY_HEIGHT - ((initialEnergy - minH) / range) * (ENERGY_HEIGHT - 10) - 5;
      ctx.beginPath();
      ctx.strokeStyle = '#22c55e';
      ctx.setLineDash([3, 3]);
      ctx.moveTo(0, refY);
      ctx.lineTo(ENERGY_WIDTH, refY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Labels
    ctx.fillStyle = '#6b6560';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText('H(q,p)', 5, 12);
    ctx.fillText(`ΔH: ${energyDriftPercent.toFixed(1)}%`, ENERGY_WIDTH - 55, 12);

  }, [energyHistory, initialEnergy, energyDriftPercent]);

  useEffect(() => {
    drawEnergyPlot();
  }, [drawEnergyPlot]);

  useEffect(() => {
    render();
  }, [render]);

  // Physics Engine (Leapfrog Integrator)
  const stepPhysics = useCallback(() => {
    setParticle(prev => {
      let { q, p, path } = prev;

      // Half step for momentum
      const grad1 = donutGradient(q.x, q.y);
      let px = p.x - (dt / 2) * grad1.dx;
      let py = p.y - (dt / 2) * grad1.dy;

      // Full step for position
      const qx = q.x + dt * (px / mass);
      const qy = q.y + dt * (py / mass);

      // Half step for momentum
      const grad2 = donutGradient(qx, qy);
      px = px - (dt / 2) * grad2.dx;
      py = py - (dt / 2) * grad2.dy;

      // Track energy for conservation plot
      const U = potentialEnergy(qx, qy);
      const K = kineticEnergy(px, py, mass);
      const H = U + K;
      setEnergyHistory(hist => [...hist.slice(-100), { U, K, H }]);
      
      return {
        q: { x: qx, y: qy },
        p: { x: px, y: py },
        path: [...path, { x: qx, y: qy }]
      };
    });
  }, [dt]);

  useEffect(() => {
    if (isSimulating) {
      const loop = () => {
        stepPhysics();
        requestRef.current = requestAnimationFrame(loop);
      };
      loop();
      
      // Stop automatically after some time to simulate a "sample" being taken
      const timer = setTimeout(() => {
          setIsSimulating(false);
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          // Use ref to get current position without causing dependency loop
          setSamples(s => [...s, { ...particleRef.current.q }]);
      }, 3000);
      
      return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          clearTimeout(timer);
      };
    }
  }, [isSimulating, stepPhysics]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if(isSimulating) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    draggingRef.current = {
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
      });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!draggingRef.current || isSimulating) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    // Calculate Momentum vector from drag (inverse) - reduced scaling for stability
    const px = (draggingRef.current.startX - endX) * 0.025;
    const py = (draggingRef.current.startY - endY) * 0.025;

    // Reset path but keep start pos
    setParticle(prev => ({
        ...prev,
        p: { x: px, y: py },
        path: [] 
    }));
    
    // Set initial energy for tracking
    const initU = potentialEnergy(particleRef.current.q.x, particleRef.current.q.y);
    const initK = kineticEnergy(px, py, mass);
    setInitialEnergy(initU + initK);
    setEnergyHistory([]);
    
    setIsSimulating(true);
    draggingRef.current = null;
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-8">
      {/* Canvas - Left Side */}
      <div className="flex-grow flex justify-center items-center bg-white rounded-xl border border-[#d4cdc4] p-4 shadow-sm relative">
        <div className="relative">
          <canvas 
            ref={canvasRef} 
            width={WIDTH} 
            height={HEIGHT} 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="bg-[#faf8f5] rounded-lg cursor-pointer"
          />
          {!isSimulating && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-[#9a9590] animate-pulse text-center">
              <MousePointer2 className="mx-auto mb-2" />
              {t('hmc.click_set')}
            </div>
          )}
          <div className="absolute top-3 left-3 bg-white/95 p-2 rounded text-xs text-[#1a1a1a] backdrop-blur border border-[#d4cdc4] font-mono">
            <p>||p|| = {Math.sqrt(particle.p.x**2 + particle.p.y**2).toFixed(2)}</p>
            <p>n = {samples.length} / 20</p>
          </div>
          
          {/* Energy Conservation Panel */}
          <div className="absolute top-3 right-3 bg-white/95 p-3 rounded backdrop-blur border border-[#d4cdc4]">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-[#6b5640]" />
              <span className="text-xs font-bold text-[#6b6560] uppercase">Energy</span>
              {isUnstable && <AlertTriangle size={14} className="text-red-500" />}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2">
              <div>
                <span className="text-[#9a9590]">U(q):</span>
                <span className="ml-1 text-[#1a1a1a]">{currentU.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#9a9590]">K(p):</span>
                <span className="ml-1 text-[#1a1a1a]">{currentK.toFixed(2)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#9a9590]">H=U+K:</span>
                <span className={`ml-1 font-bold ${isUnstable ? 'text-red-500' : 'text-[#1a1a1a]'}`}>
                  {currentH.toFixed(2)}
                </span>
                {initialEnergy !== null && (
                  <span className={`ml-1 text-xs ${energyDriftPercent > 5 ? 'text-amber-500' : 'text-green-600'}`}>
                    (Δ{energyDriftPercent.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
            <canvas 
              ref={energyCanvasRef}
              width={ENERGY_WIDTH}
              height={ENERGY_HEIGHT}
              className="rounded border border-[#e8e4df]"
              style={{ width: ENERGY_WIDTH, height: ENERGY_HEIGHT }}
            />
          </div>
        </div>
      </div>

      {/* Right Side - Description & Controls */}
      <div className="w-full lg:w-1/3 flex flex-col space-y-6">
        <div className="bg-white p-6 rounded-xl border border-[#d4cdc4] shadow-sm">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">{t('hmc.title')}</h2>
          
          <div className="space-y-4 mb-4">
            <div>
              <h4 className="text-sm font-bold text-[#8b7355] uppercase tracking-wider mb-2">{t('the_problem')}</h4>
              <div className="text-sm text-[#4a4540] leading-relaxed bg-[#faf8f5] p-3 rounded border border-[#e8e4df]">
                <p className="mb-2">{t('hmc.problem')} <MathTex tex="O(d^2)" /> {t('hmc.problem_detail')} <MathTex tex="\rho" />, {t('hmc.problem_detail2')}</p>
                <div className="bg-white p-2 rounded border border-[#d4cdc4] text-center my-2">
                  <MathTex tex="O\left(\frac{1}{1-\rho^2}\right) \text{ steps}" display />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider mb-2">{t('the_solution')}</h4>
              <p className="text-sm text-[#4a4540] leading-relaxed mb-2">
                {t('hmc.solution')}
              </p>
            </div>

            <div className="bg-[#1a1a1a] p-4 rounded space-y-2">
              <div className="text-[#e8e4df] text-sm">
                <MathTex tex="H(q,p) = U(q) + K(p) = -\log\tilde{\pi}(q|D) + \frac{p^T M^{-1} p}{2}" className="text-white" />
              </div>
              <div className="text-[#e8e4df] text-sm mt-2">
                <MathTex tex="\frac{dq}{dt} = M^{-1}p, \quad \frac{dp}{dt} = \nabla\log\tilde{\pi}(q|D)" className="text-white" />
              </div>
              <div className="text-[#8b7355] text-xs border-t border-[#4a4540] pt-2 mt-2">
                Accept: <MathTex tex="\alpha = \min(1, e^{-H(q',p') + H(q,p)})" className="text-[#8b7355]" />
              </div>
            </div>
          </div>

          <div className="bg-[#f0ebe4] p-3 rounded border border-[#d4cdc4] text-sm text-[#4a4540]">
            <strong>{t('in_simple_terms')}:</strong> {t('hmc.eli5')}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-xl border border-[#d4cdc4] shadow-sm space-y-4">
          {/* Step Size Control - Purple Theme */}
          <div className={`p-4 rounded-lg border-2 ${isUnstable ? 'border-red-300 bg-red-50' : 'border-purple-200 bg-purple-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${isUnstable ? 'bg-red-500' : 'bg-purple-500'}`}></div>
              <span className={`text-sm font-bold uppercase tracking-wider ${isUnstable ? 'text-red-700' : 'text-purple-700'}`}>
                Leapfrog Step Size (dt)
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-purple-700">dt = <span className="font-mono font-bold">{dt.toFixed(3)}</span></span>
                <span className={`font-bold ${dt > 0.15 ? 'text-red-500' : dt > 0.08 ? 'text-amber-500' : 'text-green-600'}`}>
                  {dt > 0.15 ? 'UNSTABLE!' : dt > 0.08 ? 'Risky' : 'Stable'}
                </span>
              </div>
              <input 
                type="range" min="0.01" max="0.25" step="0.01" 
                value={dt} onChange={(e) => setDt(Number(e.target.value))}
                className="w-full accent-purple-600 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-purple-400 mt-1">
                <span>0.01 (stable)</span>
                <span>0.25 (unstable)</span>
              </div>
            </div>
            {isUnstable && (
              <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded flex items-center gap-1">
                <AlertTriangle size={12} /> Energy diverging! Reduce dt for stability.
              </div>
            )}
          </div>

          {/* Gentle Launch Button - Easy mode for users */}
          <button 
            onClick={() => {
              if (isSimulating) return;
              // Give a gentle tangential momentum for smooth orbit
              const q = particleRef.current.q;
              const r = Math.sqrt(q.x * q.x + q.y * q.y);
              // Tangent direction (perpendicular to radial)
              const tangentX = -q.y / r;
              const tangentY = q.x / r;
              // Gentle speed - very conservative for stable orbit
              const speed = 0.5;
              const px = tangentX * speed;
              const py = tangentY * speed;
              
              setParticle(prev => ({
                ...prev,
                p: { x: px, y: py },
                path: []
              }));
              
              const initU = potentialEnergy(q.x, q.y);
              const initK = kineticEnergy(px, py, mass);
              setInitialEnergy(initU + initK);
              setEnergyHistory([]);
              setIsSimulating(true);
            }}
            disabled={isSimulating}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-md font-semibold"
          >
            <Play size={16} /> Gentle Launch (Easy Mode)
          </button>

          <p className="text-xs text-center text-[#9a9590]">
            Or drag on the canvas to set custom momentum
          </p>

          {/* Gradient Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#f5f0e8] rounded-lg border border-[#e8e4df]">
            <span className="text-sm text-[#4a4540]">Show gradient field (-∇U)</span>
            <button
              onClick={() => setShowGradient(!showGradient)}
              className={`w-12 h-6 rounded-full transition-colors ${showGradient ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${showGradient ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <button 
            onClick={() => {
              setIsSimulating(false);
              if (requestRef.current) cancelAnimationFrame(requestRef.current);
              setSamples([]);
              setParticle({ q: { x: 3, y: 0 }, p: { x: 0, y: 0 }, path: [] });
              setEnergyHistory([]);
              setInitialEnergy(null);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#1a1a1a] hover:bg-[#2c2c2c] text-[#faf8f5] rounded-lg transition-colors shadow-md"
          >
            <RefreshCcw size={16} /> {t('reset')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleHMC;