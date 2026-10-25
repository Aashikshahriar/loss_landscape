import { lazy, Suspense, useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, BookOpen, Footprints, Mountain, Telescope } from 'lucide-react';
import { objectiveById, objectives } from '../math/objectives';
import { algorithms } from '../math/engine';
import { GraphicsBoundary } from '../components/GraphicsBoundary';
import { Tex } from '../components/Tex';
import { useLab } from '../stores/lab';
import { sampleSurface, terrainColor } from '../visualization/sampling';
import type { Objective2D } from '../types';
const Surface3D = lazy(() => import('../visualization/Surface3D'));
const acts = [
  {
    icon: Mountain,
    act: 'Act I',
    title: 'A landscape',
    tex: String.raw`f : \mathbb{R}^2 \to \mathbb{R}`,
    text: 'Every pair of numbers (x, y) has a height. Low ground means a better answer. Somewhere there is a lowest point, and we want to find it.',
  },
  {
    icon: Telescope,
    act: 'Act II',
    title: 'A compass',
    tex: String.raw`-\nabla f(\theta)`,
    text: 'We cannot see the whole map; it is foggy. But at our feet we can feel the slope. The negative gradient points the way the ground falls fastest.',
  },
  {
    icon: Footprints,
    act: 'Act III',
    title: 'A stride',
    tex: String.raw`\theta_{t+1} = \theta_t - \eta\,\nabla f(\theta_t)`,
    text: 'Take a step of size η in that direction, then feel the slope again. Repeat. Every optimizer is a different opinion about how to take that step.',
  },
];
function Thumbnail({ objective }: { objective: Objective2D }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const data = sampleSurface(objective, 47),
      size = data.n + 1,
      image = ctx.createImageData(size, size);
    for (let j = 0; j < size; j++)
      for (let i = 0; i < size; i++) {
        const [r, g, b] = terrainColor(data.normalized[j * size + i]),
          k = ((size - 1 - j) * size + i) * 4;
        image.data[k] = r * 255;
        image.data[k + 1] = g * 255;
        image.data[k + 2] = b * 255;
        image.data[k + 3] = 255;
      }
    ctx.putImageData(image, 0, 0);
  }, [objective]);
  return <canvas ref={ref} width={48} height={48} aria-hidden="true" />;
}
const open = (id: string) => {
  useLab.getState().setObjective(id);
  location.hash = '/lab';
};
export function Landing() {
  const o = objectiveById('himmelblau');
  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> An open lab for curious minds
          </div>
          <h1>
            Walk through the <em>loss landscape.</em>
          </h1>
          <p>
            Optimization is a story about finding your way down a mountain in the fog. Pick a terrain, drop a
            hiker anywhere, and watch real algorithms feel their way to the bottom, one step at a time.
          </p>
          <div className="hero-buttons">
            <a className="button primary" href="#/lab">
              Launch the lab <ArrowRight size={17} />
            </a>
            <button
              className="button secondary"
              onClick={() => {
                useLab.getState().setObjective('elliptical');
                useLab.getState().configure({ algorithms: ['gd', 'momentum', 'adam'], learningRate: 0.035 });
                location.hash = '/lab';
                useLab.getState().play();
              }}
            >
              Watch a race <PlayIcon />
            </button>
          </div>
          <div className="hero-meta">
            <span>No sign-up</span>
            <i />
            <span>Runs in your browser</span>
            <i />
            <span>Open source</span>
          </div>
        </div>
        <div className="hero-landscape">
          <div className="hero-surface-label">
            <span className="live-dot" />
            Himmelblau’s function <span>four minima · one landscape</span>
          </div>
          <Suspense fallback={<span className="loading-label">Loading landscape…</span>}>
            <GraphicsBoundary
              onFallback={() => {
                useLab.getState().setView('2d');
                location.hash = '/lab';
              }}
            >
              <Surface3D
                objective={o}
                runs={[]}
                cursor={null}
                initial={o.initial}
                grid
                wireframe
                critical={false}
                fit={0}
                onPick={(p) => {
                  useLab.getState().setObjective(o.id);
                  useLab.getState().configure({ initial: p });
                  location.hash = '/lab';
                }}
              />
            </GraphicsBoundary>
          </Suspense>
          <div className="hero-surface-footer">
            <Tex>{o.tex}</Tex>
            <span>Drag to explore · click to begin there</span>
          </div>
        </div>
      </section>
      <div className="landing-divider">
        <span>The whole story in three acts</span>
        <ArrowDown size={16} />
      </div>
      <section className="acts">
        {acts.map((a, i) => (
          <article key={a.title} className="act">
            <div className="act-head">
              <a.icon size={18} />
              <span>{a.act}</span>
              <b>{String(i + 1).padStart(2, '0')}</b>
            </div>
            <h2>{a.title}</h2>
            <Tex block>{a.tex}</Tex>
            <p>{a.text}</p>
          </article>
        ))}
      </section>
      <section className="gallery-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Ten terrains</div>
            <h2>Pick a landscape. Each one has a lesson.</h2>
          </div>
          <p>Every surface is computed from its real formula, with exact gradients and curvature.</p>
        </div>
        <div className="gallery">
          {objectives.map((obj) => (
            <button key={obj.id} className="gallery-card" onClick={() => open(obj.id)}>
              <Thumbnail objective={obj} />
              <span className="gallery-text">
                <b>{obj.name}</b>
                <small>{obj.description}</small>
              </span>
              <ArrowRight size={15} className="gallery-arrow" />
            </button>
          ))}
        </div>
      </section>
      <section className="cast-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">The cast</div>
            <h2>Five hikers, five philosophies.</h2>
          </div>
          <p>Same start, same terrain, independent state. Race up to four of them at once.</p>
        </div>
        <div className="cast">
          {Object.entries(algorithms).map(([id, a]) => (
            <article key={id} className="cast-card" style={{ '--accent': a.color } as React.CSSProperties}>
              <h3>
                <i />
                {a.name}
              </h3>
              <p>{a.persona}</p>
              <div className="cast-eq">
                <Tex>{a.tex}</Tex>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-bottom">
        <div>
          <div className="eyebrow">Built for exploration. Grounded in math.</div>
          <h2>
            Bring your curiosity. <em>We’ll bring the coordinates.</em>
          </h2>
        </div>
        <div className="landing-bottom-actions">
          <a className="button secondary" href="#/learn">
            <BookOpen size={17} />
            Read the story
          </a>
          <a className="button primary" href="#/lab">
            Open the playground <ArrowRight size={16} />
          </a>
        </div>
      </section>
    </main>
  );
}
function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <path d="m4 2 8 5-8 5Z" />
    </svg>
  );
}
