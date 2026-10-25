import { create } from 'zustand';
import { defaultConfig, initialSample, isActive } from '../math/engine';
import { objectiveById } from '../math/objectives';
import { configSchema } from '../services/experiments';
import type { Algorithm, Config, Experiment, Run, WorkerResponse, WorkerRequest } from '../types';
let worker: Worker | null = null;
let revision = 0;
interface LabState {
  config: Config;
  runs: Run[];
  running: boolean;
  busy: boolean;
  cursor: number | null;
  speed: number;
  view: '3d' | '2d';
  activeAlgorithm: Algorithm;
  notice: string;
  init: () => void;
  configure: (patch: Partial<Config>) => void;
  setObjective: (id: string) => void;
  play: () => void;
  pause: () => void;
  advance: (count?: number) => void;
  reset: () => void;
  setCursor: (n: number | null) => void;
  setSpeed: (n: number) => void;
  setView: (v: '3d' | '2d') => void;
  setAlgorithm: (a: Algorithm) => void;
  notify: (s: string) => void;
  restore: (e: Experiment) => void;
  snapshot: (name?: string) => Experiment;
}
const initialRuns = (c: Config): Run[] =>
  c.algorithms.map((algorithm) => ({
    algorithm,
    history: [initialSample(c)],
    status: 'ready',
    evaluations: { objective: 1, gradient: 1 },
    runtimeMs: 0,
  }));
function resetWorker(config: Config) {
  revision++;
  worker?.postMessage({ type: 'reset', config, runId: revision } satisfies WorkerRequest);
}
export const useLab = create<LabState>((set, get) => ({
  config: defaultConfig,
  runs: initialRuns(defaultConfig),
  running: false,
  busy: false,
  cursor: null,
  speed: 5,
  view: typeof window !== 'undefined' && window.innerWidth < 760 ? '2d' : '3d',
  activeAlgorithm: 'gd',
  notice: '',
  init: () => {
    if (worker) return;
    worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const result = event.data;
      if (result.runId !== revision) return;
      const current = get();
      const runs = result.runs.map((r, i) => ({
        ...r,
        history: r.history[0]?.step === 0 ? r.history : [...(current.runs[i]?.history ?? []), ...r.history],
      }));
      set({ runs, busy: false, running: current.running && runs.some((r) => isActive(r.status)) });
    };
    worker.onerror = () => {
      worker?.terminate();
      worker = null;
      set({
        running: false,
        busy: false,
        notice: 'The simulation worker stopped unexpectedly. Reset the experiment to retry.',
      });
    };
    resetWorker(get().config);
  },
  configure: (patch) => {
    const parsed = configSchema.safeParse({ ...get().config, ...patch });
    if (!parsed.success) {
      set({ notice: parsed.error.issues[0].message });
      return;
    }
    if (!worker) get().init();
    const config = parsed.data;
    resetWorker(config);
    set({
      config,
      runs: initialRuns(config),
      running: false,
      busy: !!worker,
      cursor: null,
      activeAlgorithm: config.algorithms.includes(get().activeAlgorithm)
        ? get().activeAlgorithm
        : config.algorithms[0],
    });
  },
  setObjective: (id) => {
    const o = objectiveById(id);
    get().configure({ objective: id, initial: [...o.initial], learningRate: o.rate });
  },
  play: () => {
    if (!worker) get().reset();
    if (get().runs.every((r) => !isActive(r.status))) {
      get().reset();
    }
    set({ running: true, cursor: null });
  },
  pause: () => set({ running: false }),
  advance: (count = 1) => {
    const s = get();
    if (!worker || s.busy || !s.runs.some((r) => isActive(r.status))) return;
    set({ busy: true, cursor: null });
    worker?.postMessage({ type: 'advance', count, runId: revision } satisfies WorkerRequest);
  },
  reset: () => {
    if (!worker) get().init();
    const config = get().config;
    resetWorker(config);
    set({ runs: initialRuns(config), running: false, busy: !!worker, cursor: null });
  },
  setCursor: (cursor) => set({ cursor, running: false }),
  setSpeed: (speed) => set({ speed }),
  setView: (view) => set({ view }),
  setAlgorithm: (activeAlgorithm) => set({ activeAlgorithm }),
  notify: (notice) => set({ notice }),
  restore: (e) => {
    if (!worker) get().init();
    revision++;
    set({
      config: e.config,
      runs: e.runs,
      running: false,
      busy: !!worker,
      cursor: null,
      activeAlgorithm: e.config.algorithms[0],
      notice: 'Recorded experiment restored. Resume or reset to reproduce from step 0.',
    });
    worker?.postMessage({
      type: 'reset',
      config: e.config,
      runId: revision,
      restore: e.runs,
    } satisfies WorkerRequest);
  },
  snapshot: (name = 'Untitled experiment') => {
    const s = get();
    return {
      schemaVersion: 1,
      algorithmVersion: '1.0.0',
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      config: structuredClone(s.config),
      runs: structuredClone(s.runs),
    };
  },
}));
export function useCurrent() {
  const { runs, activeAlgorithm, cursor } = useLab();
  const run = runs.find((r) => r.algorithm === activeAlgorithm) ?? runs[0];
  const sample = run.history[Math.min(cursor ?? Infinity, run.history.length - 1)];
  return { run, sample };
}
