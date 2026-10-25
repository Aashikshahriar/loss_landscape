import { useState } from 'react';
import { ArrowDownRight, ChartNoAxesCombined, Download } from 'lucide-react';
import { useLab } from '../stores/lab';
import { algorithms } from '../math/engine';
import { fmt } from './Inspector';
import { download } from '../services/experiments';
type Metric = 'loss' | 'gradNorm' | 'updateNorm' | 'x' | 'y';
const tabs: { id: Metric; name: string }[] = [
  { id: 'loss', name: 'Loss' },
  { id: 'gradNorm', name: 'Gradient norm' },
  { id: 'updateNorm', name: 'Step norm' },
  { id: 'x', name: 'x trace' },
  { id: 'y', name: 'y trace' },
];
export function Charts() {
  const { runs, cursor, setCursor, config } = useLab();
  const [metric, setMetric] = useState<Metric>('loss'),
    [log, setLog] = useState(false);
  const value = (s: (typeof runs)[number]['history'][number]) =>
    metric === 'x' ? s.theta[0] : metric === 'y' ? s.theta[1] : s[metric];
  const transform = (n: number) => (log ? Math.sign(n) * Math.log10(1 + Math.abs(n)) : n);
  const all = runs.flatMap((r) => r.history.map((s) => transform(value(s)))).filter(Number.isFinite);
  let low = Math.min(...all),
    high = Math.max(...all);
  if (low === high) {
    low -= Math.max(1, Math.abs(low) * 0.1);
    high += Math.max(1, Math.abs(high) * 0.1);
  }
  const steps = Math.max(...runs.map((r) => r.history.length - 1)),
    maxStep = Math.max(steps, 20),
    width = 800,
    height = 174,
    left = 63,
    right = 21,
    top = 12,
    bottom = 29;
  const x = (n: number) => left + (n / maxStep) * (width - left - right),
    y = (n: number) => top + ((high - transform(n)) / (high - low)) * (height - top - bottom);
  const active = runs[0],
    first = active.history[0].loss,
    last = active.history.at(-1)!.loss,
    improvement = first === 0 ? null : ((first - last) / Math.abs(first)) * 100;
  const exportSvg = () => {
    const svg = document.querySelector('#convergence-chart');
    if (svg)
      download(new XMLSerializer().serializeToString(svg), 'image/svg+xml', 'optimizationland-chart.svg');
  };
  return (
    <section className="charts panel" aria-label="Convergence charts">
      <div className="chart-toolbar">
        <div className="chart-title">
          <ChartNoAxesCombined size={16} />
          <h2>Convergence</h2>
          <span className="tiny-pill">LIVE METRICS</span>
        </div>
        <button
          className="icon-button"
          onClick={exportSvg}
          title="Export chart SVG"
          aria-label="Export chart SVG"
        >
          <Download size={14} />
        </button>
      </div>
      <div className="chart-tabs">
        <div role="group" aria-label="Chart metric">
          {tabs.map((t) => (
            <button className={metric === t.id ? 'active' : ''} key={t.id} onClick={() => setMetric(t.id)}>
              {t.name}
            </button>
          ))}
        </div>
        <label className="log-toggle">
          <input type="checkbox" checked={log} onChange={(e) => setLog(e.target.checked)} />
          Signed log scale
        </label>
      </div>
      <div className="chart-body">
        <svg
          id="convergence-chart"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${tabs.find((t) => t.id === metric)?.name} versus recorded step. ${runs.map((r) => `${algorithms[r.algorithm].name}: initial ${fmt(value(r.history[0]))}, current ${fmt(value(r.history.at(-1)!))}`).join('. ')}`}
          onClick={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const step = Math.round(
              ((((e.clientX - box.left) / box.width) * width - left) / (width - left - right)) * maxStep,
            );
            setCursor(Math.max(0, Math.min(steps, step)));
          }}
          style={{ background: '#111724' }}
        >
          {Array.from({ length: 4 }, (_, i) => {
            const py = top + (i / 3) * (height - top - bottom),
              n = high - (i / 3) * (high - low);
            return (
              <g key={i}>
                <line x1={left} x2={width - right} y1={py} y2={py} stroke="#273246" strokeDasharray="3 5" />
                <text
                  x={left - 12}
                  y={py + 3}
                  textAnchor="end"
                  fill="#9ca9bc"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {log ? n.toFixed(2) : Math.abs(n) >= 1000 ? n.toExponential(1) : n.toFixed(2)}
                </text>
              </g>
            );
          })}
          {Array.from({ length: 6 }, (_, i) => (
            <text
              key={i}
              x={x((i / 5) * maxStep)}
              y={height - 8}
              textAnchor="middle"
              fill="#9ca9bc"
              fontSize="9"
              fontFamily="monospace"
            >
              {Math.round((i / 5) * maxStep)}
            </text>
          ))}
          {runs.map((r) => {
            const stride = Math.max(1, Math.floor(r.history.length / 1300));
            const samples = r.history.filter((_, i) => i % stride === 0 || i === r.history.length - 1);
            return (
              <path
                key={r.algorithm}
                d={samples.map((s, i) => (i ? 'L' : 'M') + x(s.step) + ',' + y(value(s))).join('')}
                stroke={algorithms[r.algorithm].color}
                fill="none"
                strokeWidth="2"
              />
            );
          })}
          {steps > 0 && (
            <line
              x1={x(cursor ?? steps)}
              x2={x(cursor ?? steps)}
              y1={top}
              y2={height - bottom}
              stroke="#f4f7fb"
              strokeOpacity=".35"
              strokeDasharray="3 3"
            />
          )}
          {steps === 0 && (
            <text x="430" y="86" fill="#a6b2c8" fontSize="12" textAnchor="middle">
              Run an optimizer to trace its progress.
            </text>
          )}
        </svg>
      </div>
      <div className="chart-footer">
        <span>
          {log ? 'Signed log₁₀(1 + |value|)' : 'Original objective units'} <span>·</span> Step t
        </span>
        {improvement !== null && steps > 0 && (
          <span className="improvement">
            <ArrowDownRight size={13} />
            {improvement.toFixed(2)}% loss reduction <small>({algorithms[active.algorithm].short})</small>
          </span>
        )}
        <span>
          {runs.length} {runs.length === 1 ? 'optimizer' : 'optimizers'} · budget {config.maxIterations}
        </span>
      </div>
    </section>
  );
}
export function Comparison() {
  const { runs } = useLab();
  return (
    <section className="comparison panel">
      <div className="panel-label">
        EXPERIMENT COMPARISON <span className="tiny-pill">SAME START · SHARED PARAMETERS</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Optimizer</th>
              <th>Final loss</th>
              <th>Best loss</th>
              <th>‖∇f‖</th>
              <th>Steps</th>
              <th>f / ∇f evals</th>
              <th>Compute time*</th>
              <th>Termination</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const s = r.history.at(-1)!,
                best = Math.min(...r.history.map((s) => s.loss));
              return (
                <tr key={r.algorithm}>
                  <th>
                    <i className="legend-dot" style={{ background: algorithms[r.algorithm].color }} />
                    {algorithms[r.algorithm].name}
                  </th>
                  <td>{fmt(s.loss)}</td>
                  <td>{fmt(best)}</td>
                  <td>{fmt(s.gradNorm)}</td>
                  <td>{s.step}</td>
                  <td>
                    {r.evaluations.objective} / {r.evaluations.gradient}
                  </td>
                  <td>{r.runtimeMs.toFixed(2)} ms</td>
                  <td>
                    {r.status === 'running'
                      ? useLab.getState().running
                        ? 'running'
                        : 'paused'
                      : r.status.replaceAll('-', ' ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        *Worker compute time excludes playback and messaging; browser and hardware dependent. A stopped run
        does not certify an optimum.
      </p>
    </section>
  );
}
