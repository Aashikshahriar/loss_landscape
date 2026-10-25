import { objectiveById } from './objectives';
import type { Algorithm, Config, OptimizerState, Run, Sample, Vec } from '../types';
export const algorithms: Record<Algorithm, { name: string; short: string; color: string; equation: string }> =
  {
    gd: { name: 'Gradient descent', short: 'GD', color: '#a99aff', equation: 'θₜ₊₁ = θₜ − ηₜ ∇f(θₜ)' },
    momentum: {
      name: 'Momentum',
      short: 'Momentum',
      color: '#ffbf70',
      equation: 'vₜ₊₁ = βvₜ + gₜ;  θₜ₊₁ = θₜ − ηₜvₜ₊₁',
    },
    rmsprop: {
      name: 'RMSProp',
      short: 'RMSProp',
      color: '#68b7ff',
      equation: 'sₜ₊₁ = ρsₜ + (1−ρ)gₜ²;  θₜ₊₁ = θₜ − ηₜgₜ/(√sₜ₊₁ + ε)',
    },
    adam: {
      name: 'Adam',
      short: 'Adam',
      color: '#3edbd0',
      equation: 'm̂ₜ₊₁ = mₜ₊₁/(1−β₁ᵗ⁺¹);  v̂ₜ₊₁ = vₜ₊₁/(1−β₂ᵗ⁺¹);  θₜ₊₁ = θₜ − ηₜm̂ₜ₊₁/(√v̂ₜ₊₁ + ε)',
    },
    noisy: {
      name: 'Noisy gradient',
      short: 'Noisy GD',
      color: '#f095ca',
      equation: 'θₜ₊₁ = θₜ − ηₜ[∇f(θₜ) + σξₜ];  ξᵢ ~ U(−√3, √3)',
    },
  };
