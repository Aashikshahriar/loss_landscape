import type { Objective2D, Vec } from '../types';
type F = (x: number, y: number) => number;
type G = (x: number, y: number) => Vec;
type H = (x: number, y: number) => number[][];
function objective(
  id: string,
  name: string,
  domain: Vec,
  initial: Vec,
  formula: string,
  description: string,
  caveat: string,
  rate: number,
  f: F,
  g: G,
  h: H,
  points: Objective2D['knownCriticalPoints'] = [],
  yDomain = domain,
): Objective2D {
  return {
    id,
    name,
    domain: { x: domain, y: yDomain },
    initial,
    formula,
    description,
    caveat,
    rate,
    value: (t) => f(t[0], t[1]),
    gradient: (t) => new Float64Array(g(t[0], t[1])),
    hessian: (t) => h(t[0], t[1]),
    knownCriticalPoints: points,
  };
}
const min = (x: number, y: number) => ({ x, y, type: 'minimum' });
const q = objective(
  'quadratic',
  'Quadratic bowl',
  [-4, 4],
  [-3, 2.5],
  'f(x,y) = x² + y²',
  'A smooth, convex landscape with one global minimum. A useful baseline for understanding descent.',
  'For this quadratic, constant-step GD converges when 0 < η < 1.',
  0.08,
  (x, y) => x * x + y * y,
  (x, y) => [2 * x, 2 * y],
  () => [
    [2, 0],
    [0, 2],
  ],
  [min(0, 0)],
);
export const objectives: Objective2D[] = [
  objective(
    'rosenbrock',
    'Rosenbrock valley',
    [-2, 2],
    [-1.4, 1.6],
    'f(x,y) = (1 − x)² + 100(y − x²)²',
    'A curved, narrow valley. Reaching the valley is easy; finding your way along it is the interesting part.',
    'Large learning rates can leave the displayed domain. The minimum is at (1, 1).',
    0.002,
    (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    (x, y) => [2 * (x - 1) - 400 * x * (y - x * x), 200 * (y - x * x)],
    (x, y) => [
      [2 - 400 * y + 1200 * x * x, -400 * x],
      [-400 * x, 200],
    ],
    [min(1, 1)],
    [-1, 3],
  ),
  q,
  objective(
    'elliptical',
    'Elliptical quadratic',
    [-4, 4],
    [-3, 2.5],
    'f(x,y) = x² + 20y²',
    'Unequal curvature creates a narrow valley and zig-zagging gradient-descent updates.',
    'Hessian condition number: 20. Constant-step GD is stable for 0 < η < 0.05.',
    0.035,
    (x, y) => x * x + 20 * y * y,
    (x, y) => [2 * x, 40 * y],
    () => [
      [2, 0],
      [0, 40],
    ],
    [min(0, 0)],
  ),
  objective(
    'himmelblau',
    'Himmelblau',
    [-5, 5],
    [-3.6, 0],
    'f(x,y) = (x² + y − 11)² + (x + y² − 7)²',
    'Four equal global minima, four different destinations. Initialization changes the basin you explore.',
    'A finite trajectory is evidence of local behavior, not a proof of global convergence.',
    0.005,
    (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
    (x, y) => [
      4 * x * (x * x + y - 11) + 2 * (x + y * y - 7),
      2 * (x * x + y - 11) + 4 * y * (x + y * y - 7),
    ],
    (x, y) => [
      [12 * x * x + 4 * y - 42, 4 * (x + y)],
      [4 * (x + y), 4 * x + 12 * y * y - 26],
    ],
    [min(3, 2), min(-2.805118, 3.131312), min(-3.77931, -3.283186), min(3.584428, -1.848126)],
  ),
  objective(
    'rastrigin',
    'Rastrigin',
    [-5.12, 5.12],
    [-3.2, 2.8],
    'f(x,y) = 20 + x² + y² − 10 cos(2πx) − 10 cos(2πy)',
    'A field of local minima surrounds the global minimum at the origin.',
    'Small gradient norm can indicate a local minimum far from the global solution.',
    0.003,
    (x, y) => 20 + x * x + y * y - 10 * Math.cos(2 * Math.PI * x) - 10 * Math.cos(2 * Math.PI * y),
    (x, y) => [
      2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
      2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y),
    ],
    (x, y) => [
      [2 + 40 * Math.PI ** 2 * Math.cos(2 * Math.PI * x), 0],
      [0, 2 + 40 * Math.PI ** 2 * Math.cos(2 * Math.PI * y)],
    ],
    [min(0, 0)],
  ),
  objective(
    'beale',
    'Beale',
    [-4.5, 4.5],
    [0.5, 0.5],
    'f(x,y) = Σᵢ₌₁³ (aᵢ − x + xyⁱ)²; a = (1.5, 2.25, 2.625)',
    'Steep edges surround a flat, curved valley leading to (3, 0.5).',
    'This landscape grows rapidly near its edges. Start with a conservative learning rate.',
    0.005,
    (x, y) => [1.5, 2.25, 2.625].reduce((s, a, i) => s + (a - x + x * y ** (i + 1)) ** 2, 0),
    (x, y) => {
      let gx = 0,
        gy = 0;
      [1.5, 2.25, 2.625].forEach((a, i) => {
        const k = i + 1,
          r = a - x + x * y ** k;
        gx += 2 * r * (y ** k - 1);
        gy += 2 * r * x * k * y ** (k - 1);
      });
      return [gx, gy];
    },
    (x, y) => {
      let xx = 0,
        xy = 0,
        yy = 0;
      [1.5, 2.25, 2.625].forEach((a, i) => {
        const k = i + 1,
          r = a - x + x * y ** k,
          u = y ** k - 1,
          v = x * k * y ** (k - 1);
        xx += 2 * u * u;
        xy += 2 * (u * v + r * k * y ** (k - 1));
        yy += 2 * (v * v + (k > 1 ? r * x * k * (k - 1) * y ** (k - 2) : 0));
      });
      return [
        [xx, xy],
        [xy, yy],
      ];
    },
    [min(3, 0.5)],
  ),
  objective(
    'saddle',
    'Saddle',
    [-3, 3],
    [1.6, 0.15],
    'f(x,y) = x² − y²',
    'Positive curvature along x, negative curvature along y. The origin is stationary but is not a minimum.',
    'This objective is unbounded below. Descent may exit the display domain without numerical divergence.',
    0.04,
    (x, y) => x * x - y * y,
    (x, y) => [2 * x, -2 * y],
    () => [
      [2, 0],
      [0, -2],
    ],
    [{ x: 0, y: 0, type: 'saddle' }],
  ),
  objective(
    'monkey',
    'Monkey saddle',
    [-2, 2],
    [0.25, 0.2],
    'f(x,y) = x³ − 3xy²',
    'A degenerate stationary point with three descending directions.',
    'At the origin, both Hessian eigenvalues are zero: the second-order test is inconclusive.',
    0.03,
    (x, y) => x ** 3 - 3 * x * y * y,
    (x, y) => [3 * x * x - 3 * y * y, -6 * x * y],
    (x, y) => [
      [6 * x, -6 * y],
      [-6 * y, -6 * x],
    ],
    [{ x: 0, y: 0, type: 'degenerate saddle' }],
  ),
  objective(
    'doublewell',
    'Double well',
    [-2, 2],
    [0.1, 1.3],
    'f(x,y) = (x² − 1)² + y²',
    'Two equal minima separated by a saddle. A small change in initialization selects a different well.',
    'At exactly (0,0), deterministic gradient methods remain at the saddle.',
    0.035,
    (x, y) => (x * x - 1) ** 2 + y * y,
    (x, y) => [4 * x * (x * x - 1), 2 * y],
    (x) => [
      [12 * x * x - 4, 0],
      [0, 2],
    ],
    [min(-1, 0), min(1, 0), { x: 0, y: 0, type: 'saddle' }],
  ),
  {
    ...q,
    id: 'noisy-quadratic',
    name: 'Noisy quadratic',
    description: 'The same exact quadratic objective, with an optional seeded noisy gradient oracle.',
    caveat: 'Noise is added only with “Noisy gradient”. This is a simulation, not minibatch SGD.',
  },
];
export const objectiveById = (id: string) => objectives.find((o) => o.id === id) ?? objectives[0];
export function eigenvalues(h: number[][]): Vec {
  const a = h[0][0],
    b = h[0][1],
    d = h[1][1],
    s = Math.hypot(a - d, 2 * b);
  return [(a + d - s) / 2, (a + d + s) / 2];
}
export function classification(gNorm: number, e: Vec): string {
  if (gNorm > 1e-5) return 'Non-stationary point';
  if (e[0] > 1e-7) return 'Local minimum';
  if (e[1] < -1e-7) return 'Local maximum';
  if (e[0] < -1e-7 && e[1] > 1e-7) return 'Saddle point';
  return 'Inconclusive (degenerate)';
}
