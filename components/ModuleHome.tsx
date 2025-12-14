import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, ArrowRight, BookOpen, Zap, Grid3X3, Atom, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

declare global {
  interface Window {
    katex: {
      render: (tex: string, element: HTMLElement, options?: object) => void;
    };
  }
}

const MathBlock: React.FC<{ tex: string; display?: boolean }> = ({ tex, display = false }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current && window.katex) {
      try {
        window.katex.render(tex, ref.current, { displayMode: display, throwOnError: false });
      } catch (e) {
        if (ref.current) ref.current.textContent = tex;
      }
    }
  }, [tex, display]);
  return <span ref={ref} />;
};

interface ModuleHomeProps {
  onNavigate: (module: string) => void;
}

interface Era {
  id: string;
  moduleId: string;
  icon: React.ElementType;
  title: string;
  period: string;
  subtitle: string;
  technicalContent: {
    problem: string;
    solution: string;
    math: string[];
    keyInsight: string;
  };
  eli5: string;
}

const eras: Era[] = [
  {
    id: 'analytical',
    moduleId: 'analytical',
    icon: BookOpen,
    title: 'The Analytical Era',
    period: '1763 - 1950s',
    subtitle: 'Conjugate Priors & Closed-Form Solutions',
    technicalContent: {
      problem: `The fundamental problem in Bayesian inference is computing the posterior distribution. The denominator—the marginal likelihood or "evidence"—requires integrating over the entire parameter space. For most likelihood-prior combinations, this integral has no closed-form solution.`,
      solution: `Conjugate priors exploit a mathematical trick: if the prior belongs to the same family as the posterior, the integral cancels algebraically. The normalization constant is known analytically because these distributions have closed-form normalizers.`,
      math: [
        '\\pi(\\theta|D) = \\frac{\\mathcal{L}(D|\\theta)\\pi(\\theta)}{\\int \\mathcal{L}(D|\\theta)\\pi(\\theta)d\\theta}',
        '\\text{Beta-Binomial: } \\text{Beta}(\\alpha,\\beta) + \\text{Binom}(n,k) \\to \\text{Beta}(\\alpha+k, \\beta+n-k)',
        '\\text{Normal-Normal: } \\mathcal{N}(\\mu_0,\\sigma_0^2) + \\mathcal{N}(\\bar{x},\\sigma^2/n) \\to \\mathcal{N}(\\mu_n,\\sigma_n^2)',
        '\\text{Gamma-Poisson: } \\Gamma(\\alpha,\\beta) + \\text{Pois}(\\Sigma k) \\to \\Gamma(\\alpha+\\Sigma k, \\beta+T)'
      ],
      keyInsight: `Conjugate priors work because they're closed under Bayesian updating—the functional form is preserved. This restricts us to a tiny subset of all possible models, but within that subset, inference is instantaneous.`
    },
    eli5: `Imagine you have a magic calculator that only works for certain types of math problems. If your problem fits the calculator's format, you get the answer instantly. But most real-world problems don't fit, so the calculator is useless. Conjugate priors are like having a few "lucky" problem formats where the math just works out perfectly.`
  },
  {
    id: 'simulation',
    moduleId: 'metropolis',
    icon: Zap,
    title: 'The Simulation Revolution',
    period: '1953 - 1980s',
    subtitle: 'Metropolis-Hastings & Random Walks',
    technicalContent: {
      problem: `When the posterior cannot be normalized analytically, we cannot sample from it directly or compute expectations. The conjugate trick only works for ~10 distribution families. Real models produce posteriors with no closed form.`,
      solution: `Metropolis-Hastings constructs a Markov chain whose stationary distribution IS the target posterior, even though we can't normalize it. We only need the unnormalized posterior and acceptance ratios.`,
      math: [
        `\\alpha = \\min\\left(1, \\frac{\\tilde{\\pi}(\\theta^\\prime)}{\\tilde{\\pi}(\\theta)} \\cdot \\frac{q(\\theta|\\theta^\\prime)}{q(\\theta^\\prime|\\theta)}\\right)`,
        `\\text{Detailed Balance: } \\pi(\\theta)P(\\theta \\to \\theta^\\prime) = \\pi(\\theta^\\prime)P(\\theta^\\prime \\to \\theta)`,
        `\\text{Ergodic: } \\frac{1}{N}\\sum_{t=1}^N f(\\theta_t) \\to \\mathbb{E}[f(\\theta)|D]`
      ],
      keyInsight: `The genius is that we only need RATIOS of probabilities. The unknown normalizer Z cancels in the ratio. We're "climbing" the probability landscape without knowing its total height.`
    },
    eli5: `Imagine you're blindfolded on a mountain. You can feel if a step goes up or down. Always walk uphill; sometimes walk downhill (to escape local bumps). Eventually you'll spend most time near the peak—mapping it without ever seeing the whole mountain.`
  },
  {
    id: 'componentwise',
    moduleId: 'gibbs',
    icon: Grid3X3,
    title: 'The Component-Wise Era',
    period: '1984 - 1990s',
    subtitle: 'Gibbs Sampling & Conditional Distributions',
    technicalContent: {
      problem: `In d dimensions, random proposals have probability ε^d of landing in high-probability regions. For d=100: 0.9^100 ≈ 0.00003. Most proposals rejected, chain moves slowly.`,
      solution: `Gibbs decomposes d-dimensional sampling into d one-dimensional problems by sampling each component from its conditional distribution. Each 1D conditional is often tractable, and acceptance rate is 100%.`,
      math: [
        `P(\\text{accept}) \\approx \\varepsilon^d`,
        `\\theta_1^{(t+1)} \\sim \\pi(\\theta_1 | \\theta_2^{(t)}, \\ldots, \\theta_d^{(t)}, D)`,
        `\\theta_1|\\theta_2 \\sim \\mathcal{N}\\left(\\mu_1 + \\rho\\frac{\\sigma_1}{\\sigma_2}(\\theta_2-\\mu_2), \\sigma_1^2(1-\\rho^2)\\right)`
      ],
      keyInsight: `By conditioning on all other variables, we reduce a d-dimensional integral to a 1-dimensional one. However, when variables are highly correlated (ρ → 1), the conditional variance σ²(1-ρ²) → 0—the chain mixes slowly.`
    },
    eli5: `Imagine an Etch-a-Sketch. You can only move horizontally OR vertically, never diagonally. To get anywhere, you alternate: go right, then up, then right, then up... It's slower than walking straight there, but each single-direction move is easy to control. Gibbs does the same: instead of figuring out where to go in 100 dimensions at once, it moves one dimension at a time while keeping others fixed.`
  },
  {
    id: 'geometric',
    moduleId: 'hmc',
    icon: Atom,
    title: 'The Geometric Era',
    period: '1987 - Present',
    subtitle: 'Hamiltonian Monte Carlo & Differential Geometry',
    technicalContent: {
      problem: `Local methods (M-H, Gibbs) require O(d²) steps to traverse distance d. With correlation ρ, Gibbs needs O(1/(1-ρ²)) steps. We need GLOBAL moves that follow the geometry.`,
      solution: `HMC treats sampling as physics. Define potential energy U(θ) = -log π̃(θ|D), introduce momentum, and simulate Hamilton's equations. The particle rolls along probability contours efficiently.`,
      math: [
        `H(q,p) = U(q) + K(p) = -\\log\\tilde{\\pi}(q|D) + \\frac{p^T M^{-1} p}{2}`,
        `\\frac{dq}{dt} = \\frac{\\partial H}{\\partial p} = M^{-1}p`,
        `\\frac{dp}{dt} = -\\frac{\\partial H}{\\partial q} = \\nabla\\log\\tilde{\\pi}(q|D)`,
        `\\alpha = \\min(1, e^{-H(q^\\prime,p^\\prime) + H(q,p)})`
      ],
      keyInsight: `HMC uses GRADIENT information to make intelligent moves. The particle follows the geometry of the probability surface, covering miles instead of inches per step. Tradeoff: requires differentiable models.`
    },
    eli5: `Imagine you're a skateboarder in a giant bowl (the probability landscape, flipped upside down). Instead of randomly walking around, you push off and let physics carry you. You naturally glide along the curved edges, covering huge distances efficiently. When you stop, you're likely in a low-energy spot (= high probability). HMC turns sampling into skateboarding—using the shape of the bowl to move smartly.`
  },
  {
    id: 'scalable',
    moduleId: 'variational',
    icon: Sparkles,
    title: 'The Scalable & Variational Era',
    period: '1999 - Present',
    subtitle: 'Variational Inference & Probabilistic Programming',
    technicalContent: {
      problem: `MCMC methods (M-H, Gibbs, HMC) are exact but slow. For Big Data with millions of observations, even HMC becomes impractical. We need methods that scale to massive datasets and can leverage GPU parallelism.`,
      solution: `Variational Inference (VI) transforms sampling into optimization. Instead of sampling from p(θ|D), we find a simpler distribution q(θ) that best approximates it by maximizing the Evidence Lower Bound (ELBO). Probabilistic Programming Languages (Stan, Pyro, NumPyro) automate this process.`,
      math: [
        `\\text{ELBO}(q) = \\mathbb{E}_{q(\\theta)}[\\log p(D|\\theta)] - \\text{KL}(q(\\theta) \\| p(\\theta))`,
        `q^*(\\theta) = \\arg\\max_q \\text{ELBO}(q)`,
        `\\text{KL}(q \\| p) = \\mathbb{E}_q\\left[\\log \\frac{q(\\theta)}{p(\\theta|D)}\\right] \\geq 0`,
        `\\log p(D) = \\text{ELBO}(q) + \\text{KL}(q \\| p) \\geq \\text{ELBO}(q)`
      ],
      keyInsight: `VI trades exactness for speed. Instead of wandering to find samples, we directly search for the best approximating distribution. Mean-field VI assumes independence between parameters—fast but may miss correlations. Modern VI (normalizing flows, amortized inference) can capture complex posteriors while remaining scalable.`
    },
    eli5: `Instead of wandering the mountain to map it (MCMC), you take a stretchy fabric and pull it tight to fit the terrain as closely as possible. The fabric isn't perfect—it misses some details—but you get the overall shape in seconds instead of hours. VI is "find the closest matching shape" instead of "walk every step."`
  }
];

