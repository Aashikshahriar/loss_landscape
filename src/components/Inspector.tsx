import { Activity, ArrowDownRight, Info, Microscope } from 'lucide-react';
import { useCurrent, useLab } from '../stores/lab';
import { classification, eigenvalues, objectiveById } from '../math/objectives';
import { algorithms } from '../math/engine';
import { inDomain } from '../visualization/sampling';
export const fmt = (n: number) =>
  !Number.isFinite(n)
    ? 'non-finite'
    : Math.abs(n) < 0.0001 && n !== 0
      ? n.toExponential(3)
      : Math.abs(n) > 10000
        ? n.toExponential(3)
        : n.toFixed(5);
export function Inspector() {
  const { sample: s, run } = useCurrent();
  const { config: c, runs, activeAlgorithm, setAlgorithm, running, cursor } = useLab();
  const o = objectiveById(c.objective),
    e = eigenvalues(o.hessian(new Float64Array(s.theta)));
  const status =
    cursor !== null
      ? 'History'
      : running
        ? 'Running'
        : run.status === 'ready'
          ? 'Ready'
          : run.status === 'running'
            ? 'Paused'
            : run.status.replaceAll('-', ' ');
  return (
    <aside className="inspector panel" aria-label="Numerical inspector">
      <div className="panel-label">
        <Microscope size={15} />
        OPTIMIZATION MICROSCOPE
      </div>
      <div className="inspector-inner">
        <div className="inspector-state">
          <span className={'state-badge ' + (running ? 'is-running' : '')}>
            <i />
            {status}
          </span>
          <span className="step-badge">t = {s.step}</span>
        </div>
        {runs.length > 1 && (
          <label className="field">
            <span>Inspect optimizer</span>
            <select
              value={activeAlgorithm}
              onChange={(e) => setAlgorithm(e.target.value as typeof activeAlgorithm)}
            >
              {runs.map((r) => (
                <option key={r.algorithm} value={r.algorithm}>
                  {algorithms[r.algorithm].name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="loss-metric">
          <span>
            Objective value <span className="math-label">f(θ)</span>
          </span>
          <strong>{fmt(s.loss)}</strong>
          <small>At the selected recorded step</small>
        </div>
        <div className="inspector-section">
          <h3>
            POSITION <span>θₜ</span>
          </h3>
          <dl className="metrics">
            <div>
              <dt>
                <i className="coord-dot violet" />x
              </dt>
              <dd>{fmt(s.theta[0])}</dd>
            </div>
            <div>
              <dt>
                <i className="coord-dot cyan" />y
              </dt>
              <dd>{fmt(s.theta[1])}</dd>
            </div>
          </dl>
        </div>
        <div className="inspector-section">
          <h3>
            <Activity size={13} /> GRADIENT <span>∇f(θₜ)</span>
          </h3>
          <dl className="metrics">
            <div>
              <dt>∂f / ∂x</dt>
              <dd>{fmt(s.gradient[0])}</dd>
            </div>
            <div>
              <dt>∂f / ∂y</dt>
              <dd>{fmt(s.gradient[1])}</dd>
            </div>
            <div className="metric-total">
              <dt>Gradient norm</dt>
              <dd>{fmt(s.gradNorm)}</dd>
            </div>
          </dl>
        </div>
        <div className="inspector-section">
          <h3>
            <ArrowDownRight size={13} /> LAST UPDATE <span>Δθₜ</span>
          </h3>
          <dl className="metrics">
            <div>
              <dt>Δx</dt>
              <dd>{fmt(s.update[0])}</dd>
            </div>
            <div>
              <dt>Δy</dt>
              <dd>{fmt(s.update[1])}</dd>
            </div>
            <div className="metric-total">
              <dt>Step norm</dt>
              <dd>{fmt(s.updateNorm)}</dd>
            </div>
            <div>
              <dt>Learning rate</dt>
              <dd>{s.learningRate.toPrecision(4)}</dd>
            </div>
          </dl>
          <VectorDiagram gradient={s.oracleGradient} update={s.update} />
        </div>
        <div className="inspector-section">
          <h3>
            LOCAL CURVATURE <span>H(θₜ)</span>
          </h3>
          <dl className="metrics">
            <div>
              <dt>λ min</dt>
              <dd className={e[0] < 0 ? 'warning-text' : ''}>{fmt(e[0])}</dd>
            </div>
            <div>
              <dt>λ max</dt>
              <dd>{fmt(e[1])}</dd>
            </div>
          </dl>
          <p className="curvature-note">{classification(s.gradNorm, e)}</p>
        </div>
        {(run.algorithm === 'adam' || run.algorithm === 'momentum' || run.algorithm === 'rmsprop') && (
          <details className="internal-details">
            <summary>Optimizer internals</summary>
            <p>m = [{s.moments.m.map(fmt).join(', ')}]</p>
            <p>v = [{s.moments.v.map(fmt).join(', ')}]</p>
            <small>Raw moments; the last update used the gradient at θₜ₋₁.</small>
          </details>
        )}
        {!inDomain(o, s.theta) && (
          <div className="warning-note">
            The current point is outside the displayed domain. Optimization is not clamped.
          </div>
        )}
        {run.status === 'non-finite' && (
          <div className="warning-note">
            A non-finite update stopped this run. The last finite state is shown. Try a smaller learning rate.
          </div>
        )}
        {run.status.includes('tolerance') && (
          <div className="info-note">A stopping tolerance was met. This does not certify optimality.</div>
        )}
        <div className="inspector-footnote">
          <Info size={13} />
          <span>
            Real computations. Float64 state.
            <br />
            No convergence guarantees.
          </span>
        </div>
      </div>
    </aside>
  );
}
function VectorDiagram({ gradient: g, update: u }: { gradient: number[]; update: number[] }) {
  const norm = Math.hypot(...g) || 1,
    unorm = Math.hypot(...u) || 1;
  return (
    <div className="vector-diagram">
      <svg
        viewBox="0 0 160 60"
        aria-label="Normalized negative oracle gradient used for the last update, and that update direction"
      >
        <path d="M80 3V57M12 30H148" stroke="#273246" />
        <path d={`M80 30l${(-g[0] / norm) * 25} ${(g[1] / norm) * 25}`} stroke="#a99aff" strokeWidth="2" />
        <circle cx={80 - (g[0] / norm) * 25} cy={30 + (g[1] / norm) * 25} r="2" fill="#a99aff" />
        <path d={`M80 30l${(u[0] / unorm) * 23} ${(-u[1] / unorm) * 23}`} stroke="#3edbd0" strokeWidth="2" />
        <circle cx={80 + (u[0] / unorm) * 23} cy={30 - (u[1] / unorm) * 23} r="2" fill="#3edbd0" />
      </svg>
      <span>
        <i className="violet" />
        −∇f <i className="cyan" />
        Δθ <small>last update · unit directions</small>
      </span>
    </div>
  );
}