export const defaultConfig: Config = {
  objective: 'rosenbrock',
  initial: [-1.4, 1.6],
  algorithms: ['gd'],
  learningRate: 0.002,
  momentum: 0.9,
  beta1: 0.9,
  beta2: 0.999,
  rho: 0.9,
  epsilon: 1e-8,
  maxIterations: 1000,
  seed: 42,
  noise: 0.5,
  gradientTolerance: 1e-6,
  stepTolerance: 1e-12,
  lossTolerance: 0,
  clip: 0,
  schedule: 'constant',
  decay: 0.995,
  stopAtDomain: false,
};
export function learningRate(c: Config, t: number): number {
  return (
    c.learningRate *
    (c.schedule === 'exponential'
      ? c.decay ** t
      : c.schedule === 'cosine'
        ? (1 + Math.cos(Math.PI * Math.min(t / c.maxIterations, 1))) / 2
        : 1)
  );
}
export function createState(c: Config): OptimizerState {
  return {
    theta: [...c.initial],
    m: [0, 0],
    v: [0, 0],
    t: 0,
    rng: c.seed >>> 0,
    evaluations: { objective: 1, gradient: 1 },
  };
}
function uniform(s: number): [number, number] {
  const next = (s + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [next, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
}
export function initialSample(c: Config): Sample {
  const o = objectiveById(c.objective),
    g = o.gradient(new Float64Array(c.initial));
  const outside =
    c.initial[0] < o.domain.x[0] ||
    c.initial[0] > o.domain.x[1] ||
    c.initial[1] < o.domain.y[0] ||
    c.initial[1] > o.domain.y[1];
  return {
    step: 0,
    theta: [...c.initial],
    loss: o.value(new Float64Array(c.initial)),
    gradient: [g[0], g[1]],
    oracleGradient: [g[0], g[1]],
    gradNorm: Math.hypot(...g),
    update: [0, 0],
    updateNorm: 0,
    learningRate: c.learningRate,
    moments: { m: [0, 0], v: [0, 0] },
    elapsed: 0,
    status: c.stopAtDomain && outside ? 'domain-exit' : 'ready',
  };
}
export function optimizerStep(
  a: Algorithm,
  s: OptimizerState,
  c: Config,
): { state: OptimizerState; sample: Sample } {
  const o = objectiveById(c.objective),
    raw = o.gradient(new Float64Array(s.theta));
  const g: Vec = [raw[0], raw[1]];
  let rng = s.rng;
  if (a === 'noisy')
    for (let i = 0; i < 2; i++) {
      const p = uniform(rng);
      rng = p[0];
      g[i] += c.noise * (p[1] * 2 - 1) * Math.sqrt(3);
    }
  const norm = Math.hypot(...g);
  if (c.clip > 0 && norm > c.clip) {
    g[0] *= c.clip / norm;
    g[1] *= c.clip / norm;
  }
  const m: Vec = [...s.m],
    v: Vec = [...s.v],
    update: Vec = [0, 0],
    theta: Vec = [...s.theta],
    t = s.t + 1,
    lr = learningRate(c, s.t);
  for (let i = 0; i < 2; i++) {
    let direction = g[i];
    if (a === 'momentum') {
      m[i] = c.momentum * m[i] + g[i];
      direction = m[i];
    }
    if (a === 'rmsprop') {
      v[i] = c.rho * v[i] + (1 - c.rho) * g[i] ** 2;
      direction = g[i] / (Math.sqrt(v[i]) + c.epsilon);
    }
    if (a === 'adam') {
      m[i] = c.beta1 * m[i] + (1 - c.beta1) * g[i];
      v[i] = c.beta2 * v[i] + (1 - c.beta2) * g[i] ** 2;
      direction = m[i] / (1 - c.beta1 ** t) / (Math.sqrt(v[i] / (1 - c.beta2 ** t)) + c.epsilon);
    }
    update[i] = -lr * direction;
    theta[i] += update[i];
  }
  const loss = o.value(new Float64Array(theta)),
    newG = o.gradient(new Float64Array(theta)),
    gradNorm = Math.hypot(...newG),
    updateNorm = Math.hypot(...update);
  let status: Sample['status'] = 'running';
  const evaluations = { objective: s.evaluations.objective + 1, gradient: s.evaluations.gradient + 2 };
  if (![...theta, loss, ...newG, ...m, ...v, ...g, ...update].every(Number.isFinite)) status = 'non-finite';
  else if (
    c.stopAtDomain &&
    (theta[0] < o.domain.x[0] ||
      theta[0] > o.domain.x[1] ||
      theta[1] < o.domain.y[0] ||
      theta[1] > o.domain.y[1])
  )
    status = 'domain-exit';
  else if (a !== 'noisy' && gradNorm <= c.gradientTolerance) status = 'gradient-tolerance';
  else if (c.stepTolerance > 0 && updateNorm <= c.stepTolerance) status = 'step-tolerance';
  else {
    let lossStopped = false;
    if (c.lossTolerance > 0) {
      evaluations.objective++;
      lossStopped = Math.abs(loss - o.value(new Float64Array(s.theta))) <= c.lossTolerance;
    }
    if (lossStopped) status = 'loss-tolerance';
    else if (t >= c.maxIterations) status = 'max-iterations';
  }
  return {
    state: { theta, m, v, t, rng, evaluations },
    sample: {
      step: t,
      theta,
      loss,
      gradient: [newG[0], newG[1]],
      oracleGradient: g,
      gradNorm,
      update,
      updateNorm,
      learningRate: lr,
      moments: { m: [...m], v: [...v] },
      elapsed: 0,
      status,
    },
  };
}
export const isActive = (s: Run['status']) => s === 'ready' || s === 'running' || s === 'paused';
export function simulate(c: Config, a: Algorithm): Run {
  let state = createState(c);
  const history = [initialSample(c)];
  if (!isActive(history[0].status))
    return { algorithm: a, history, status: history[0].status, evaluations: state.evaluations, runtimeMs: 0 };
  if (a !== 'noisy' && history[0].gradNorm <= c.gradientTolerance) {
    history[0].status = 'gradient-tolerance';
    return {
      algorithm: a,
      history,
      status: 'gradient-tolerance',
      evaluations: state.evaluations,
      runtimeMs: 0,
    };
  }
  while (history.length <= c.maxIterations) {
    const next = optimizerStep(a, state, c);
    state = next.state;
    if (next.sample.status === 'non-finite')
      return { algorithm: a, history, status: 'non-finite', evaluations: state.evaluations, runtimeMs: 0 };
    history.push(next.sample);
    if (!isActive(next.sample.status)) break;
  }
  return {
    algorithm: a,
    history,
    status: history.at(-1)!.status,
    evaluations: state.evaluations,
    runtimeMs: 0,
  };
}