const ModuleHome: React.FC<ModuleHomeProps> = ({ onNavigate }) => {
  const [expandedEra, setExpandedEra] = useState<string | null>(null);
  const { t } = useLanguage();

  const toggleEra = (eraId: string) => {
    setExpandedEra(expandedEra === eraId ? null : eraId);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="text-center py-8 border-b border-[#d4cdc4]">
        <h1 className="text-4xl font-bold text-[#1a1a1a] mb-3">
          History of Bayesian Computation
        </h1>
        <p className="text-lg text-[#6b6560] max-w-3xl mx-auto leading-relaxed">
          From closed-form solutions to geometric sampling: how we learned to compute the impossible.
          Click each era to explore the mathematics, then try the interactive demo.
        </p>
      </div>

      {/* Timeline */}
      <div className="flex-grow py-8 px-4">
        <div className="max-w-4xl mx-auto relative">
          {/* Vertical Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#d4cdc4]" />

          {/* Era Cards */}
          <div className="space-y-6">
            {eras.map((era, index) => {
              const Icon = era.icon;
              const isExpanded = expandedEra === era.id;
              
              return (
                <div key={era.id} className="relative pl-20">
                  {/* Timeline Node */}
                  <div 
                    className={`absolute left-4 w-8 h-8 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all ${
                      isExpanded 
                        ? 'bg-[#1a1a1a] border-[#1a1a1a] scale-110' 
                        : 'bg-white border-[#d4cdc4] hover:border-[#8b7355]'
                    }`}
                    onClick={() => toggleEra(era.id)}
                  >
                    <Icon size={14} className={isExpanded ? 'text-white' : 'text-[#6b6560]'} />
                  </div>

                  {/* Card */}
                  <div 
                    className={`bg-white rounded-xl border transition-all cursor-pointer ${
                      isExpanded 
                        ? 'border-[#1a1a1a] shadow-lg' 
                        : 'border-[#d4cdc4] hover:border-[#8b7355] shadow-sm'
                    }`}
                  >
                    {/* Card Header */}
                    <div 
                      className="p-5 flex items-center justify-between"
                      onClick={() => toggleEra(era.id)}
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-mono text-[#8b7355] bg-[#f5f0e8] px-2 py-0.5 rounded">
                            {era.period}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-[#1a1a1a]">{era.title}</h3>
                        <p className="text-sm text-[#6b6560]">{era.subtitle}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="text-[#6b6560]" size={24} />
                      ) : (
                        <ChevronDown className="text-[#6b6560]" size={24} />
                      )}
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-[#e8e4df] p-6 space-y-6 animate-in slide-in-from-top-2">
                        {/* The Problem */}
                        <div>
                          <h4 className="text-sm font-bold text-[#8b7355] uppercase tracking-wider mb-3">
                            The Problem
                          </h4>
                          <div className="bg-[#faf8f5] p-4 rounded-lg border border-[#e8e4df]">
                            <p className="text-[#4a4540] whitespace-pre-line text-sm leading-relaxed font-mono">
                              {era.technicalContent.problem}
                            </p>
                          </div>
                        </div>

                        {/* The Solution */}
                        <div>
                          <h4 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider mb-3">
                            The Solution
                          </h4>
                          <div className="bg-[#f5f0e8] p-4 rounded-lg border border-[#d4cdc4]">
                            <p className="text-[#4a4540] whitespace-pre-line text-sm leading-relaxed">
                              {era.technicalContent.solution}
                            </p>
                          </div>
                        </div>

                        {/* Key Equations */}
                        <div>
                          <h4 className="text-sm font-bold text-[#6b5640] uppercase tracking-wider mb-3">
                            Key Equations
                          </h4>
                          <div className="bg-[#1a1a1a] p-4 rounded-lg">
                            <div className="space-y-3">
                              {era.technicalContent.math.map((eq, i) => (
                                <div key={i} className="text-[#e8e4df]">
                                  <MathBlock tex={eq} display />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Key Insight */}
                        <div>
                          <h4 className="text-sm font-bold text-[#4a4540] uppercase tracking-wider mb-3">
                            Key Insight
                          </h4>
                          <p className="text-[#4a4540] leading-relaxed border-l-4 border-[#8b7355] pl-4 italic">
                            {era.technicalContent.keyInsight}
                          </p>
                        </div>

                        {/* In Simple Terms */}
                        <div className="bg-[#f0ebe4] p-4 rounded-lg border border-[#d4cdc4]">
                          <p className="text-[#4a4540] leading-relaxed">
                            <strong>{t('in_simple_terms')}:</strong> {era.eli5}
                          </p>
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => onNavigate(era.moduleId)}
                            className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] hover:bg-[#2c2c2c] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                          >
                            {t('try_demo')}
                            <ArrowRight size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleHome;
