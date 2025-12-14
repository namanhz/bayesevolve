# BayesEvolve: Technical Documentation & Improvement Roadmap

## Table of Contents
1. [Overview](#overview)
2. [Era 1: Analytical Era (Conjugate Priors)](#era-1-analytical-era)
3. [Era 2: Simulation Revolution (Metropolis-Hastings)](#era-2-simulation-revolution)
4. [Era 3: Component-Wise Era (Gibbs Sampling)](#era-3-component-wise-era)
5. [Era 4: Geometric Era (Hamiltonian Monte Carlo)](#era-4-geometric-era)
6. [Era 5: Scalable Era (Variational Inference)](#era-5-scalable-era)
7. [Cross-Cutting Improvements](#cross-cutting-improvements)

---

## Overview

BayesEvolve is an interactive educational platform teaching the historical evolution of Bayesian computation methods. Each "era" represents a breakthrough in computational statistics, visualized through interactive canvas-based simulations.

### Technical Stack
- **Framework**: React 18 with TypeScript
- **Rendering**: HTML5 Canvas API (2D context)
- **Styling**: Tailwind CSS
- **Math Rendering**: KaTeX
- **State Management**: React hooks + Context API
- **Internationalization**: Custom LanguageContext (EN/VI)

### Architecture Pattern
```
App.tsx
├── LanguageProvider (i18n context)
├── ProgressProvider (achievements/progress)
└── Layout.tsx
    ├── ModuleHome.tsx (timeline overview)
    ├── ModuleMetropolis.tsx (Era 2)
    ├── ModuleGibbs.tsx (Era 3)
    ├── ModuleHMC.tsx (Era 4)
    └── ModuleVariational.tsx (Era 5)
```

---

## Era 1: Analytical Era

### Current Implementation
**Status**: Timeline overview only (no dedicated interactive module)

The Analytical Era is presented in `ModuleHome.tsx` as an expandable card explaining conjugate priors. No interactive simulation exists.

### Mathematical Foundation
```
Posterior ∝ Likelihood × Prior

Beta-Binomial:    Beta(α,β) + Binom(n,k) → Beta(α+k, β+n-k)
Normal-Normal:    N(μ₀,σ₀²) + N(x̄,σ²/n) → N(μₙ,σₙ²)
Gamma-Poisson:    Γ(α,β) + Pois(Σk) → Γ(α+Σk, β+T)
```

### Suggested Interactive Module: `ModuleAnalytical.tsx`

#### Visualization Concept
Create a **Beta-Binomial Coin Flip Simulator**:

```
┌─────────────────────────────────────────────────────┐
│  Prior: Beta(α, β)           Posterior: Beta(α', β')│
│  ┌───────────────┐           ┌───────────────┐      │
│  │   [Prior PDF] │  ──────►  │ [Posterior]   │      │
│  │   α=2, β=2    │   Data    │  α'=α+k       │      │
│  └───────────────┘           │  β'=β+(n-k)   │      │
│                              └───────────────┘      │
│  ┌─────────────────────────────────────────────┐   │
│  │  🪙 🪙 🪙 🪙 🪙 🪙 🪙 🪙 🪙 🪙              │   │
│  │  Click to flip coins! Heads: 7, Tails: 3    │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Flip 1] [Flip 10] [Flip 100] [Reset]             │
└─────────────────────────────────────────────────────┘
```

#### Implementation Details
```typescript
interface AnalyticalState {
  priorAlpha: number;      // Prior Beta α parameter
  priorBeta: number;       // Prior Beta β parameter
  heads: number;           // Observed heads
  tails: number;           // Observed tails
  trueProbability: number; // Hidden true coin bias (0-1)
}

// Posterior is Beta(α + heads, β + tails)
// Mean = (α + heads) / (α + β + heads + tails)
```

#### Educational Value
- **Shows**: How prior beliefs update with data
- **Key Insight**: With enough data, prior becomes irrelevant (posterior converges to MLE)
- **Limitation Demo**: Try non-conjugate likelihood (e.g., mixture) → no closed form

#### Suggested Features
1. **Adjustable prior strength**: Slider for α, β from 0.1 to 100
2. **True probability reveal**: After n flips, show hidden true θ
3. **Credible interval visualization**: Show 95% CI shrinking with more data
4. **Comparison mode**: Show frequentist vs Bayesian estimates side-by-side
5. **"Break the conjugacy" button**: Switch to non-conjugate model, show why MCMC needed

---

## Era 2: Simulation Revolution (Metropolis-Hastings)

### Current Implementation
**File**: `components/ModuleMetropolis.tsx`

#### Technical Specifications
| Parameter | Value |
|-----------|-------|
| Canvas Size | 500 × 500 pixels |
| Scale | 50 pixels/unit |
| Target Distribution | Bimodal 2D (custom `targetMapPdf`) |
| Proposal Distribution | Symmetric Gaussian (σ = 0.8) |
| Visualization | "Fog of war" clearing as explored |

#### Algorithm Implementation
```typescript
// Proposal step
const proposalX = position.x + (Math.random() - 0.5) * 1.6;
const proposalY = position.y + (Math.random() - 0.5) * 1.6;

// Acceptance ratio (symmetric proposal, so q cancels)
const currentProb = targetMapPdf(position.x, position.y);
const proposalProb = targetMapPdf(proposal.x, proposal.y);
const acceptanceRatio = proposalProb / currentProb;

// Accept/Reject
if (Math.random() < acceptanceRatio) {
  // Accept: move to proposal
} else {
  // Reject: stay in place
}
```

#### Current Features
- Manual mode: Step-by-step propose → accept/reject
- Auto mode: Continuous sampling with speed control
- Fog of war: Reveals explored regions
- Accept rate counter
- Sample history trail

### Improvement Suggestions

#### 1. **Proposal Distribution Visualization**
**Problem**: Students don't see *where* proposals come from.

**Solution**: Draw proposal distribution as a translucent circle around current position.
```typescript
// Draw proposal region
ctx.beginPath();
ctx.arc(currentX, currentY, proposalSigma * SCALE, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // Light blue
ctx.fill();
ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
ctx.setLineDash([5, 5]);
ctx.stroke();
```

#### 2. **Acceptance Probability Meter**
**Problem**: Students don't understand *why* some proposals are rejected.

**Solution**: Add real-time display showing:
```
┌─────────────────────────────────────┐
│ Current π(θ):     0.0342           │
│ Proposal π(θ'):   0.0891           │
│ Ratio π(θ')/π(θ): 2.60 (>1 → ✓)   │
│ Random u:         0.45             │
│ Decision:         ACCEPT ✓         │
└─────────────────────────────────────┘
```

#### 3. **Adjustable Proposal Width**
**Problem**: Students don't understand tuning importance.

**Solution**: Add slider for proposal σ with live feedback:
- **σ too small**: High acceptance, slow exploration (show ESS)
- **σ too large**: Low acceptance, stuck in place
- **σ optimal**: ~23-44% acceptance rate (show Goldilocks zone)

```typescript
const [proposalSigma, setProposalSigma] = useState(0.8);

// Show acceptance rate color coding
const getAcceptanceColor = (rate: number) => {
  if (rate < 0.15) return 'text-red-500';      // Too large σ
  if (rate > 0.50) return 'text-yellow-500';   // Too small σ
  return 'text-green-500';                      // Optimal
};
```

#### 4. **Multiple Target Distributions**
**Problem**: Single distribution doesn't show generality.

**Solution**: Dropdown to select different targets:
- **Unimodal Gaussian**: Easy case
- **Bimodal**: Current default, shows mode-hopping challenge
- **Banana-shaped**: Shows correlation issues
- **Donut**: Shows multimodal ring

#### 5. **Burn-in Visualization**
**Problem**: Students don't understand burn-in concept.

**Solution**: 
- Color early samples differently (gray → brown gradient)
- Add "discard burn-in" button that removes first N samples
- Show histogram with/without burn-in

#### 6. **Effective Sample Size (ESS)**
**Problem**: Students think more samples = better, ignoring autocorrelation.

**Solution**: Display ESS alongside total samples:
```
Samples: 1000
ESS: 127 (autocorrelation = 0.87)
Efficiency: 12.7%
```

#### 7. **Real-World Connection: Bayesian Regression**
**Problem**: Abstract 2D landscape doesn't connect to real problems.

**Solution**: Add "Applied Mode" showing:
- Simple linear regression: y = β₀ + β₁x + ε
- 2D canvas shows posterior over (β₀, β₁)
- Data points shown alongside
- Students can add/remove data and watch posterior update

---

## Era 3: Component-Wise Era (Gibbs Sampling)

### Current Implementation
**File**: `components/ModuleGibbs.tsx`

#### Technical Specifications
| Parameter | Value |
|-----------|-------|
| Canvas Size | 500 × 500 pixels |
| Scale | 50 pixels/unit |
| Target Distribution | Bivariate Normal |
| Correlation (ρ) | Adjustable 0 to 0.99 |

#### Algorithm Implementation
```typescript
// Conditional distributions for bivariate normal with ρ:
// X | Y=y ~ N(ρy, 1-ρ²)
// Y | X=x ~ N(ρx, 1-ρ²)

const sd = Math.sqrt(1 - rho * rho);

if (turn === 'X') {
  const mean = rho * position.y;
  newPos.x = mean + z * sd;  // z ~ N(0,1)
} else {
  const mean = rho * position.x;
  newPos.y = mean + z * sd;
}
```

#### Current Features
- Alternating X|Y and Y|X sampling
- Adjustable correlation ρ
- Visual indicator of which variable is fixed/sampled
- Manual and auto modes
- Sample history trail

### Improvement Suggestions

#### 1. **Conditional Distribution Slice Visualization**
**Problem**: Students don't see *what* conditional distribution looks like.

**Solution**: When sampling X|Y, draw the 1D conditional as a curve:
```
┌────────────────────────────────────────┐
│              2D Contour                │
│     ┌─────────────────────────────┐    │
│     │     Current slice (Y=1.5)   │    │
│     │        ↓↓↓↓↓↓↓↓            │    │
│     │  ════════════════════       │    │
│     │        ★ (sample)           │    │
│     └─────────────────────────────┘    │
│                                        │
│  1D Conditional: p(X | Y=1.5)          │
│  ┌────────────────────────────────┐   │
│  │      ∩                         │   │
│  │     / \    ← Sample here       │   │
│  │    /   \                       │   │
│  └────────────────────────────────┘   │
└────────────────────────────────────────┘
```

#### 2. **Correlation Pathology Demo**
**Problem**: Students don't viscerally feel why high ρ is bad.

**Solution**: Add metrics panel showing:
```
ρ = 0.95
Conditional variance: σ²(1-ρ²) = 0.0975
Steps to traverse 1 unit: ~10.3
Mixing time: ~106 steps

⚠️ High correlation detected!
   Chain is "stuck" in narrow diagonal.
```

#### 3. **Side-by-Side Comparison**
**Problem**: Hard to compare Gibbs vs M-H on same problem.

**Solution**: Split-screen mode:
```
┌─────────────────┬─────────────────┐
│   Gibbs (left)  │    M-H (right)  │
│                 │                 │
│  Samples: 100   │  Samples: 100   │
│  ESS: 45        │  ESS: 23        │
│                 │                 │
└─────────────────┴─────────────────┘
```

#### 4. **Higher Dimensions Preview**
**Problem**: 2D doesn't show the curse of dimensionality.

**Solution**: Add "Dimension Simulator":
- Show how acceptance rate / ESS degrades with d
- Plot: ESS vs dimensions (2, 5, 10, 20, 50)
- Message: "In 100D, Gibbs takes 10,000× longer!"

#### 5. **Block Gibbs Extension**
**Problem**: Students don't learn about block updates.

**Solution**: Add toggle for "Block Gibbs":
- Sample (X,Y) jointly from 2D conditional
- Show improved mixing when variables correlated
- Compare: Full conditionals vs Block updates

#### 6. **Real-World Connection: Bayesian Linear Regression**
**Problem**: Bivariate normal is too abstract.

**Solution**: Show Gibbs for regression:
```
Model: y = Xβ + ε, ε ~ N(0, σ²)
       β ~ N(0, τ²I)
       σ² ~ InvGamma(a, b)

Gibbs updates:
1. β | σ², y ~ N(posterior mean, posterior cov)
2. σ² | β, y ~ InvGamma(a', b')
```
- Show regression line updating as sampler runs
- Data points visible on scatter plot

#### 7. **Rao-Blackwellization Demo**
**Problem**: Advanced concept not covered.

**Solution**: Show that using conditional means reduces variance:
- Plot: Sample histogram vs Rao-Blackwell estimate
- Message: "Using E[X|Y] instead of X samples gives 2× efficiency!"

---

## Era 4: Geometric Era (Hamiltonian Monte Carlo)

### Current Implementation
**File**: `components/ModuleHMC.tsx`

#### Technical Specifications
| Parameter | Value |
|-----------|-------|
| Canvas Size | 600 × 500 pixels |
| Scale | 40 pixels/unit |
| Target Distribution | "Donut" ring: U(q) = (‖q‖ - R)² |
| Integrator | Leapfrog (Störmer-Verlet) |
| Time step (dt) | 0.05 |
| Mass | 1.0 |

#### Algorithm Implementation
```typescript
// Leapfrog integrator for Hamiltonian dynamics
// H(q,p) = U(q) + K(p) = -log π(q) + p²/2m

// Half step momentum
const grad1 = donutGradient(q.x, q.y);
let px = p.x - (dt / 2) * grad1.dx;
let py = p.y - (dt / 2) * grad1.dy;

// Full step position
const qx = q.x + dt * (px / mass);
const qy = q.y + dt * (py / mass);

// Half step momentum
const grad2 = donutGradient(qx, qy);
px = px - (dt / 2) * grad2.dx;
py = py - (dt / 2) * grad2.dy;
```

#### Current Features
- Drag-to-flick momentum initialization
- Continuous trajectory visualization
- Sample collection after fixed time
- Momentum magnitude display

### Improvement Suggestions

#### 1. **Energy Conservation Visualization**
**Problem**: Students don't see why leapfrog is symplectic.

**Solution**: Add energy panel:
```
┌─────────────────────────────────────┐
│ Hamiltonian Conservation            │
│                                     │
│ H(q,p) = U(q) + K(p)               │
│                                     │
│ Initial H:  2.345                   │
│ Current H:  2.351                   │
│ ΔH:         0.006 (0.26%)          │
│                                     │
│ [Energy vs Time Plot]               │
│ ════════════════════                │
│ H should stay ~constant!            │
└─────────────────────────────────────┘
```

#### 2. **Step Size Instability Demo**
**Problem**: Students don't understand numerical stability.

**Solution**: Add dt slider with warnings:
- **dt = 0.01**: Stable but slow (show trajectory)
- **dt = 0.05**: Good balance (default)
- **dt = 0.2**: Unstable! (show energy exploding)
- **dt = 0.5**: Complete divergence (trajectory flies off)

```typescript
const getStabilityWarning = (dt: number) => {
  if (dt > 0.15) return '⚠️ Approaching instability!';
  if (dt > 0.25) return '🔥 UNSTABLE - Energy diverging!';
  return '✓ Stable';
};
```

#### 3. **Trajectory Length Tuning**
**Problem**: Fixed 3-second trajectory doesn't teach tuning.

**Solution**: Add L (number of leapfrog steps) slider:
- **L too small**: Doesn't explore far, like random walk
- **L too large**: U-turn, wasted computation
- **L optimal**: Reaches opposite side of distribution

Show "U-turn" detection:
```
Trajectory is turning back!
NUTS would stop here to save computation.
```

#### 4. **Phase Space Visualization**
**Problem**: Students only see position space.

**Solution**: Split view showing both:
```
┌─────────────────┬─────────────────┐
│  Position (q)   │  Momentum (p)   │
│                 │                 │
│    [Donut]      │   [Momentum]    │
│      ●→         │      ●          │
│                 │                 │
└─────────────────┴─────────────────┘
```

#### 5. **Gradient Visualization**
**Problem**: Students don't see how gradient guides motion.

**Solution**: Draw gradient arrows on the potential surface:
```typescript
// Draw gradient field
for (let x = -5; x <= 5; x += 1) {
  for (let y = -5; y <= 5; y += 1) {
    const grad = donutGradient(x, y);
    drawArrow(ctx, x, y, -grad.dx, -grad.dy); // Points downhill
  }
}
```

#### 6. **Comparison: HMC vs Random Walk**
**Problem**: Students don't appreciate HMC's efficiency.

**Solution**: Side-by-side race:
```
┌─────────────────┬─────────────────┐
│     HMC         │  Random Walk    │
│                 │                 │
│  ESS: 95        │  ESS: 12        │
│  Time: 1.2s     │  Time: 1.2s     │
│                 │                 │
│  "HMC is 8× more efficient!"      │
└─────────────────┴─────────────────┘
```

#### 7. **Different Potential Surfaces**
**Problem**: Only donut doesn't show generality.

**Solution**: Multiple targets:
- **Gaussian**: Simple bowl
- **Donut**: Current default
- **Banana**: Highly correlated (show HMC handles it)
- **Funnel**: Neal's funnel (show mass matrix importance)

#### 8. **Mass Matrix Adaptation**
**Problem**: Constant mass doesn't show importance of preconditioning.

**Solution**: Add "Adapt Mass" button:
- Start with M = I (identity)
- After warmup, estimate covariance
- Set M = Σ⁻¹
- Show improved sampling in correlated distributions

#### 9. **NUTS Preview**
**Problem**: Students don't learn about No-U-Turn Sampler.

**Solution**: Add "NUTS Mode" toggle:
- Automatically detect U-turns
- Show tree-building process
- Display: "NUTS chose L=23 steps (adaptive!)"

#### 10. **Real-World Connection: Funnel Distribution**
**Problem**: Abstract donut doesn't connect to real problems.

**Solution**: Show hierarchical model posterior:
```
θ ~ N(0, σ²)
σ ~ HalfCauchy(1)

This creates a "funnel" shape that's
notoriously hard for random walk MCMC
but HMC handles well with mass adaptation.
```

---

## Era 5: Scalable Era (Variational Inference)

### Current Implementation
**File**: `components/ModuleVariational.tsx`

#### Technical Specifications
| Parameter | Value |
|-----------|-------|
| Canvas Size | 500 × 200 pixels |
| True Posterior | Bimodal mixture of Gaussians |
| Variational Family | Single Gaussian q(θ) = N(μ, σ²) |
| Optimization | Gradient ascent on ELBO |
| Learning Rate | 0.1 (μ), 0.05 (σ) |

#### Algorithm Implementation
```typescript
// True posterior: mixture of two Gaussians
const truePosterior = (x: number) => {
  return 0.4 * gaussian(x, 2, 0.8) + 0.6 * gaussian(x, 5, 1.2);
};

// ELBO approximation (simplified)
const computeELBO = (mu: number, sigma: number) => {
  // Monte Carlo estimate of E_q[log p(x)] - KL(q || prior)
  // Simplified for visualization
};

// Gradient ascent
const gradMu = (elbo(mu + ε) - elbo(mu - ε)) / (2 * ε);
const gradSigma = (elbo(mu, sigma + ε) - elbo(mu, sigma - ε)) / (2 * ε);

mu += learningRate * gradMu;
sigma += learningRate * gradSigma;
```

#### Current Features
- Manual μ and σ sliders
- ELBO and KL divergence display
- Gradient ascent optimization
- Iteration counter
- Visual comparison of q(θ) vs p(θ|D)

### Improvement Suggestions

#### 1. **ELBO Decomposition Visualization**
**Problem**: Students don't understand what ELBO measures.

**Solution**: Break down ELBO components:
```
┌─────────────────────────────────────────┐
│ ELBO = E_q[log p(D|θ)] - KL(q || p(θ)) │
│                                         │
│ Likelihood term:  +2.34                 │
│ KL penalty:       -0.89                 │
│ ─────────────────────────               │
│ ELBO:             +1.45                 │
│                                         │
│ [Stacked bar chart showing terms]       │
└─────────────────────────────────────────┘
```

#### 2. **KL Divergence Asymmetry Demo**
**Problem**: Students don't understand KL(q||p) vs KL(p||q).

**Solution**: Toggle between forward/reverse KL:
- **KL(q||p)**: Mode-seeking (VI default) - q avoids low p regions
- **KL(p||q)**: Mean-seeking - q covers all of p

Show visually:
```
KL(q||p): q focuses on ONE mode
KL(p||q): q tries to cover BOTH modes (too wide)
```

#### 3. **Variational Family Comparison**
**Problem**: Only single Gaussian shown.

**Solution**: Multiple variational families:
- **Single Gaussian**: Current (shows limitation)
- **Mixture of Gaussians**: Better multimodal fit
- **Normalizing Flow**: Even better (animated transformation)

```typescript
type VariationalFamily = 
  | 'gaussian' 
  | 'mixture_2' 
  | 'mixture_5' 
  | 'normalizing_flow';
```

#### 4. **Mean-Field vs Full Covariance**
**Problem**: Students don't see independence assumption cost.

**Solution**: 2D example with correlated posterior:
```
True posterior: Bivariate Normal with ρ = 0.9

Mean-field VI: q(x,y) = q(x)q(y) 
  → Misses correlation entirely!

Full-rank VI: q(x,y) = N(μ, Σ)
  → Captures correlation
```

#### 5. **Stochastic VI (SVI) Demo**
**Problem**: Batch gradient doesn't show scalability advantage.

**Solution**: Add "Mini-batch Mode":
- Show full dataset (1000 points)
- SVI uses random subset (32 points per step)
- Compare: Batch (slow, stable) vs SVI (fast, noisy)

```
┌─────────────────────────────────────┐
│ Batch VI         │  Stochastic VI  │
│ 1000 pts/step    │  32 pts/step    │
│ Time: 10s        │  Time: 0.5s     │
│ ELBO: smooth     │  ELBO: noisy    │
│                  │  but converges! │
└─────────────────────────────────────┘
```

#### 6. **Reparameterization Trick Visualization**
**Problem**: Key trick not explained visually.

**Solution**: Show the transformation:
```
Instead of: θ ~ q(θ)
We write:   θ = μ + σ·ε, where ε ~ N(0,1)

This makes gradient ∇_μ,σ computable!

[Animation showing ε samples transforming to θ samples]
```

#### 7. **Amortized Inference Preview**
**Problem**: Per-datapoint VI not shown.

**Solution**: Add "Encoder Network" mode:
- Show neural network mapping x → (μ(x), σ(x))
- This is the foundation of VAEs!
- Visualization: Input image → latent distribution

#### 8. **ELBO Landscape Visualization**
**Problem**: Optimization landscape not visible.

**Solution**: 2D heatmap of ELBO(μ, σ):
```
      σ
      ↑
      │  ░░░▓▓██████▓▓░░░
      │  ░░▓▓████████▓▓░░
      │  ░▓▓██████████▓▓░
      │  ▓▓████ ★ █████▓▓  ← Current (μ,σ)
      │  ▓▓██████████████▓
      │  ░▓▓████████████░
      └────────────────────→ μ
      
      Gradient ascent path: ○→○→○→★
```

#### 9. **VI vs MCMC Comparison**
**Problem**: No direct comparison with MCMC.

**Solution**: Split-screen race:
```
┌─────────────────┬─────────────────┐
│       VI        │      MCMC       │
│                 │                 │
│  Time: 0.1s     │  Time: 10s      │
│  KL: 0.15       │  KL: 0.02       │
│                 │                 │
│  Fast but       │  Slow but       │
│  approximate    │  exact          │
└─────────────────┴─────────────────┘

Trade-off: Speed vs Accuracy
```

#### 10. **Real-World Connection: Topic Modeling (LDA)**
**Problem**: Abstract 1D example doesn't show real use.

**Solution**: Mini topic model demo:
- 5 documents, 3 topics
- Show variational updates for topic proportions
- Visualize: Document → Topic distribution → Words

---

## Cross-Cutting Improvements

### 1. **Unified Progress System**
```typescript
interface LearningProgress {
  completedExercises: string[];
  achievements: Achievement[];
  quizScores: Record<string, number>;
  timeSpent: Record<string, number>;
}
```

### 2. **Interactive Quizzes After Each Era**
```
Quiz: Metropolis-Hastings
━━━━━━━━━━━━━━━━━━━━━━━━━

Q1: Why can we use unnormalized densities?
○ A) We only need ratios
○ B) The normalizer is always 1
○ C) It doesn't matter
○ D) We estimate Z with samples

[Submit] [Hint]
```

### 3. **Code Export Feature**
```python
# Generated Python code for your simulation
import numpy as np

def metropolis_hastings(target_pdf, n_samples=1000, proposal_std=0.8):
    samples = []
    current = np.array([0.0, 0.0])
    
    for _ in range(n_samples):
        proposal = current + np.random.normal(0, proposal_std, 2)
        
        acceptance_ratio = target_pdf(proposal) / target_pdf(current)
        
        if np.random.random() < acceptance_ratio:
            current = proposal
        
        samples.append(current.copy())
    
    return np.array(samples)
```

### 4. **Difficulty Levels**
- **Beginner**: Simplified explanations, guided mode only
- **Intermediate**: Full manual/auto modes, basic math
- **Advanced**: All features, full math, edge cases

### 5. **Accessibility Improvements**
- Color-blind friendly palettes
- Screen reader support
- Keyboard navigation
- Reduced motion mode

### 6. **Mobile Responsiveness**
- Touch-friendly controls
- Responsive canvas sizing
- Swipe between eras

### 7. **Shareable State URLs**
```
https://bayesevolve.app/metropolis?sigma=0.5&samples=1000
```

### 8. **Real Dataset Integration**
Connect to real datasets:
- Iris (classification posterior)
- Boston Housing (regression)
- MNIST digits (high-dimensional)

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Era 1 Module | High | Medium | P1 |
| Proposal visualization (Era 2) | High | Low | P1 |
| Conditional slice (Era 3) | High | Low | P1 |
| Energy conservation (Era 4) | High | Low | P1 |
| ELBO decomposition (Era 5) | High | Low | P1 |
| Step size instability (Era 4) | Medium | Low | P2 |
| KL asymmetry (Era 5) | Medium | Medium | P2 |
| Side-by-side comparisons | High | Medium | P2 |
| Real-world examples | High | High | P3 |
| Code export | Medium | Medium | P3 |
| Quizzes | Medium | High | P3 |

---

## Conclusion

BayesEvolve provides a strong foundation for teaching Bayesian computation. The suggested improvements focus on:

1. **Visualizing hidden mechanics** (proposals, conditionals, gradients)
2. **Showing failure modes** (high correlation, numerical instability)
3. **Connecting to real problems** (regression, topic models)
4. **Enabling comparisons** (MCMC vs VI, Gibbs vs M-H)
5. **Supporting different learning levels** (beginner → advanced)

Implementing the P1 priorities would significantly enhance student comprehension with relatively low development effort.

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Author: BayesEvolve Development Team*
