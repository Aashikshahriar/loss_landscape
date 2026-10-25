import { Canvas } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { algorithms } from '../math/engine';
import type { Objective2D, Run, Vec } from '../types';
import { inDomain, sampleSurface, terrainColor } from './sampling';
import { palette, useTheme } from '../stores/theme';
interface Props {
  objective: Objective2D;
  runs: Run[];
  cursor: number | null;
  initial: Vec;
  wireframe: boolean;
  grid: boolean;
  critical: boolean;
  onPick: (p: Vec) => void;
  onHover?: (p: Vec | null) => void;
  fit: number;
}
function Label({
  text,
  position,
  width = 0.42,
  color,
}: {
  text: string;
  position: [number, number, number];
  width?: number;
  color: string;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '500 40px "JetBrains Mono Variable", monospace';
    canvas.width = Math.ceil(ctx.measureText(text).width) + 22;
    ctx.fillStyle = color;
    ctx.font = '500 40px "JetBrains Mono Variable", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, 32);
    return new THREE.CanvasTexture(canvas);
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite
      position={position}
      scale={[width, (width * texture.image.height) / texture.image.width, 1]}
      raycast={() => null}
    >
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}
function Terrain({
  objective: o,
  wireframe,
  onPick,
  onHover,
  wire,
}: Pick<Props, 'objective' | 'wireframe' | 'onPick' | 'onHover'> & { wire: string }) {
  const data = useMemo(() => sampleSurface(o), [o]);
  const geometry = useMemo(() => {
    const n = data.n,
      positions: number[] = [],
      colors: number[] = [],
      indices: number[] = [];
    const color = new THREE.Color();
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++) {
        const t = data.normalized[j * (n + 1) + i];
        positions.push((i / n) * 6 - 3, t * 2.8, 3 - (j / n) * 6);
        color.setRGB(...terrainColor(t), THREE.SRGBColorSpace);
        colors.push(color.r, color.g, color.b);
        if (i < n && j < n) {
          const a = j * (n + 1) + i;
          indices.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1);
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [data]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const coord = (p: THREE.Vector3): Vec => [
    o.domain.x[0] + ((p.x + 3) / 6) * (o.domain.x[1] - o.domain.x[0]),
    o.domain.y[0] + ((3 - p.z) / 6) * (o.domain.y[1] - o.domain.y[0]),
  ];
  return (
    <group>
      <mesh
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta < 5) onPick(coord(e.point));
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          onHover?.(coord(e.point));
        }}
        onPointerOut={() => onHover?.(null)}
      >
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.85}
          metalness={0.05}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      {wireframe && (
        <mesh geometry={geometry} raycast={() => null}>
          <meshBasicMaterial color={wire} wireframe transparent opacity={0.14} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
function Scene(p: Props) {
  const data = useMemo(() => sampleSurface(p.objective), [p.objective]);
  const { objective: o } = p;
  const theme = useTheme((t) => t.theme),
    ink = palette[theme];
  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[-4, 9, 5]} intensity={1.6} />
      <directionalLight position={[5, 2, -5]} color="#b1b0ff" intensity={0.65} />
      {p.grid && (
        <gridHelper key={theme} args={[7.2, 16, ink.grid, ink.gridMinor]} position={[0, -0.07, 0]} />
      )}
      <Terrain objective={o} wireframe={p.wireframe} onPick={p.onPick} onHover={p.onHover} wire={ink.wire} />
      <Line
        points={[
          [-3.5, 0, -3.5],
          [-3.5, 0, 3.5],
          [3.5, 0, 3.5],
        ]}
        color={ink.axis}
        lineWidth={1}
      />
      {[-1, 0, 1].map((k) => (
        <group key={k}>
          <Label
            position={[k * 3, -0.03, 3.65]}
            width={0.55}
            color={ink.muted}
            text={(o.domain.x[0] + ((k + 1) / 2) * (o.domain.x[1] - o.domain.x[0])).toFixed(1)}
          />
          <Label
            position={[-3.8, -0.03, -k * 3]}
            width={0.55}
            color={ink.muted}
            text={(o.domain.y[0] + ((k + 1) / 2) * (o.domain.y[1] - o.domain.y[0])).toFixed(1)}
          />
        </group>
      ))}
      <Label position={[0, -0.1, 4.15]} text="x" width={0.3} color={ink.text} />
      <Label position={[-4.15, 0, 0]} text="y" width={0.3} color={ink.text} />
      {inDomain(o, p.initial) && (
        <mesh position={data.world(p.initial)} raycast={() => null}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      {inDomain(o, p.initial) && (
        <mesh position={data.world(p.initial)} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.1, 0.13, 32]} />
          <meshBasicMaterial color={ink.start} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
      )}
      {p.critical &&
        o.knownCriticalPoints.map((point, i) => (
          <group key={i} position={data.world([point.x, point.y])}>
            <mesh raycast={() => null}>
              <sphereGeometry args={[0.045, 12, 12]} />
              <meshBasicMaterial color={ink.marker} />
            </mesh>
            <Label
              position={[0, 0.22, 0]}
              width={2}
              color={ink.marker}
              text={`${point.type} (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`}
            />
          </group>
        ))}
      {p.runs.map((run) => {
        const all = run.history.slice(0, (p.cursor ?? run.history.length - 1) + 1);
        const segments: Vec[][] = [];
        let seg: Vec[] = [];
        for (const s of all) {
          if (inDomain(o, s.theta)) {
            seg.push(s.theta);
          } else if (seg.length) {
            segments.push(seg);
            seg = [];
          }
        }
        if (seg.length) segments.push(seg);
        const current = all.at(-1);
        const color = algorithms[run.algorithm].color;
        return (
          <group key={run.algorithm}>
            {segments
              .filter((s) => s.length > 1)
              .map((s, i) => (
                <Line key={i} points={s.map(data.world)} color={color} lineWidth={3} />
              ))}
            {current && inDomain(o, current.theta) && (
              <mesh position={data.world(current.theta)} raycast={() => null}>
                <sphereGeometry args={[0.085, 20, 20]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
              </mesh>
            )}
          </group>
        );
      })}
      <OrbitControls
        key={p.fit}
        makeDefault
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.8, 0]}
        enableDamping={false}
      />
    </>
  );
}
export default function Surface3D(props: Props) {
  return (
    <Canvas
      key={props.fit}
      frameloop="demand"
      camera={{ position: [7.4, 6.3, 8.2], fov: 43 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }}
      dpr={[1, 1.75]}
      onCreated={({ gl }) => {
        gl.domElement.dataset.landscape = 'true';
        gl.setClearColor('#000000', 0);
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
