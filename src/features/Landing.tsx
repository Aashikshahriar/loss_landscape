import { lazy, Suspense } from 'react';
import { ArrowDown, ArrowRight, Box, Braces, GitCompareArrows, Microscope, MoveUpRight } from 'lucide-react';
import { objectiveById } from '../math/objectives';
import { GraphicsBoundary } from '../components/GraphicsBoundary';
import { useLab } from '../stores/lab';
const Surface3D = lazy(() => import('../visualization/Surface3D'));
export function Landing() {
  const o = objectiveById('himmelblau');
  return (
    <main className="landing">
      <div className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> AN OPEN LAB FOR CURIOUS MINDS
          </div>
          <h1>
            Walk through
            <br />
            the <em>loss landscape.</em>
          </h1>
          <p>
            Optimization is more than an equation.
            <br />
            Explore the terrain, follow the steps, and see
            <br className="desktop-break" /> how algorithms find their way.
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
              Try a demo <PlayIcon />
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
            HIMMELBLAU’S FUNCTION <span>04 MINIMA · ONE LANDSCAPE</span>
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
            <span>Drag to explore. Click to begin.</span>
            <span>Log-normalized height</span>
          </div>
        </div>
      </div>
      <div className="landing-divider">
        <span>A DIFFERENT WAY TO UNDERSTAND OPTIMIZATION</span>
        <ArrowDown size={17} />
      </div>
      <section className="feature-grid">
        <article>
          <Box />
          <span>01 / EXPLORE</span>
          <h2>Make the abstract tangible.</h2>
          <p>
            Ten mathematical landscapes, from a simple bowl to winding valleys. Every surface is computed from
            its real objective.
          </p>
        </article>
        <article>
          <GitCompareArrows />
          <span>02 / COMPARE</span>
          <h2>Same start. Different paths.</h2>
          <p>
            Watch gradient descent, Momentum, RMSProp, and Adam navigate identical terrain with independent
            state.
          </p>
        </article>
        <article>
          <Microscope />
          <span>03 / UNDERSTAND</span>
          <h2>Every update, under the lens.</h2>
          <p>
            Inspect gradients, curvature, and internal moments. Rewind a run and understand what happened at
            each step.
          </p>
        </article>
      </section>
      <section className="landing-bottom">
        <div>
          <div className="eyebrow">BUILT FOR EXPLORATION. GROUNDED IN MATH.</div>
          <h2>
            Bring your curiosity.
            <br />
            We’ll bring the coordinates.
          </h2>
        </div>
        <a className="button secondary" href="#/learn">
          <Braces size={17} />
          Read the math <MoveUpRight size={16} />
        </a>
      </section>
    </main>
  );
}
function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="m4 2 8 5-8 5Z" />
    </svg>
  );
}
