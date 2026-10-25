import { describe, expect, it } from 'vitest';
import { createState, defaultConfig, learningRate, optimizerStep, simulate } from '../../src/math/engine';
import type { Config } from '../../src/types';
const config = (patch: Partial<Config> = {}): Config => ({
  ...defaultConfig,
  objective: 'quadratic',
  initial: [1, -2],
  learningRate: 0.1,
  ...patch,
});
describe('independent update fixtures', () => {
  it('GD: two quadratic steps', () => {
    const c = config();
    const a = optimizerStep('gd', createState(c), c),
      b = optimizerStep('gd', a.state, c);
    expect(a.state.theta[0]).toBeCloseTo(0.8, 14);
    expect(a.state.theta[1]).toBeCloseTo(-1.6, 14);
    expect(b.state.theta[0]).toBeCloseTo(0.64, 14);
    expect(b.state.theta[1]).toBeCloseTo(-1.28, 14);
  });
  it('heavy ball uses unnormalized velocity', () => {
    const c = config();
    const a = optimizerStep('momentum', createState(c), c),
      b = optimizerStep('momentum', a.state, c);
    expect(a.state.m).toEqual([2, -4]);
    expect(b.state.m[0]).toBeCloseTo(3.4, 14);
    expect(b.state.theta[0]).toBeCloseTo(0.46, 14);
    expect(b.state.theta[1]).toBeCloseTo(-0.92, 14);
  });
  it('RMSProp places epsilon outside the square root', () => {
    const c = config({ epsilon: 0.01 });
    const a = optimizerStep('rmsprop', createState(c), c);
    expect(a.state.v[0]).toBeCloseTo(0.4, 14);
    expect(a.state.v[1]).toBeCloseTo(1.6, 14);
    expect(a.state.theta[0]).toBeCloseTo(1 - 0.2 / (Math.sqrt(0.4) + 0.01), 14);
    expect(a.state.theta[1]).toBeCloseTo(-2 + 0.4 / (Math.sqrt(1.6) + 0.01), 14);
  });
  it('Adam bias correction begins at t=1 and includes second update', () => {
    const c = config({ epsilon: 0.01 });
    const a = optimizerStep('adam', createState(c), c);
    expect(a.state.t).toBe(1);
    expect(a.state.theta[0]).toBeCloseTo(1 - (0.1 * 2) / 2.01, 14);
    expect(a.state.theta[1]).toBeCloseTo(-2 + (0.1 * 4) / 4.01, 14);
    const b = optimizerStep('adam', a.state, c);
    const gx = 2 * a.state.theta[0],
      m = 0.9 * 0.2 + 0.1 * gx,
      v = 0.999 * 0.004 + 0.001 * gx * gx;
    expect(b.state.theta[0]).toBeCloseTo(
      a.state.theta[0] - (0.1 * (m / (1 - 0.9 ** 2))) / (Math.sqrt(v / (1 - 0.999 ** 2)) + 0.01),
      14,
    );
  });
});
it('GD converges on the convex quadratic at a valid rate', () => {
  const r = simulate(config({ maxIterations: 200 }), 'gd');
  expect(r.status).toBe('gradient-tolerance');
  expect(r.history.at(-1)!.loss).toBeLessThan(1e-12);
});
it('noisy gradients replay including seed=0, and differ by seed', () => {
  const c = config({ seed: 0, maxIterations: 30 });
  expect(simulate(c, 'noisy')).toEqual(simulate(c, 'noisy'));
  expect(simulate(c, 'noisy').history.at(-1)!.theta).not.toEqual(
    simulate({ ...c, seed: 1 }, 'noisy').history.at(-1)!.theta,
  );
  expect(simulate(c, 'noisy').history[1].oracleGradient).not.toEqual([2, -4]);
});
it('resetting state resets moments, step, and seed', () => {
  const c = config();
  const state = optimizerStep('adam', createState(c), c).state;
  expect(state.t).toBe(1);
  expect(createState(c)).toEqual({
    theta: [1, -2],
    m: [0, 0],
    v: [0, 0],
    t: 0,
    rng: 42,
    evaluations: { objective: 1, gradient: 1 },
  });
});
it('counts actual evaluations, including rejected non-finite attempts', () => {
  const c = config({ maxIterations: 3, gradientTolerance: 0 });
  expect(simulate(c, 'gd').evaluations).toEqual({ objective: 4, gradient: 7 });
  expect(simulate({ ...c, lossTolerance: 1e-15 }, 'gd').evaluations).toEqual({ objective: 7, gradient: 7 });
  const r = simulate(
    { ...c, objective: 'beale', initial: [4, 4], learningRate: 10, maxIterations: 100 },
    'gd',
  );
  expect(r.evaluations.objective).toBe(r.history.length + 1);
  expect(r.evaluations.gradient).toBe(1 + 2 * r.history.length);
});
it('bounds the step budget and records step 0', () => {
  const r = simulate(config({ maxIterations: 3, gradientTolerance: 0 }), 'gd');
  expect(r.status).toBe('max-iterations');
  expect(r.history.map((s) => s.step)).toEqual([0, 1, 2, 3]);
});
it('identifies exact zero-gradient saddle without certifying a minimum', () => {
  const r = simulate(config({ objective: 'saddle', initial: [0, 0] }), 'gd');
  expect(r.status).toBe('gradient-tolerance');
  expect(r.history).toHaveLength(1);
});
it('does not stop noisy gradient merely because the true gradient is zero', () => {
  const r = simulate(config({ initial: [0, 0], maxIterations: 2 }), 'noisy');
  expect(r.history).toHaveLength(3);
});
it('records an out-of-domain point without clamping', () => {
  const c = config({ objective: 'saddle', initial: [0, 2.9], stopAtDomain: true });
  const r = simulate(c, 'gd');
  expect(r.status).toBe('domain-exit');
  expect(r.history.at(-1)!.theta[1]).toBeCloseTo(3.48);
  expect(simulate({ ...c, stopAtDomain: false, maxIterations: 3 }, 'gd').status).toBe('max-iterations');
});
it('applies the domain policy to the initial point', () => {
  const r = simulate(config({ initial: [10, 0], stopAtDomain: true }), 'gd');
  expect(r.status).toBe('domain-exit');
  expect(r.history).toHaveLength(1);
  expect(r.history[0].theta).toEqual([10, 0]);
});
it('terminates on non-finite updates and retains only finite history', () => {
  const r = simulate(
    config({ objective: 'beale', initial: [4, 4], learningRate: 10, maxIterations: 100 }),
    'gd',
  );
  expect(r.status).toBe('non-finite');
  expect(r.history.every((s) => Number.isFinite(s.loss) && s.theta.every(Number.isFinite))).toBe(true);
});
it('applies gradient clipping only when enabled', () => {
  const c = config({ clip: 1 });
  const a = optimizerStep('gd', createState(c), c);
  expect(Math.hypot(...a.sample.oracleGradient)).toBeCloseTo(1);
  expect(a.sample.updateNorm).toBeCloseTo(0.1);
});
it('reports step and objective-change criteria distinctly', () => {
  expect(
    simulate(config({ learningRate: 1e-15, gradientTolerance: 0, stepTolerance: 1e-12 }), 'gd').status,
  ).toBe('step-tolerance');
  expect(simulate(config({ lossTolerance: 10 }), 'gd').status).toBe('loss-tolerance');
});
it('schedules have explicit values at known indices', () => {
  const c = config({ maxIterations: 100 });
  expect(learningRate(c, 50)).toBe(0.1);
  expect(learningRate({ ...c, schedule: 'exponential', decay: 0.5 }, 2)).toBe(0.025);
  expect(learningRate({ ...c, schedule: 'cosine' }, 0)).toBe(0.1);
  expect(learningRate({ ...c, schedule: 'cosine' }, 50)).toBeCloseTo(0.05);
  expect(learningRate({ ...c, schedule: 'cosine' }, 100)).toBe(0);
});
it('independent racing runs have identical starts and replay', () => {
  const c = config({ algorithms: ['gd', 'adam', 'momentum', 'rmsprop'], maxIterations: 10 });
  const all = c.algorithms.map((a) => simulate(c, a));
  for (const r of all) {
    expect(r.history[0].theta).toEqual(c.initial);
    expect(r).toEqual(simulate(c, r.algorithm));
  }
  expect(all[0].history[1].theta).not.toEqual(all[1].history[1].theta);
});
