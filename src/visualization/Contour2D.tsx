import { contours } from 'd3-contour';
import { useEffect, useMemo, useRef, useState } from 'react';
import { algorithms } from '../math/engine';
import type { Objective2D, Run, Vec } from '../types';
import { inDomain, sampleSurface, terrainColor } from './sampling';
interface Props {
  objective: Objective2D;
  runs: Run[];
  cursor: number | null;
  initial: Vec;
  critical: boolean;
  vectors: boolean;
  grid: boolean;
  onPick: (p: Vec) => void;
  onHover: (p: Vec | null) => void;
}
export default function Contour2D({
  objective: o,
  runs,
  cursor,
  initial,
  critical,
  vectors,
  grid,
  onPick,
  onHover,
}: Props) {
  const data = useMemo(() => sampleSurface(o, 80), [o]);
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState<Vec>([0, 0]);
  const drag = useRef<Vec | null>(null),
    svgRef = useRef<SVGSVGElement>(null),
    [probe, setProbe] = useState<Vec | null>(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // Registered natively so the page does not scroll while zooming the map.
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.max(1, Math.min(8, z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))));
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, []);
  const paths = useMemo(
    () =>
      contours()
        .size([81, 81])
        .thresholds(Array.from({ length: 22 }, (_, i) => i / 22))(data.normalized)
        .map((c) => ({
          level: c.value,
          path: c.coordinates
            .map((poly) =>
              poly
                .map(
                  (ring) =>
                    'M' +
                    ring
                      .map(([x, y]) => `${50 + ((x - 0.5) / 80) * 500},${450 - ((y - 0.5) / 80) * 400}`)
                      .join('L') +
                    'Z',
                )
                .join(''),
            )
            .join(''),
        })),
    [data],
  );
  const point = (p: Vec): Vec => [
    50 + ((p[0] - o.domain.x[0]) / (o.domain.x[1] - o.domain.x[0])) * 500,
    450 - ((p[1] - o.domain.y[0]) / (o.domain.y[1] - o.domain.y[0])) * 400,
  ];
  const getPoint = (e: React.PointerEvent<SVGSVGElement>): Vec => {
    const svg = e.currentTarget,
      pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const x = (p.x - 300 - pan[0]) / zoom + 300,
      y = (p.y - 250 - pan[1]) / zoom + 250;
    return [
      o.domain.x[0] + ((x - 50) / 500) * (o.domain.x[1] - o.domain.x[0]),
      o.domain.y[0] + ((450 - y) / 400) * (o.domain.y[1] - o.domain.y[0]),
    ];
  };
  return (
    <div className="contour-view">
      <div className="contour-zoom">
        <button aria-label="Zoom into contour" onClick={() => setZoom((z) => Math.min(z * 1.3, 5))}>
          +
        </button>
        <button aria-label="Zoom out of contour" onClick={() => setZoom((z) => Math.max(z / 1.3, 1))}>
          −
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan([0, 0]);
          }}
        >
          Fit
        </button>
      </div>
      <svg
        id="contour-chart"
        ref={svgRef}
        viewBox="0 0 600 500"
        role="img"
        aria-label="Objective contour map. Click to choose a starting point; hold Shift and drag to pan."
        onPointerDown={(e) => {
          if (e.shiftKey) {
            drag.current = [e.clientX, e.clientY];
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        }}
        onPointerUp={(e) => {
          if (drag.current) {
            drag.current = null;
            return;
          }
          const p = getPoint(e);
          if (inDomain(o, p)) onPick(p);
        }}
        onPointerMove={(e) => {
          if (drag.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            setPan((p) => [
              p[0] + ((e.clientX - drag.current![0]) * 600) / rect.width,
              p[1] + ((e.clientY - drag.current![1]) * 500) / rect.height,
            ]);
            drag.current = [e.clientX, e.clientY];
            return;
          }
          const p = getPoint(e);
          onHover(inDomain(o, p) ? p : null);
          setProbe(inDomain(o, p) ? p : null);
        }}
        onPointerLeave={() => {
          onHover(null);
          setProbe(null);
        }}
      >
        <defs>
          <clipPath id="contour-clip">
            <rect x="50" y="50" width="500" height="400" />
          </clipPath>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto"
          >
            <path d="M0,0L10,5L0,10" fill="#e0e6ff" />
          </marker>
          <marker
            id="probe-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0,0L10,5L0,10" fill="#ffffff" />
          </marker>
        </defs>
        <g clipPath="url(#contour-clip)">
          <rect x="50" y="50" width="500" height="400" fill="#123542" />
          <g transform={`translate(${300 + pan[0]},${250 + pan[1]}) scale(${zoom}) translate(-300,-250)`}>
            {paths.map((c, i) => {
              const rgb = terrainColor(c.level).map((v) => Math.round(v * 255));
              return (
                <path
                  key={i}
                  d={c.path}
                  fill={`rgb(${rgb.join(',')})`}
                  stroke="#101c32"
                  strokeOpacity=".45"
                  strokeWidth=".65"
                  fillRule="evenodd"
                />
              );
            })}
            {vectors &&
              Array.from({ length: 100 }, (_, i) => {
                const x = o.domain.x[0] + (((i % 10) + 0.5) / 10) * (o.domain.x[1] - o.domain.x[0]),
                  y = o.domain.y[0] + ((Math.floor(i / 10) + 0.5) / 10) * (o.domain.y[1] - o.domain.y[0]);
                const [px, py] = point([x, y]),
                  g = o.gradient(new Float64Array([x, y])),
                  norm = Math.hypot(...g) || 1;
                return (
                  <line
                    key={i}
                    x1={px}
                    y1={py}
                    x2={px - (g[0] / norm) * 14}
                    y2={py + (g[1] / norm) * 14}
                    stroke="#e0e6ff"
                    strokeOpacity=".55"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
            {critical &&
              o.knownCriticalPoints.map((c, i) => {
                const [x, y] = point([c.x, c.y]);
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="#ffd49a" />
                    <text x={x + 7} y={y - 6} fill="#fff0d9" fontSize="9">
                      {c.type}
                    </text>
                  </g>
                );
              })}
            {runs.map((r) => {
              const history = r.history.slice(0, (cursor ?? r.history.length - 1) + 1),
                last = history.at(-1)!,
                color = algorithms[r.algorithm].color;
              let d = '',
                previous = false;
              for (const s of history) {
                const valid = inDomain(o, s.theta);
                if (valid) {
                  d += (previous ? 'L' : 'M') + point(s.theta).join(',');
                }
                previous = valid;
              }
              const [x, y] = point(last.theta);
              return (
                <g key={r.algorithm}>
                  <path d={d} fill="none" stroke="#0a0f1e" strokeOpacity=".45" strokeWidth="5" />
                  <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
                  {inDomain(o, last.theta) && (
                    <circle cx={x} cy={y} r="5" fill={color} stroke="#fff" strokeWidth="1.2" />
                  )}
                </g>
              );
            })}
            {inDomain(o, initial) && (
              <g>
                <circle
                  cx={point(initial)[0]}
                  cy={point(initial)[1]}
                  r="7"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
                <circle cx={point(initial)[0]} cy={point(initial)[1]} r="2.5" fill="#fff" />
              </g>
            )}
            {probe && <ProbeArrow from={point(probe)} g={o.gradient(new Float64Array(probe))} />}
          </g>
        </g>
        {Array.from({ length: 5 }, (_, i) => {
          const x = 50 + i * 125,
            y = 450 - i * 100;
          const dataX =
              o.domain.x[0] +
              (((x - 300 - pan[0]) / zoom + 300 - 50) / 500) * (o.domain.x[1] - o.domain.x[0]),
            dataY =
              o.domain.y[0] +
              ((450 - ((y - 250 - pan[1]) / zoom + 250)) / 400) * (o.domain.y[1] - o.domain.y[0]);
          return (
            <g key={i}>
              {grid && (
                <>
                  <line x1={x} x2={x} y1="50" y2="450" stroke="#ffffff" strokeOpacity=".14" />
                  <line x1="50" x2="550" y1={y} y2={y} stroke="#ffffff" strokeOpacity=".14" />
                </>
              )}
              <text x={x} y="473" className="axis-text" textAnchor="middle">
                {dataX.toFixed(1)}
              </text>
              <text x="38" y={y + 3} className="axis-text" textAnchor="end">
                {dataY.toFixed(1)}
              </text>
            </g>
          );
        })}
        <text x="300" y="495" textAnchor="middle" className="axis-title">
          x
        </text>
        <text x="38" y="38" textAnchor="end" className="axis-title">
          y
        </text>
      </svg>
    </div>
  );
}

function ProbeArrow({ from, g }: { from: Vec; g: Float64Array }) {
  const norm = Math.hypot(g[0], g[1]);
  if (!(norm > 0) || !Number.isFinite(norm)) return null;
  const length = 34;
  return (
    <g className="probe" pointerEvents="none">
      <circle cx={from[0]} cy={from[1]} r="3" fill="#fff" />
      <line
        x1={from[0]}
        y1={from[1]}
        x2={from[0] - (g[0] / norm) * length}
        y2={from[1] + (g[1] / norm) * length}
        stroke="#fff"
        strokeWidth="2"
        markerEnd="url(#probe-arrow)"
      />
    </g>
  );
}
