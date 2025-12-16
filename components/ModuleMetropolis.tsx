import React, { useRef, useEffect, useState, useCallback } from 'react';
import { targetMapPdf } from '../services/mathUtils';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useProgress } from '../contexts/ProgressContext';
import { useLanguage } from '../contexts/LanguageContext';
import MathTex from './Math';

const WIDTH = 700;
const HEIGHT = 700;
const SCALE = 70; // Pixels per unit

const ModuleMetropolis: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState({ x: 5, y: 5 });
  const [proposal, setProposal] = useState<{ x: number, y: number } | null>(null);
  const [history, setHistory] = useState<{ x: number, y: number }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [proposalSigma, setProposalSigma] = useState(0.8); // Adjustable proposal width
  const [lastDecision, setLastDecision] = useState<{accepted: boolean, ratio: number, roll: number} | null>(null);
  const { unlockAchievement } = useProgress();
  const { t } = useLanguage();

  // Refs for stable auto-run (avoid infinite loop)
  const positionRef = useRef(position);
  const proposalSigmaRef = useRef(proposalSigma);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { proposalSigmaRef.current = proposalSigma; }, [proposalSigma]);

  // Calculate acceptance rate quality
  const getAcceptanceQuality = (rate: number) => {
    if (rate < 0.15) return { color: 'text-red-500', label: 'Too large σ', hint: 'Decrease proposal width' };
    if (rate > 0.50) return { color: 'text-yellow-500', label: 'Too small σ', hint: 'Increase proposal width' };
    return { color: 'text-green-500', label: 'Optimal!', hint: '23-44% is ideal' };
  };

  // Initialize Fog
  useEffect(() => {
    const fogCtx = fogCanvasRef.current?.getContext('2d');
    if (fogCtx) {
      fogCtx.fillStyle = '#f0ebe4';
      fogCtx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }, []);

  // Unlock achievement logic
  useEffect(() => {
    if (totalCount >= 500) {
      unlockAchievement('EXPLORER');
    }
  }, [totalCount, unlockAchievement]);

  const drawScene = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Clear background with academic paper color
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw probability heatmap (the "mountains")
    const imageData = ctx.createImageData(WIDTH, HEIGHT);
    const data = imageData.data;
    for (let py = 0; py < HEIGHT; py += 2) {
      for (let px = 0; px < WIDTH; px += 2) {
        const x = px / SCALE;
        const y = (HEIGHT - py) / SCALE;
        const pdf = targetMapPdf(x, y);
        const intensity = Math.min(255, pdf * 800);
        
        if (intensity > 5) {
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const i = ((py + dy) * WIDTH + (px + dx)) * 4;
              data[i] = 34;      // R (dark academic)
              data[i + 1] = 139; // G (green-ish for mountains)
              data[i + 2] = 34;  // B
              data[i + 3] = intensity * 0.4; // A
            }
          }
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw coordinate grid
    ctx.strokeStyle = 'rgba(232, 228, 223, 0.5)';
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

    // Draw axis labels
    ctx.fillStyle = '#6b6560';
    ctx.font = '10px JetBrains Mono, monospace';
    for (let i = 0; i <= WIDTH / SCALE; i += 2) {
      ctx.fillText(i.toString(), i * SCALE + 2, HEIGHT - 4);
    }
    for (let j = 0; j <= HEIGHT / SCALE; j += 2) {
      ctx.fillText(j.toString(), 4, HEIGHT - j * SCALE - 4);
    }

    // Draw History Trail
    if (history.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(139, 115, 85, 0.4)'; // academic brown
      ctx.lineWidth = 1;
      ctx.moveTo(history[0].x * SCALE, HEIGHT - history[0].y * SCALE);
      for (let i = 1; i < history.length; i++) {
        ctx.lineTo(history[i].x * SCALE, HEIGHT - history[i].y * SCALE);
      }
      ctx.stroke();
    }

    // Draw Proposal Distribution Circle (shows where proposals come from)
    if (!isRunning) {
      ctx.beginPath();
      ctx.arc(position.x * SCALE, HEIGHT - position.y * SCALE, proposalSigma * SCALE * 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Proposal if exists (only in manual mode)
    if (proposal && !isRunning) {
      ctx.beginPath();
      ctx.strokeStyle = '#6b5640';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.moveTo(position.x * SCALE, HEIGHT - position.y * SCALE);
      ctx.lineTo(proposal.x * SCALE, HEIGHT - proposal.y * SCALE);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.fillStyle = 'rgba(107, 86, 64, 0.7)';
      ctx.arc(proposal.x * SCALE, HEIGHT - proposal.y * SCALE, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#faf8f5';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw Current Position
    ctx.beginPath();
    ctx.fillStyle = '#1a1a1a';
    ctx.arc(position.x * SCALE, HEIGHT - position.y * SCALE, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#faf8f5';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [history, position, proposal, isRunning, proposalSigma]);

  // Update Fog of War
  const updateFog = useCallback((pos: {x: number, y: number}) => {
    const ctx = fogCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    const gradient = ctx.createRadialGradient(
      pos.x * SCALE, HEIGHT - pos.y * SCALE, 10,
      pos.x * SCALE, HEIGHT - pos.y * SCALE, 60
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x * SCALE, HEIGHT - pos.y * SCALE, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  useEffect(() => {
    drawScene();
    updateFog(position);
  }, [position, proposal, history, drawScene, updateFog]);

  // Simulation Step Logic (uses refs to avoid infinite loop)
  const step = useCallback(() => {
    const pos = positionRef.current;
    const sigma = proposalSigmaRef.current;
    const currentPdf = targetMapPdf(pos.x, pos.y);
    // Propose new pos (Random Walk with adjustable sigma)
    const propX = pos.x + (Math.random() - 0.5) * 2 * sigma;
    const propY = pos.y + (Math.random() - 0.5) * 2 * sigma;
    
    // Bounds check
    if(propX < 0 || propX > WIDTH/SCALE || propY < 0 || propY > HEIGHT/SCALE) {
        setTotalCount(c => c + 1);
        return; // Reject out of bounds
    }

    const propPdf = targetMapPdf(propX, propY);
    const acceptanceRatio = propPdf / currentPdf;

    if (Math.random() < acceptanceRatio) {
      // Accept
      const newPos = { x: propX, y: propY };
      setPosition(newPos);
      setHistory(h => [...h.slice(-200), newPos]); // Keep last 200 for perf
      setAcceptedCount(c => c + 1);
    } else {
      // Reject - stay in place
      setHistory(h => [...h.slice(-200), pos]);
    }
    setTotalCount(c => c + 1);
  }, []); // Empty deps - uses refs

  // Auto-run loop
  useEffect(() => {
    let animId: number;
    if (isRunning) {
      const loop = () => {
        // Perform multiple steps per frame based on speed
        const stepsPerFrame = speed === 1 ? 1 : speed === 2 ? 5 : 50;
        for (let i = 0; i < stepsPerFrame; i++) {
          step();
        }
        animId = requestAnimationFrame(loop);
      };
      loop();
    }
    return () => cancelAnimationFrame(animId);
  }, [isRunning, speed, step]);

  const handleManualPropose = () => {
    if (proposal) return; // Already proposed
    const propX = position.x + (Math.random() - 0.5) * 2 * proposalSigma;
    const propY = position.y + (Math.random() - 0.5) * 2 * proposalSigma;
    setProposal({ x: propX, y: propY });
    setLastDecision(null);
  };

  const handleManualDecide = () => {
    if (!proposal) return;
    const currentPdf = targetMapPdf(position.x, position.y);
    const propPdf = targetMapPdf(proposal.x, proposal.y);
    const ratio = propPdf / currentPdf;
    const roll = Math.random();
    const accepted = roll < Math.min(1, ratio);
    
    setLastDecision({ accepted, ratio, roll });
    
    if (accepted) {
      setPosition(proposal);
      setHistory(h => [...h, proposal]);
      setAcceptedCount(c => c + 1);
    } else {
      setHistory(h => [...h, position]);
    }
    setTotalCount(c => c + 1);
    setProposal(null);
  };

  const reset = () => {
    setPosition({ x: 5, y: 5 });
    setProposal(null);
    setHistory([]);
    setAcceptedCount(0);
    setTotalCount(0);
    setIsRunning(false);
    setLastDecision(null);
    const fogCtx = fogCanvasRef.current?.getContext('2d');
    if (fogCtx) {
      fogCtx.fillStyle = '#f0ebe4';
      fogCtx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      {/* Canvas - Left Side */}
      <div className="flex-grow flex justify-center items-center bg-white rounded-xl border border-[#d4cdc4] p-2 shadow-sm">
        <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="absolute inset-0 z-10 rounded" />
          <canvas ref={fogCanvasRef} width={WIDTH} height={HEIGHT} className="relative z-20 pointer-events-none opacity-70 rounded" />
          
          <div className="absolute top-3 left-3 z-30 bg-white/95 p-2 rounded text-xs text-[#1a1a1a] backdrop-blur border border-[#d4cdc4] font-mono">
            <div>{t('mh.accept_rate')}: <span className="font-bold">{totalCount > 0 ? ((acceptedCount/totalCount)*100).toFixed(1) : 0}%</span></div>
            <div className="text-[#6b6560]">{t('mh.samples')}: {totalCount} <span className="text-[#9a9590]">({t('mh.goal')}: 500)</span></div>
          </div>
          <div className="absolute bottom-3 left-3 z-30 text-xs text-[#6b6560] max-w-[180px] bg-white/80 p-2 rounded backdrop-blur">
            {t('mh.fog_hint')}
          </div>
        </div>
      </div>

      {/* Right Side - Description & Controls */}
      <div className="w-full lg:w-1/3 flex flex-col space-y-4">
        <div className="bg-white p-4 rounded-xl border border-[#d4cdc4] shadow-sm">
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">{t('mh.title')}</h2>
          
          <div className="space-y-3 mb-3">
            <div>
              <h4 className="text-xs font-bold text-[#8b7355] uppercase tracking-wider mb-1">{t('the_problem')}</h4>
              <div className="text-xs text-[#4a4540] leading-relaxed bg-[#faf8f5] p-2 rounded border border-[#e8e4df]">
                <p className="mb-1">{t('mh.problem')}</p>
                <div className="bg-white p-1 rounded border border-[#d4cdc4] text-center my-1">
                  <MathTex tex="\pi(\theta|D) = \frac{\mathcal{L}(D|\theta)\pi(\theta)}{Z}" display />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider mb-1">{t('the_solution')}</h4>
              <p className="text-xs text-[#4a4540] leading-relaxed">
                {t('mh.solution')} <MathTex tex="\pi(\theta|D)" /> {t('mh.solution_detail')}
              </p>
            </div>
          </div>

          <div className="bg-[#f0ebe4] p-2 rounded border border-[#d4cdc4] text-xs text-[#4a4540]">
            <strong>{t('in_simple_terms')}:</strong> {t('mh.eli5')}
          </div>
        </div>

        {/* Controls - Mode Tabs */}
        <div className="bg-white p-6 rounded-xl border border-[#d4cdc4] shadow-sm space-y-4">
          {/* Manual Mode - Blue Theme */}
          <div className="border-2 border-blue-200 bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">{t('mh.manual_mode')}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleManualPropose} 
                disabled={isRunning || proposal !== null}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-3 rounded text-sm font-medium transition-colors shadow-md"
              >
                1. {t('mh.propose')} θ'
              </button>
              <button 
                onClick={handleManualDecide} 
                disabled={isRunning || proposal === null}
                className="flex-1 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-3 rounded text-sm font-medium transition-colors shadow-md"
              >
                2. {t('mh.accept_reject')}
              </button>
            </div>
            {/* Acceptance Probability Meter */}
            {proposal && (
              <div className="mt-3 p-3 bg-white rounded border border-blue-200 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">π(θ):</span>
                  <span className="text-blue-700">{targetMapPdf(position.x, position.y).toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">π(θ'):</span>
                  <span className="text-blue-700">{targetMapPdf(proposal.x, proposal.y).toFixed(4)}</span>
                </div>
                <div className="border-t border-blue-100 pt-1 mt-1">
                  <div className="flex justify-between font-bold">
                    <span>Ratio:</span>
                    <span className={targetMapPdf(proposal.x, proposal.y) >= targetMapPdf(position.x, position.y) ? 'text-green-600' : 'text-amber-600'}>
                      {(targetMapPdf(proposal.x, proposal.y) / targetMapPdf(position.x, position.y)).toFixed(3)}
                      {targetMapPdf(proposal.x, proposal.y) >= targetMapPdf(position.x, position.y) ? ' ≥1 ✓' : ' <1'}
                    </span>
                  </div>
                </div>
                <div className="text-center pt-1 text-blue-600">
                  {targetMapPdf(proposal.x, proposal.y) > targetMapPdf(position.x, position.y) 
                    ? `↑ ${t('mh.uphill')} - Always Accept` 
                    : `↓ ${t('mh.downhill')} - Accept with prob ${(targetMapPdf(proposal.x, proposal.y) / targetMapPdf(position.x, position.y) * 100).toFixed(0)}%`}
                </div>
              </div>
            )}
            {/* Last Decision Result */}
            {lastDecision && !proposal && (
              <div className={`mt-3 p-3 rounded border text-xs font-mono ${lastDecision.accepted ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="font-bold text-center mb-1">
                  {lastDecision.accepted ? '✓ ACCEPTED' : '✗ REJECTED'}
                </div>
                <div className="text-gray-600 text-center">
                  ratio={lastDecision.ratio.toFixed(3)}, u={lastDecision.roll.toFixed(3)}
                  {lastDecision.ratio >= 1 ? ' (ratio≥1)' : ` (${lastDecision.roll.toFixed(2)} ${lastDecision.accepted ? '<' : '≥'} ${Math.min(1, lastDecision.ratio).toFixed(2)})`}
                </div>
              </div>
            )}
          </div>

          {/* Proposal Width Control - Purple Theme */}
          <div className="border-2 border-purple-200 bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm font-bold text-purple-700 uppercase tracking-wider">Proposal Tuning</span>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-purple-700">Proposal σ: <span className="font-mono font-bold">{proposalSigma.toFixed(2)}</span></span>
                {totalCount > 10 && (
                  <span className={`font-bold ${getAcceptanceQuality(acceptedCount/totalCount).color}`}>
                    {getAcceptanceQuality(acceptedCount/totalCount).label}
                  </span>
                )}
              </div>
              <input 
                type="range" min="0.2" max="2.0" step="0.1" 
                value={proposalSigma} onChange={(e) => setProposalSigma(Number(e.target.value))}
                className="w-full accent-purple-600 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-purple-400 mt-1">
                <span>Small (local)</span>
                <span>Large (global)</span>
              </div>
              {totalCount > 10 && (
                <div className="text-xs text-purple-600 mt-2 text-center">
                  {getAcceptanceQuality(acceptedCount/totalCount).hint}
                </div>
              )}
            </div>
          </div>

          {/* Auto Mode - Green Theme */}
          <div className="border-2 border-green-200 bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-bold text-green-700 uppercase tracking-wider">{t('mh.auto_mode')}</span>
            </div>
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => setIsRunning(!isRunning)} 
                 className={`p-3 rounded-full shadow-md transition-all active:scale-95 ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'} text-white`}
               >
                 {isRunning ? <Pause size={20} /> : <Play size={20} />}
               </button>
               <div className="flex-1">
                 <label className="text-xs text-green-700 font-medium">Speed: {speed === 1 ? '1x' : speed === 2 ? '5x' : '50x'}</label>
                 <input 
                   type="range" min="1" max="3" step="1" 
                   value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                   className="w-full mt-1 accent-green-600 h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                 />
               </div>
            </div>
          </div>

          <button onClick={reset} className="w-full text-[#9a9590] hover:text-[#4a4540] text-sm flex items-center justify-center gap-2 py-2">
            <RotateCcw size={14} /> {t('mh.reset_sampler')}
          </button>
          
          <div className="pt-3 border-t border-[#e8e4df] text-[10px] text-[#9a9590] text-center">
            <span className="italic">References: Metropolis et al. (1953), Hastings (1970)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleMetropolis;