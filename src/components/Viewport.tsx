import { lazy, Suspense, useState } from 'react';
import {
  Box,
  Camera,
  Crosshair,
  Expand,
  Grid2X2,
  Layers,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from 'lucide-react';
import { useLab } from '../stores/lab';
import { objectiveById } from '../math/objectives';
import { algorithms } from '../math/engine';
import { download } from '../services/experiments';
import type { Vec } from '../types';
import { GraphicsBoundary } from './GraphicsBoundary';
const Surface3D = lazy(() => import('../visualization/Surface3D'));
const Contour2D = lazy(() => import('../visualization/Contour2D'));
export function Viewport() {
  const {
    config: c,
    runs,
    cursor,
    view,
    setView,
    configure,
    running,
    play,
    pause,
    advance,
    reset,
    speed,
    setSpeed,
    setCursor,
    notify,
  } = useLab();
  const o = objectiveById(c.objective);
  const [wireframe, setWireframe] = useState(true),
    [grid, setGrid] = useState(true),
    [critical, setCritical] = useState(false),
    [vectors, setVectors] = useState(false),
    [fit, setFit] = useState(0),
    [hover, setHover] = useState<Vec | null>(null);
  const steps = Math.max(...runs.map((r) => r.history.length - 1));
  const current = cursor ?? steps;
  const pick = (p: Vec) => configure({ initial: p.map((v) => Number(v.toFixed(4))) as Vec });
  const png = () => {
    const source = document.querySelector<HTMLCanvasElement>('canvas[data-landscape]');
    if (!source) {
      notify('Switch to 3D to export a surface PNG.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = source.width * 2;
    canvas.height = source.height * 2 + 140;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0d121e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 70, canvas.width, canvas.height - 140);
    ctx.fillStyle = '#f4f7fb';
    ctx.font = '28px sans-serif';
    ctx.fillText(`OptimizationLand · ${o.name}`, 30, 42);
    ctx.font = '18px monospace';
    ctx.fillStyle = '#bfc8df';
    ctx.fillText(
      `Step ${current} · height: log-normalized · ${c.algorithms.map((a) => algorithms[a].short).join(' / ')}`,
      30,
      canvas.height - 30,
    );
    canvas.toBlob((b) => {
      if (b) download(b, 'image/png', 'optimizationland-surface.png');
    });
  };
  return (
    <section className="viewport panel" aria-label="Landscape visualization">
      <div className="viewport-toolbar">
        <div className="view-tabs" role="group" aria-label="Visualization type">
          <button className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}>
            <Box size={14} />
            3D surface
          </button>
          <button className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}>
            <Layers size={14} />
            2D contours
          </button>
        </div>
        <div className="viewport-actions">
          <button title="Export 3D PNG" aria-label="Export 3D PNG" onClick={png}>
            <Camera size={15} />
          </button>
          <button title="Fit view" aria-label="Fit view" onClick={() => setFit((n) => n + 1)}>
            <Expand size={15} />
          </button>
          <button
            title="Fullscreen landscape"
            aria-label="Fullscreen landscape"
            onClick={(e) => {
              const element = e.currentTarget.closest('.viewport');
              if (document.fullscreenElement) {
                void document.exitFullscreen();
              } else {
                void element
                  ?.requestFullscreen()
                  .catch(() => notify('Fullscreen is unavailable in this browser.'));
              }
            }}
          >
            <Maximize size={14} />
          </button>
        </div>
      </div>
      <div className="landscape-stage">
        <div className="stage-heading">
          <div>
            <span className="live-dot" />
            LIVE LANDSCAPE
          </div>
          <h2>{o.name}</h2>
          <p>
            f(x, y) <span>→</span> ℝ
          </p>
        </div>
        <div className="surface-options">
          <button
            className={grid ? 'active' : ''}
            title="Toggle grid"
            aria-label="Toggle grid"
            aria-pressed={grid}
            onClick={() => setGrid(!grid)}
          >
            <Grid2X2 size={15} />
          </button>
          <button
            className={critical ? 'active' : ''}
            title="Show known critical points"
            aria-label="Show known critical points"
            aria-pressed={critical}
            onClick={() => setCritical(!critical)}
          >
            <Crosshair size={15} />
          </button>
          {view === '3d' ? (
            <button
              className={wireframe ? 'active' : ''}
              title="Toggle wireframe"
              aria-label="Toggle wireframe"
              aria-pressed={wireframe}
              onClick={() => setWireframe(!wireframe)}
            >
              <Box size={15} />
            </button>
          ) : (
            <button
              className={vectors ? 'active' : ''}
              title="Negative gradient field"
              aria-label="Negative gradient field"
              aria-pressed={vectors}
              onClick={() => setVectors(!vectors)}
            >
              ∇
            </button>
          )}
        </div>
        <Suspense fallback={<div className="graphics-fallback">Loading visualization…</div>}>
          {view === '3d' ? (
            <GraphicsBoundary onFallback={() => setView('2d')}>
              <Surface3D
                objective={o}
                runs={runs}
                cursor={cursor}
                initial={c.initial}
                wireframe={wireframe}
                grid={grid}
                critical={critical}
                onPick={pick}
                onHover={setHover}
                fit={fit}
              />
            </GraphicsBoundary>
          ) : (
            <Contour2D
              key={c.objective + fit}
              objective={o}
              runs={runs}
              cursor={cursor}
              initial={c.initial}
              critical={critical}
              vectors={vectors}
              grid={grid}
              onPick={pick}
              onHover={setHover}
            />
          )}
        </Suspense>
        <div className="stage-legend">
          {runs.map((r) => (
            <span key={r.algorithm}>
              <i style={{ background: algorithms[r.algorithm].color }} />
              {algorithms[r.algorithm].short}
            </span>
          ))}
          <span className="initial-legend">
            <i />
            Start point
          </span>
        </div>
        <div className="scale-legend">
          <span>HIGH</span>
          <i />
          <span>LOW</span>
        </div>
        <div className="stage-caption">
          {hover ? (
            <code>
              x {hover[0].toFixed(3)} · y {hover[1].toFixed(3)} · f{' '}
              {o.value(new Float64Array(hover)).toPrecision(4)}
            </code>
          ) : (
            <span>
              {view === '3d'
                ? 'Drag to orbit · Scroll to zoom · Click to set start'
                : 'Click to set start · Shift + drag to pan'}
            </span>
          )}
          <span className="render-note">Log-normalized {view === '3d' ? 'height' : 'color'}</span>
        </div>
      </div>
      <div className="playback">
        <div className="playback-buttons">
          <button
            className="run-button"
            onClick={running ? pause : play}
            aria-label={running ? 'Pause simulation' : 'Run simulation'}
          >
            {running ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            {running ? 'Pause' : 'Run'}
          </button>
          <button
            className="icon-button"
            onClick={() => {
              pause();
              advance(1);
            }}
            title="Single step"
            aria-label="Single step"
          >
            <SkipForward size={17} />
          </button>
          <button
            className="icon-button"
            onClick={reset}
            title="Reset experiment"
            aria-label="Reset experiment"
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <div className="step-progress">
          <span>
            STEP <b>{current.toLocaleString()}</b>
            <small>/ {c.maxIterations.toLocaleString()}</small>
          </span>
          <input
            type="range"
            aria-label="Recorded step"
            min="0"
            max={Math.max(steps, 1)}
            value={current}
            disabled={steps === 0}
            onChange={(e) => setCursor(Number(e.target.value))}
          />
        </div>
        <label className="speed-select">
          <span>Speed</span>
          <select
            aria-label="Playback speed"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            <option value="1">1×</option>
            <option value="5">5×</option>
            <option value="20">20×</option>
          </select>
        </label>
      </div>
    </section>
  );
}
