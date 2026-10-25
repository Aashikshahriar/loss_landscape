export type Vec = [number, number];
export type Algorithm = 'gd' | 'momentum' | 'rmsprop' | 'adam' | 'noisy';
export type Status =
  | 'ready'
  | 'running'
  | 'paused'
  | 'max-iterations'
  | 'gradient-tolerance'
  | 'step-tolerance'
  | 'loss-tolerance'
  | 'non-finite'
  | 'domain-exit'
  | 'cancelled';
export interface Objective2D {
  id: string;
  name: string;
  domain: { x: Vec; y: Vec };
  initial: Vec;
  value(theta: Float64Array): number;
  gradient(theta: Float64Array): Float64Array;
  hessian(theta: Float64Array): number[][];
  formula: string;
  /** LaTeX source for the formula, rendered with KaTeX. */
  tex: string;
  description: string;
  caveat: string;
  rate: number;
  knownCriticalPoints: Array<{ x: number; y: number; type: string }>;
}
export interface Config {
  objective: string;
  initial: Vec;
  algorithms: Algorithm[];
  learningRate: number;
  momentum: number;
  beta1: number;
  beta2: number;
  rho: number;
  epsilon: number;
  maxIterations: number;
  seed: number;
  noise: number;
  gradientTolerance: number;
  stepTolerance: number;
  lossTolerance: number;
  clip: number;
  schedule: 'constant' | 'exponential' | 'cosine';
  decay: number;
  stopAtDomain: boolean;
}
export interface Evaluations {
  objective: number;
  gradient: number;
}
export interface OptimizerState {
  theta: Vec;
  m: Vec;
  v: Vec;
  t: number;
  rng: number;
  evaluations: Evaluations;
}
export interface Sample {
  step: number;
  theta: Vec;
  loss: number;
  gradient: Vec;
  oracleGradient: Vec;
  gradNorm: number;
  update: Vec;
  updateNorm: number;
  learningRate: number;
  moments: { m: Vec; v: Vec };
  elapsed: number;
  status: Status;
}
export interface Run {
  algorithm: Algorithm;
  history: Sample[];
  status: Status;
  evaluations: Evaluations;
  runtimeMs: number;
}
export interface Experiment {
  schemaVersion: 1;
  algorithmVersion: '1.0.0';
  id: string;
  name: string;
  createdAt: string;
  config: Config;
  runs: Run[];
}
export type WorkerRequest =
  | { type: 'reset'; config: Config; runId: number; restore?: Run[] }
  | { type: 'advance'; count: number; runId: number };
export interface WorkerResponse {
  type: 'batch';
  runId: number;
  runs: Run[];
}
