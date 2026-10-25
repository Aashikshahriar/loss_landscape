import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import type { Config, Experiment } from '../types';
const finite = z.number().finite();
const vec = z.tuple([finite, finite]);
const algorithm = z.enum(['gd', 'momentum', 'rmsprop', 'adam', 'noisy']);
export const configSchema = z.object({
  objective: z.enum([
    'rosenbrock',
    'quadratic',
    'elliptical',
    'himmelblau',
    'rastrigin',
    'beale',
    'saddle',
    'monkey',
    'doublewell',
    'noisy-quadratic',
  ]),
  initial: z.tuple([finite.min(-1e6).max(1e6), finite.min(-1e6).max(1e6)]),
  algorithms: z
    .array(algorithm)
    .min(1)
    .max(4)
    .refine((a) => new Set(a).size === a.length),
  learningRate: finite.positive().max(10),
  momentum: finite.min(0).lt(1),
  beta1: finite.min(0).lt(1),
  beta2: finite.min(0).lt(1),
  rho: finite.min(0).lt(1),
  epsilon: finite.positive().max(1),
  maxIterations: z.number().int().min(1).max(10000),
  seed: z.number().int().min(0).max(4294967295),
  noise: finite.min(0).max(100),
  gradientTolerance: finite.min(0).max(1),
  stepTolerance: finite.min(0).max(1),
  lossTolerance: finite.min(0).max(1),
  clip: finite.min(0).max(1e6),
  schedule: z.enum(['constant', 'exponential', 'cosine']),
  decay: finite.positive().max(1),
  stopAtDomain: z.boolean(),
});
const status = z.enum([
  'ready',
  'running',
  'paused',
  'max-iterations',
  'gradient-tolerance',
  'step-tolerance',
  'loss-tolerance',
  'non-finite',
  'domain-exit',
  'cancelled',
]);
const sampleSchema = z.object({
  step: z.number().int().min(0),
  theta: vec,
  loss: finite,
  gradient: vec,
  oracleGradient: vec,
  gradNorm: finite.nonnegative(),
  update: vec,
  updateNorm: finite.nonnegative(),
  learningRate: finite.nonnegative(),
  moments: z.object({ m: vec, v: vec }),
  elapsed: finite.nonnegative(),
  status,
});
export const experimentSchema = z
  .object({
    schemaVersion: z.literal(1),
    algorithmVersion: z.literal('1.0.0'),
    id: z.string().max(100),
    name: z.string().min(1).max(120),
    createdAt: z.iso.datetime(),
    config: configSchema,
    runs: z
      .array(
        z.object({
          algorithm,
          history: z.array(sampleSchema).min(1).max(10001),
          status,
          runtimeMs: finite.nonnegative(),
          evaluations: z.object({
            objective: z.number().int().min(1).max(100000),
            gradient: z.number().int().min(1).max(100000),
          }),
        }),
      )
      .min(1)
      .max(4),
  })
  .superRefine((exp, ctx) => {
    if (
      exp.runs.length !== exp.config.algorithms.length ||
      exp.runs.some((run, i) => run.algorithm !== exp.config.algorithms[i])
    )
      ctx.addIssue({ code: 'custom', message: 'Run algorithms must match configuration.' });
    for (const run of exp.runs) {
      if (
        run.history.length > exp.config.maxIterations + 1 ||
        run.history.some((s, i) => s.step !== i) ||
        run.history[0].theta.some((v, i) => v !== exp.config.initial[i])
      )
        ctx.addIssue({
          code: 'custom',
          message: 'History must begin at the configured point and use consecutive steps.',
        });
    }
  });
const db = new Dexie('optimizationland') as Dexie & { experiments: EntityTable<Experiment, 'id'> };
db.version(1).stores({ experiments: 'id,createdAt,name' });
export const experiments = {
  list: () => db.experiments.orderBy('createdAt').reverse().toArray(),
  save: (e: Experiment) => db.experiments.put(experimentSchema.parse(e)),
  remove: (id: string) => db.experiments.delete(id),
};
export const importLimit = 32_000_000;
export function parseExperiment(text: string): Experiment {
  if (new TextEncoder().encode(text).length > importLimit) throw new Error('Import exceeds the 32 MB limit.');
  return experimentSchema.parse(JSON.parse(text));
}
export function shareConfig(c: Config): string {
  const url = new URL(location.href);
  url.hash = '/lab?config=' + encodeURIComponent(JSON.stringify(c));
  if (url.href.length > 4000) throw new Error('This configuration exceeds the 4,000-character share limit.');
  return url.href;
}
export function readSharedConfig(): Config | null {
  const encoded = location.hash.split('?')[1];
  if (!encoded) return null;
  if (encoded.length > 4000) throw new Error('Shared configuration exceeds the URL size limit.');
  const s = new URLSearchParams(encoded).get('config');
  return s ? configSchema.parse(JSON.parse(s)) : null;
}
export function download(content: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportJSON(e: Experiment) {
  download(JSON.stringify(e), 'application/json', 'optimizationland-experiment.json');
}
export function exportCSV(e: Experiment) {
  const comments = [
    'OptimizationLand schema=1 algorithm=1.0.0',
    `createdAt=${e.createdAt}`,
    `config=${JSON.stringify(e.config)}`,
  ]
    .map((s) => '# ' + s)
    .join('\n');
  const rows = e.runs.flatMap((r) =>
    r.history.map((s, i) =>
      [
        r.algorithm,
        s.step,
        ...s.theta,
        s.loss,
        s.gradNorm,
        s.updateNorm,
        s.learningRate,
        i === r.history.length - 1 ? r.status : s.status,
        s.elapsed,
      ].join(','),
    ),
  );
  download(
    comments +
      '\nalgorithm,step,x,y,loss,grad_norm,update_norm,learning_rate,status,elapsed_ms\n' +
      rows.join('\n'),
    'text/csv',
    'optimizationland-trajectories.csv',
  );
}
