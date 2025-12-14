// Log Gamma approximation (Lanczos) for calculating Beta function
function logGamma(z: number): number {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7
  ];

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

// Beta Probability Density Function
export const betaPdf = (x: number, alpha: number, beta: number): number => {
  if (x < 0 || x > 1) return 0;
  // Beta(alpha, beta) = Gamma(alpha+beta) / (Gamma(alpha)*Gamma(beta))
  const logBetaFunc = logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta);
  const logPdf = (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logBetaFunc;
  return Math.exp(logPdf);
};

// Normal Probability Density Function
export const normalPdf = (x: number, mean: number, std: number): number => {
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
};

// Gamma Probability Density Function (Shape k/alpha, Scale theta/1/beta)
// Using Alpha/Beta parameterization where Mean = alpha/beta
export const gammaPdf = (x: number, alpha: number, beta: number): number => {
  if (x <= 0) return 0;
  // f(x) = (beta^alpha / Gamma(alpha)) * x^(alpha-1) * e^(-beta*x)
  const logNumer = alpha * Math.log(beta) + (alpha - 1) * Math.log(x) - beta * x;
  const logDenom = logGamma(alpha);
  return Math.exp(logNumer - logDenom);
};

// Bivariate Normal PDF (simplified for visualization)
export const bivariateNormalPdf = (x: number, y: number, ux: number, uy: number, sx: number, sy: number, rho: number): number => {
  const z = (Math.pow(x - ux, 2) / sx ** 2) - 
            (2 * rho * (x - ux) * (y - uy) / (sx * sy)) + 
            (Math.pow(y - uy, 2) / sy ** 2);
  const normFactor = 1 / (2 * Math.PI * sx * sy * Math.sqrt(1 - rho ** 2));
  return normFactor * Math.exp(-z / (2 * (1 - rho ** 2)));
};

// Target distribution for Metropolis (Mixture of Gaussians to create "Hills")
export const targetMapPdf = (x: number, y: number): number => {
  // Peak 1
  const p1 = bivariateNormalPdf(x, y, 3, 3, 1.5, 1.5, 0);
  // Peak 2 (smaller)
  const p2 = bivariateNormalPdf(x, y, 7, 7, 1.0, 1.0, 0);
  return p1 + 0.5 * p2;
};

// Gradient of Log Probability (Potential Energy Gradient) for HMC
// U(q) = -log(P(q))
// For a simple Gaussian donut: P(r) ~ exp(-(r-R)^2 / 2sigma^2)
export const donutPotential = (x: number, y: number): number => {
  const r = Math.sqrt(x*x + y*y);
  const targetR = 5; // Radius of donut
  return 0.5 * Math.pow(r - targetR, 2);
};

export const donutGradient = (x: number, y: number): { dx: number, dy: number } => {
  const r = Math.sqrt(x*x + y*y);
  const targetR = 5;
  if (r === 0) return { dx: 0, dy: 0 };
  
  // dU/dx = dU/dr * dr/dx
  // dU/dr = (r - targetR)
  // dr/dx = x/r
  const dUdr = (r - targetR);
  return {
    dx: dUdr * (x / r),
    dy: dUdr * (y / r)
  };
};
