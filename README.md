# BayesEvolve

**An Interactive Journey Through the History of Bayesian Computation**

> *Inspired by Prof Kerrie Mengersen's Bayesian lectures in Hanoi (2025), developed by Nam Anh Le*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-bayesevolve.org-blue)](https://bayesevolve.org)
[![React](https://img.shields.io/badge/React-19.2-61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff)](https://vitejs.dev)

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Architecture](#architecture)
4. [Era 1: Analytical Era (Conjugate Priors)](#era-1-analytical-era)
5. [Era 2: Simulation Revolution (Metropolis-Hastings)](#era-2-simulation-revolution)
6. [Era 3: Component-Wise Era (Gibbs Sampling)](#era-3-component-wise-era)
7. [Era 4: Geometric Era (Hamiltonian Monte Carlo)](#era-4-geometric-era)
8. [Era 5: Scalable Era (Variational Inference)](#era-5-scalable-era)
9. [Mathematical Utilities](#mathematical-utilities)
10. [Internationalization](#internationalization)
11. [Deployment](#deployment)

---

## Overview

BayesEvolve is an interactive educational web application that teaches the historical evolution of Bayesian computation methods through hands-on visualizations. Each "era" represents a major breakthrough in computational statistics, from closed-form conjugate priors to modern variational inference.

### Key Features

- **5 Interactive Modules**: Each era has a dedicated canvas-based simulation
- **Real-time Visualization**: Watch algorithms run step-by-step or in continuous mode
- **Bilingual Support**: English and Vietnamese translations
- **Mathematical Rigor**: KaTeX-rendered equations alongside intuitive explanations
- **Responsive Design**: Works on desktop and tablet devices

### Technical Stack

| Component | Technology |
|-----------|------------|
| Framework | React 19.2 with TypeScript |
| Build Tool | Vite 6.2 |
| Rendering | HTML5 Canvas API (2D context) |
| Styling | Tailwind CSS |
| Math Rendering | KaTeX |
| Charts | Recharts |
| Icons | Lucide React |
| State Management | React Hooks + Context API |

---

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/namanhz/bayesevolve.git
cd bayesevolve

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173`

---

## Architecture

```
bayesevolve/
├── components/
│   ├── Layout.tsx              # Main layout with sidebar navigation
│   ├── ModuleHome.tsx          # Timeline overview page
│   ├── ModuleAnalytical.tsx    # Era 1: Conjugate priors
│   ├── ModuleMetropolis.tsx    # Era 2: Metropolis-Hastings
│   ├── ModuleGibbs.tsx         # Era 3: Gibbs Sampling
│   ├── ModuleHMC.tsx           # Era 4: Hamiltonian Monte Carlo
│   ├── ModuleVariational.tsx   # Era 5: Variational Inference
│   └── Math.tsx                # KaTeX wrapper component
├── contexts/
│   ├── LanguageContext.tsx     # i18n translations (EN/VI)
│   └── ProgressContext.tsx     # User progress tracking
├── services/
│   └── mathUtils.ts            # Mathematical utility functions
├── types/
│   └── index.ts                # TypeScript type definitions
├── App.tsx                     # Root component
└── main.tsx                    # Entry point
```

---

## Era 1: Analytical Era

**File**: `components/ModuleAnalytical.tsx`

### Concept

The Analytical Era (1763-1950s) represents the period when Bayesian inference was limited to **conjugate prior** families—special likelihood-prior combinations where the posterior has a known closed-form solution.

### Three Conjugate Models Implemented

#### 1. Beta-Binomial (Coin Flipping)

**Prior**: θ ~ Beta(α, β)  
**Likelihood**: k | θ ~ Binomial(n, θ)  
**Posterior**: θ | k ~ Beta(α + k, β + n - k)

```typescript
// Posterior parameters after observing heads/tails
const alphaPost = alphaPrior + heads;
const betaPost = betaPrior + tails;

// Beta PDF calculation
const betaPdf = (x, alpha, beta) => {
  const logBetaFunc = logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta);
  const logPdf = (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logBetaFunc;
  return Math.exp(logPdf);
};
```

#### 2. Normal-Normal (Sensor Calibration)

**Prior**: μ ~ N(μ₀, σ₀²)  
**Likelihood**: x | μ ~ N(μ, σ²)  
**Posterior**: μ | D ~ N(μₙ, σₙ²)

```typescript
// Precision-weighted posterior
const priorPrecision = 1 / (priorStd ** 2);
const dataPrecision = n / (likelihoodSigma ** 2);
const posteriorPrecision = priorPrecision + dataPrecision;
const posteriorVariance = 1 / posteriorPrecision;
const posteriorMean = posteriorVariance * (
  priorPrecision * priorMean + dataPrecision * dataMean
);
```

**Key Equation**:
$$\mu_n = \frac{\frac{\mu_0}{\sigma_0^2} + \frac{n\bar{x}}{\sigma^2}}{\frac{1}{\sigma_0^2} + \frac{n}{\sigma^2}}$$

#### 3. Gamma-Poisson (Bus Arrival Rates)

**Prior**: λ ~ Gamma(α, β)  
**Likelihood**: k | λ ~ Poisson(λ)  
**Posterior**: λ | D ~ Gamma(α + Σk, β + T)

```typescript
// Posterior parameters
const postAlpha = gammaAlpha + sumK;  // Add observed counts
const postBeta = gammaBeta + n;        // Add observation periods

// Gamma PDF
const gammaPdf = (x, alpha, beta) => {
  const logNumer = alpha * Math.log(beta) + (alpha - 1) * Math.log(x) - beta * x;
  const logDenom = logGamma(alpha);
  return Math.exp(logNumer - logDenom);
};
```

### Visualization

- **Recharts AreaChart** displays prior and posterior distributions side-by-side
- Interactive data generation (coin flips, sensor readings, bus counts)
- Real-time posterior updating as data accumulates

---

## Era 2: Simulation Revolution

**File**: `components/ModuleMetropolis.tsx`

### Concept

The Metropolis-Hastings algorithm (1953) revolutionized Bayesian computation by enabling sampling from **any** posterior distribution, not just conjugate ones. The key insight: we only need the **unnormalized** posterior.

### Algorithm Implementation

```typescript
// Target: Bimodal mixture of 2D Gaussians
const targetMapPdf = (x: number, y: number): number => {
  const p1 = bivariateNormalPdf(x, y, 3, 3, 1.5, 1.5, 0);  // Peak 1
  const p2 = bivariateNormalPdf(x, y, 7, 7, 1.0, 1.0, 0);  // Peak 2
  return p1 + 0.5 * p2;
};

// Metropolis-Hastings step
const step = () => {
  const currentPdf = targetMapPdf(position.x, position.y);
  
  // Symmetric random walk proposal
  const propX = position.x + (Math.random() - 0.5) * 2 * proposalSigma;
  const propY = position.y + (Math.random() - 0.5) * 2 * proposalSigma;
  
  // Bounds check
  if (propX < 0 || propX > 10 || propY < 0 || propY > 10) return;
  
  const propPdf = targetMapPdf(propX, propY);
  
  // Acceptance ratio (symmetric proposal, so q(x'|x)/q(x|x') = 1)
  const acceptanceRatio = propPdf / currentPdf;
  
  // Accept with probability min(1, α)
  if (Math.random() < acceptanceRatio) {
    setPosition({ x: propX, y: propY });  // Accept
    setAcceptedCount(c => c + 1);
  }
  // else: Reject, stay in place
};
```

### Key Equations

**Acceptance Probability**:
$$\alpha = \min\left(1, \frac{\tilde{\pi}(\theta')}{\tilde{\pi}(\theta)} \cdot \frac{q(\theta|\theta')}{q(\theta'|\theta)}\right)$$

For symmetric proposals (random walk), this simplifies to:
$$\alpha = \min\left(1, \frac{\tilde{\pi}(\theta')}{\tilde{\pi}(\theta)}\right)$$

### Features

| Feature | Description |
|---------|-------------|
| **Fog of War** | Canvas overlay that clears as regions are explored |
| **Proposal Visualization** | Dashed circle shows proposal distribution |
| **Acceptance Rate** | Real-time tracking with color-coded quality indicator |
| **Adjustable σ** | Proposal width slider (0.1 to 2.0) |
| **Speed Control** | 1x, 5x, 50x simulation speeds |
| **Manual Mode** | Step-by-step propose → accept/reject |

### Canvas Specifications

```typescript
const WIDTH = 700;
const HEIGHT = 700;
const SCALE = 70;  // pixels per unit
```

---

## Era 3: Component-Wise Era

**File**: `components/ModuleGibbs.tsx`

### Concept

Gibbs Sampling (1984) solves the **curse of dimensionality** by decomposing a d-dimensional sampling problem into d one-dimensional problems. Instead of proposing moves in all dimensions simultaneously, we sample each dimension from its **conditional distribution** while holding others fixed.

### Algorithm Implementation

**Target**: Bivariate Normal with correlation ρ

For a bivariate normal with zero means and unit variances:
- X | Y = y ~ N(ρy, 1 - ρ²)
- Y | X = x ~ N(ρx, 1 - ρ²)

```typescript
const step = () => {
  const sd = Math.sqrt(1 - rho * rho);  // Conditional standard deviation
  
  // Box-Muller transform for standard normal
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  
  if (turn === 'X') {
    // Sample X given Y
    const condMean = rho * position.y;
    newPos.x = condMean + z * sd;
    setTurn('Y');
  } else {
    // Sample Y given X
    const condMean = rho * position.x;
    newPos.y = condMean + z * sd;
    setTurn('X');
  }
};
```

### Key Equations

**Conditional Distribution for Bivariate Normal**:
$$\theta_1 | \theta_2 \sim \mathcal{N}\left(\mu_1 + \rho\frac{\sigma_1}{\sigma_2}(\theta_2 - \mu_2), \sigma_1^2(1-\rho^2)\right)$$

**Conditional Variance**:
$$\text{Var}(\theta_1 | \theta_2) = \sigma_1^2(1 - \rho^2)$$

As ρ → 1, conditional variance → 0, causing **slow mixing**.

### Conditional Slice Visualization

A dedicated canvas shows the 1D conditional distribution that moves as the sampler runs:

```typescript
const drawConditionalSlice = () => {
  // Fixed x-range from -4 to 4
  const xMin = -4, xMax = 4;
  
  // Conditional parameters
  const condMean = turn === 'X' ? rho * position.y : rho * position.x;
  const condStd = Math.sqrt(1 - rho * rho);
  
  // Draw Gaussian curve
  for (let i = 0; i <= SLICE_WIDTH; i++) {
    const x = xMin + (i / SLICE_WIDTH) * (xMax - xMin);
    const pdf = (1 / (condStd * Math.sqrt(2 * Math.PI))) * 
                Math.exp(-0.5 * Math.pow((x - condMean) / condStd, 2));
    // ... draw to canvas
  }
};
```

### Mixing Diagnostics

```typescript
const conditionalVariance = 1 - rho * rho;
const mixingTime = rho > 0.99 ? Infinity : Math.ceil(1 / (1 - rho * rho));
const correlationWarning = rho > 0.9;
```

### Canvas Specifications

```typescript
const WIDTH = 450;
const HEIGHT = 450;
const SCALE = 45;
const SLICE_WIDTH = 400;
const SLICE_HEIGHT = 100;
```

---

## Era 4: Geometric Era

**File**: `components/ModuleHMC.tsx`

### Concept

Hamiltonian Monte Carlo (1987) treats sampling as a **physics simulation**. By introducing momentum variables and simulating Hamiltonian dynamics, HMC can make large, coherent moves that follow the geometry of the posterior—dramatically improving efficiency over random walks.

### Physics Setup

**Hamiltonian**:
$$H(q, p) = U(q) + K(p) = -\log\tilde{\pi}(q) + \frac{p^T M^{-1} p}{2}$$

**Potential Energy** (Donut/Ring distribution):
```typescript
const potentialEnergy = (x: number, y: number) => {
  const R = 5;  // Target radius
  const r = Math.sqrt(x * x + y * y);
  return Math.pow(r - R, 2);  // (|q| - R)²
};
```

**Kinetic Energy**:
```typescript
const kineticEnergy = (px: number, py: number, m: number) => {
  return (px * px + py * py) / (2 * m);
};
```

### Leapfrog Integrator

The Leapfrog (Störmer-Verlet) integrator is **symplectic**, preserving the Hamiltonian structure and ensuring time-reversibility.

```typescript
const stepPhysics = () => {
  let { q, p, path } = particle;
  
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
  
  return { q: {x: qx, y: qy}, p: {x: px, y: py} };
};
```

### Gradient Computation

```typescript
const donutGradient = (x: number, y: number): {dx: number, dy: number} => {
  const r = Math.sqrt(x * x + y * y);
  const targetR = 5;
  if (r === 0) return { dx: 0, dy: 0 };
  
  // ∂U/∂x = ∂U/∂r · ∂r/∂x = (r - R) · (x/r)
  const dUdr = r - targetR;
  return {
    dx: dUdr * (x / r),
    dy: dUdr * (y / r)
  };
};
```

### Key Equations

**Hamilton's Equations**:
$$\frac{dq}{dt} = \frac{\partial H}{\partial p} = M^{-1}p$$
$$\frac{dp}{dt} = -\frac{\partial H}{\partial q} = \nabla\log\tilde{\pi}(q)$$

**Energy Conservation Check**:
```typescript
const energyDrift = initialEnergy !== null ? Math.abs(currentH - initialEnergy) : 0;
const energyDriftPercent = (energyDrift / initialEnergy) * 100;
const isUnstable = energyDriftPercent > 40;  // Threshold for divergence warning
```

### Features

| Feature | Description |
|---------|-------------|
| **Drag-to-Flick** | Set initial momentum by dragging on canvas |
| **Gentle Launch** | One-click tangential momentum for stable orbits |
| **Energy Plot** | Real-time H(q,p) conservation visualization |
| **Gradient Field** | Arrow overlay showing -∇U direction |
| **Adjustable dt** | Step size slider with stability warnings |
| **Sample Collection** | Automatic sampling after trajectory completion |

### Canvas Specifications

```typescript
const WIDTH = 700;
const HEIGHT = 600;
const SCALE = 50;
const ENERGY_WIDTH = 250;
const ENERGY_HEIGHT = 80;
const dt = 0.015;  // Default step size (very conservative for stability)
const mass = 1.0;
```

---

## Era 5: Scalable Era

**File**: `components/ModuleVariational.tsx`

### Concept

Variational Inference (1999-present) transforms the sampling problem into an **optimization problem**. Instead of drawing samples from the posterior, we find a simple distribution q(θ) that best approximates it by maximizing the Evidence Lower Bound (ELBO).

### Problem Setup

**True Posterior**: Bimodal mixture of Gaussians (intentionally complex)
```typescript
const truePosterior = (x: number): number => {
  const g1 = Math.exp(-0.5 * Math.pow((x - 2) / 0.8, 2)) / (0.8 * Math.sqrt(2 * Math.PI));
  const g2 = Math.exp(-0.5 * Math.pow((x - 5) / 1.2, 2)) / (1.2 * Math.sqrt(2 * Math.PI));
  return 0.4 * g1 + 0.6 * g2;  // 40% weight on mode 1, 60% on mode 2
};
```

**Variational Family**: Single Gaussian q(θ) = N(μ, σ²)
```typescript
const variationalQ = (x: number, mu: number, sigma: number): number => {
  return Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
};
```

### ELBO Computation

```typescript
const computeELBODecomposition = (mu: number, sigma: number) => {
  // ELBO = E_q[log p(x)] + H(q)
  
  // Monte Carlo estimate of E_q[log p(x)]
  let likelihoodTerm = 0;
  const dx = 0.1;
  for (let x = -2; x <= 10; x += dx) {
    const q = variationalQ(x, mu, sigma);
    const p = truePosterior(x);
    if (q > 1e-10 && p > 1e-10) {
      likelihoodTerm += q * Math.log(p) * dx;
    }
  }
  
  // Entropy of Gaussian: H(q) = 0.5 * ln(2πeσ²)
  const entropyTerm = 0.5 * (1 + Math.log(2 * Math.PI) + 2 * Math.log(sigma));
  
  return {
    elbo: likelihoodTerm + entropyTerm,
    likelihoodTerm,
    entropyTerm
  };
};
```

### KL Divergence

```typescript
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
```

### Gradient Ascent Optimization

```typescript
const optimizationStep = () => {
  const learningRate = 0.05;
  const eps = 0.01;
  
  // Numerical gradient for μ
  const grad_mu = (computeELBO(mu + eps, sigma) - computeELBO(mu - eps, sigma)) / (2 * eps);
  
  // Numerical gradient for σ
  const grad_sigma = (computeELBO(mu, sigma + eps) - computeELBO(mu, sigma - eps)) / (2 * eps);
  
  // Gradient ascent update
  const newMu = mu + learningRate * grad_mu;
  const newSigma = Math.max(0.3, sigma + learningRate * grad_sigma);
  
  // Check convergence
  if (Math.abs(grad_mu) < 0.01 && Math.abs(grad_sigma) < 0.01) {
    setIsOptimizing(false);
  }
};
```

### Key Equations

**Evidence Lower Bound**:
$$\text{ELBO}(q) = \mathbb{E}_{q(\theta)}[\log p(D|\theta)] - \text{KL}(q(\theta) \| p(\theta))$$

**Fundamental Identity**:
$$\log p(D) = \text{ELBO}(q) + \text{KL}(q \| p) \geq \text{ELBO}(q)$$

**KL Divergence**:
$$\text{KL}(q \| p) = \mathbb{E}_q\left[\log \frac{q(\theta)}{p(\theta|D)}\right]$$

### Features

| Feature | Description |
|---------|-------------|
| **Manual Sliders** | Adjust μ and σ manually to fit distribution |
| **Auto Optimization** | Gradient ascent with visual path trail |
| **ELBO Decomposition** | Bar chart showing likelihood vs entropy terms |
| **KL Display** | Real-time KL divergence from true posterior |
| **Optimization Path** | Green trail showing gradient ascent trajectory |

### Canvas Specifications

```typescript
const WIDTH = 700;
const HEIGHT = 400;
const ELBO_BAR_WIDTH = 200;
const ELBO_BAR_HEIGHT = 100;
```

---

## Mathematical Utilities

**File**: `services/mathUtils.ts`

### Log-Gamma Function (Lanczos Approximation)

```typescript
function logGamma(z: number): number {
  const p = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
             -176.61502916214059, 12.507343278686905, -0.13857109526572012,
             9.9843695780195716e-6, 1.5056327351493116e-7];
  
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    x += p[i] / (z + i + 1);
  }
  const t = z + p.length - 0.5;
  return Math.log(2 * Math.PI) / 2 + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
```

### Probability Density Functions

| Function | Formula |
|----------|---------|
| `betaPdf(x, α, β)` | $\frac{x^{\alpha-1}(1-x)^{\beta-1}}{B(\alpha,\beta)}$ |
| `normalPdf(x, μ, σ)` | $\frac{1}{\sigma\sqrt{2\pi}}e^{-\frac{(x-\mu)^2}{2\sigma^2}}$ |
| `gammaPdf(x, α, β)` | $\frac{\beta^\alpha}{\Gamma(\alpha)}x^{\alpha-1}e^{-\beta x}$ |
| `bivariateNormalPdf(x, y, ...)` | Full 2D Gaussian with correlation |

---

## Internationalization

**File**: `contexts/LanguageContext.tsx`

The app supports **English** and **Vietnamese** with a toggle button in the sidebar.

```typescript
const translations: Record<Language, Record<string, string>> = {
  en: {
    'app.title': 'BayesEvolve',
    'mh.title': 'The Simulation Revolution: Metropolis-Hastings',
    // ... 100+ translation keys
  },
  vi: {
    'app.title': 'BayesEvolve',
    'mh.title': 'Cuộc cách mạng Mô phỏng: Metropolis-Hastings',
    // ...
  }
};
```

---

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`

### Custom Domain

To use a custom domain like `bayesevolve.org`:

1. Add domain in Vercel project settings
2. Set nameservers at your registrar:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

---

## License

MIT License

---

## Acknowledgments

### Inspiration & Teaching

- **Prof Kerrie Mengersen** (Queensland University of Technology) — This project was inspired by her Bayesian computation lectures delivered in Hanoi (2025). Her pedagogical approach to explaining MCMC methods and their historical evolution forms the conceptual backbone of this application.

### Mathematical Foundations & Algorithm References

The algorithms and equations implemented in this application are based on the following foundational works:

- **Bayesian Inference** — Bayes, T. (1763). *An Essay towards solving a Problem in the Doctrine of Chances*. Philosophical Transactions of the Royal Society. Formalized and extended by Laplace, P.S. (1774).

- **Conjugate Prior Theory** — Raiffa, H. & Schlaifer, R. (1961). *Applied Statistical Decision Theory*. Harvard Business School. Systematized the theory of conjugate prior families (Beta-Binomial, Normal-Normal, Gamma-Poisson).

- **Metropolis-Hastings Algorithm** — Metropolis, N., Rosenbluth, A.W., Rosenbluth, M.N., Teller, A.H., & Teller, E. (1953). *Equation of State Calculations by Fast Computing Machines*. The Journal of Chemical Physics, 21(6), 1087-1092. Extended by Hastings, W.K. (1970).

- **Gibbs Sampling** — Geman, S., & Geman, D. (1984). *Stochastic Relaxation, Gibbs Distributions, and the Bayesian Restoration of Images*. IEEE Transactions on Pattern Analysis and Machine Intelligence, 6(6), 721-741.

- **Box-Muller Transform** — Box, G.E.P. & Muller, M.E. (1958). *A Note on the Generation of Random Normal Deviates*. The Annals of Mathematical Statistics, 29(2), 610-611. Used for Gaussian sampling in the Gibbs module.

- **Hamiltonian Monte Carlo** — Neal, R.M. (2011). *MCMC Using Hamiltonian Dynamics*. Handbook of Markov Chain Monte Carlo, Chapter 5. The Leapfrog integrator implementation follows the Störmer-Verlet scheme as described in this work.

- **KL Divergence** — Kullback, S. & Leibler, R.A. (1951). *On Information and Sufficiency*. The Annals of Mathematical Statistics, 22(1), 79-86.

- **Variational Inference & ELBO** — Blei, D.M., Kucukelbir, A., & McAuliffe, J.D. (2017). *Variational Inference: A Review for Statisticians*. Journal of the American Statistical Association, 112(518), 859-877.

- **Stan Development Team** — For their excellent documentation on HMC tuning, mass matrix adaptation, and numerical stability considerations.

### Development

The mathematical logic and algorithms (MCMC, Gibbs, HMC, Variational Inference) were synthesized from Prof. Kerrie Mengersen's lectures, the references above, and independent research. The web interface and interactive visualizations were implemented with the assistance of AI coding tools (Windsurf/Cascade).

---

*Developed by Nam Anh Le*  
*Last Updated: December 2025*
