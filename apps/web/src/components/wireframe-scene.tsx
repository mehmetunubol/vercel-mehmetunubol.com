"use client";

/* eslint-disable react/no-unknown-property --
 * react-three-fiber renders three.js objects as JSX intrinsics (attach,
 * args, ...) that aren't real DOM attributes — this rule doesn't know
 * about R3F's custom reconciler. */
import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export const FORMATIONS = ["about", "experience", "skills", "projects", "contact"] as const;
export type Formation = (typeof FORMATIONS)[number];

interface Profile {
  amplitude: number;
  frequency: number;
  scale: [number, number, number];
  rotationSpeed: number;
}

// Base scale is bilateral/ellipsoid (wider than tall, shallower front-to-
// back) to read as a brain silhouette rather than a generic sphere; each
// profile's `scale` multiplies on top of that base.
const BASE_SCALE: [number, number, number] = [1.35, 1.05, 1.1];

const PROFILES: Record<Formation, Profile> = {
  about: { amplitude: 0.22, frequency: 2.2, scale: [1, 1, 1], rotationSpeed: 0.1 },
  experience: { amplitude: 0.16, frequency: 2.8, scale: [0.85, 1.25, 0.85], rotationSpeed: 0.07 },
  skills: { amplitude: 0.3, frequency: 4.2, scale: [1.05, 1.05, 1.05], rotationSpeed: 0.16 },
  projects: { amplitude: 0.24, frequency: 1.8, scale: [1.2, 1.2, 1.2], rotationSpeed: 0.05 },
  contact: { amplitude: 0.03, frequency: 1.4, scale: [0.75, 0.75, 0.75], rotationSpeed: 0.25 },
};

const DAMPING = 0.03;
const SYNAPSE_COUNT = 26;
const SIGNAL_DISTANCE = 1.1;
const MAX_SIGNALS = 20;
// Overall shape grows continuously with scroll depth, independent of the
// discrete per-section formation morph — small at the top of the page,
// largest by the bottom.
const SCROLL_MIN_GROWTH = 0.55;
const SCROLL_MAX_GROWTH = 1.25;
const SCROLL_DAMPING = 0.05;
// Fewer concurrent signals + a cooldown gap between each one's firings
// lowers how many launch per second; short duration keeps each individual
// signal fast once it does fire.
const ACTIVE_SIGNAL_COUNT = 5;
const SEGMENT_LENGTH = 0.12;

interface ActiveSignal {
  from: number;
  to: number;
  start: number;
  duration: number;
}

function respawnSignal(indices: number[], t: number, sig: ActiveSignal) {
  let from = sig.from;
  let to = sig.to;
  // Pick a fresh, different pair each time a signal completes its run —
  // firing between varying nodes rather than looping the same connection.
  while (from === to || (from === sig.from && to === sig.to)) {
    from = indices[Math.floor(Math.random() * indices.length)]!;
    to = indices[Math.floor(Math.random() * indices.length)]!;
  }
  sig.from = from;
  sig.to = to;
  // `start` is delayed by a cooldown gap (this is what actually lowers
  // signals-per-second) separate from `duration`, which stays short so
  // each signal travels quickly once it does launch.
  sig.start = t + 0.5 + Math.random() * 1.8;
  sig.duration = 0.22 + Math.random() * 0.18;
}

function WireframeSolid({ activeFormation }: { activeFormation: Formation }) {
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(2, 5), []);
  const basePositions = useMemo(
    () => geometry.attributes.position!.array.slice() as Float32Array,
    [geometry],
  );
  const normals = useMemo(
    () => geometry.attributes.normal!.array.slice() as Float32Array,
    [geometry],
  );
  const vertexCount = basePositions.length / 3;

  // A random subset of vertices lit up as bright "synapse" points, plus
  // pulses that travel along the nearby pairs among them — signals firing
  // across the surface rather than a uniformly bright mesh.
  const synapseIndices = useMemo(() => {
    const picked = new Set<number>();
    while (picked.size < Math.min(SYNAPSE_COUNT, vertexCount)) {
      picked.add(Math.floor(Math.random() * vertexCount));
    }
    return Array.from(picked);
  }, [vertexCount]);

  const signalPairs = useMemo(() => {
    const pairs: [number, number][] = [];
    for (let a = 0; a < synapseIndices.length && pairs.length < MAX_SIGNALS; a++) {
      const ia = synapseIndices[a]!;
      const ax = basePositions[ia * 3]!;
      const ay = basePositions[ia * 3 + 1]!;
      const az = basePositions[ia * 3 + 2]!;
      for (let b = a + 1; b < synapseIndices.length && pairs.length < MAX_SIGNALS; b++) {
        const ib = synapseIndices[b]!;
        const dx = ax - basePositions[ib * 3]!;
        const dy = ay - basePositions[ib * 3 + 1]!;
        const dz = az - basePositions[ib * 3 + 2]!;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < SIGNAL_DISTANCE) {
          pairs.push([ia, ib]);
        }
      }
    }
    return pairs;
  }, [synapseIndices, basePositions]);

  const synapseSizes = useMemo(
    () => new Float32Array(synapseIndices.length).fill(1),
    [synapseIndices],
  );

  // A rotating pool of signals, each firing between a fresh random pair of
  // synapse nodes on completion — not a fixed set of connections looping
  // the same source/destination forever.
  const activeSignals = useMemo<ActiveSignal[]>(() => {
    const count = Math.min(ACTIVE_SIGNAL_COUNT, synapseIndices.length);
    const signals: ActiveSignal[] = [];
    for (let i = 0; i < count; i++) {
      const sig: ActiveSignal = { from: -1, to: -1, start: 0, duration: 1 };
      respawnSignal(synapseIndices, -Math.random() * 2, sig);
      signals.push(sig);
    }
    return signals;
  }, [synapseIndices]);

  // Soft glowing rounded-rectangle sprite (not a circle) so points render
  // as small rounded squares with a gentle halo, instead of the default
  // hard-edged square point sprite.
  const dotTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const pad = 14;
    const radius = 10;
    ctx.shadowColor = "rgba(255,255,255,0.9)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.beginPath();
    ctx.roundRect(pad, pad, size - pad * 2, size - pad * 2, radius);
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const meshRef = useRef<THREE.Mesh>(null);
  const synapseRef = useRef<THREE.Points>(null);
  const signalRef = useRef<THREE.LineSegments>(null);
  const linkRef = useRef<THREE.LineSegments>(null);
  const current = useRef({ amplitude: 0.35, frequency: 1.6, rotationSpeed: 0.12 });
  const currentScale = useRef<[number, number, number]>([1, 1, 1]);
  const scrollGrowth = useRef(SCROLL_MIN_GROWTH);
  const { viewport, pointer } = useThree();

  useFrame((state, delta) => {
    const target = PROFILES[activeFormation];
    current.current.amplitude += (target.amplitude - current.current.amplitude) * DAMPING;
    current.current.frequency += (target.frequency - current.current.frequency) * DAMPING;
    current.current.rotationSpeed +=
      (target.rotationSpeed - current.current.rotationSpeed) * DAMPING;
    for (let i = 0; i < 3; i++) {
      currentScale.current[i]! += (target.scale[i]! - currentScale.current[i]!) * DAMPING;
    }

    const t = state.clock.getElapsedTime();
    const { amplitude, frequency } = current.current;
    const mesh = meshRef.current;
    if (!mesh) return;

    const posAttr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < basePositions.length; i += 3) {
      const bx = basePositions[i]!;
      const by = basePositions[i + 1]!;
      const bz = basePositions[i + 2]!;
      const nx = normals[i]!;
      const ny = normals[i + 1]!;
      const nz = normals[i + 2]!;

      // Central longitudinal fissure: pull the surface inward near x≈0 so
      // the two halves read as hemispheres rather than one smooth blob.
      const fissure = 1 - 0.6 * Math.exp(-(bx * bx) / 0.1);

      // Two noise octaves — coarse folds (gyri) plus finer wrinkle detail —
      // instead of one smooth sine wobble, so the surface looks convoluted
      // rather than a simple pulsing sphere.
      const coarse = Math.sin(bx * frequency + t) * Math.cos(by * frequency + t * 0.8);
      const fine =
        Math.sin(bx * frequency * 2.4 + t * 1.3) * Math.sin(bz * frequency * 2.1 - t * 0.6);
      const wobble = (coarse * amplitude + fine * amplitude * 0.35) * fissure - 0.08;

      posAttr.array[i] = bx + nx * wobble;
      posAttr.array[i + 1] = by + ny * wobble;
      posAttr.array[i + 2] = bz + nz * wobble;
    }
    posAttr.needsUpdate = true;

    // Bright synapse points: read back the already-deformed positions for
    // the sampled vertex subset, with a slow per-point size twinkle.
    const synapsePos = synapseRef.current?.geometry.getAttribute("position") as
      THREE.BufferAttribute | undefined;
    const synapseSize = synapseRef.current?.geometry.getAttribute("size") as
      THREE.BufferAttribute | undefined;
    if (synapsePos && synapseSize) {
      for (let s = 0; s < synapseIndices.length; s++) {
        const vi = synapseIndices[s]!;
        synapsePos.array[s * 3] = posAttr.array[vi * 3]!;
        synapsePos.array[s * 3 + 1] = posAttr.array[vi * 3 + 1]!;
        synapsePos.array[s * 3 + 2] = posAttr.array[vi * 3 + 2]!;
        synapseSize.array[s] = 0.75 + Math.sin(t * 2.2 + s * 1.7) * 0.5;
      }
      synapsePos.needsUpdate = true;
      synapseSize.needsUpdate = true;
    }

    // Faint persistent glow line under each synapse pair — the constant
    // "connection exists" line, like the linework in brain diagrams.
    const linkPos = linkRef.current?.geometry.getAttribute("position") as
      THREE.BufferAttribute | undefined;
    if (linkPos) {
      for (let p = 0; p < signalPairs.length; p++) {
        const [ia, ib] = signalPairs[p]!;
        linkPos.array[p * 6] = posAttr.array[ia * 3]!;
        linkPos.array[p * 6 + 1] = posAttr.array[ia * 3 + 1]!;
        linkPos.array[p * 6 + 2] = posAttr.array[ia * 3 + 2]!;
        linkPos.array[p * 6 + 3] = posAttr.array[ib * 3]!;
        linkPos.array[p * 6 + 4] = posAttr.array[ib * 3 + 1]!;
        linkPos.array[p * 6 + 5] = posAttr.array[ib * 3 + 2]!;
      }
      linkPos.needsUpdate = true;
    }

    // Electric signals: each fires between a random pair of synapse nodes,
    // rendered as a short travelling line segment (not a dot/trail of
    // points) — a fast bright dash sliding along the connection, then
    // respawning onto a *different* random pair after a cooldown gap so
    // connections vary over time and firings stay infrequent.
    const signalPos = signalRef.current?.geometry.getAttribute("position") as
      THREE.BufferAttribute | undefined;
    if (signalPos) {
      for (let s = 0; s < activeSignals.length; s++) {
        const sig = activeSignals[s]!;
        const progress = (t - sig.start) / sig.duration;
        if (progress >= 1) {
          respawnSignal(synapseIndices, t, sig);
        }

        const idx = s * 6;
        if (progress < 0 || progress >= 1) {
          // Cooling down between firings — collapse to a zero-length
          // segment so nothing is drawn.
          const ax = posAttr.array[sig.from * 3]!;
          const ay = posAttr.array[sig.from * 3 + 1]!;
          const az = posAttr.array[sig.from * 3 + 2]!;
          signalPos.array[idx] = ax;
          signalPos.array[idx + 1] = ay;
          signalPos.array[idx + 2] = az;
          signalPos.array[idx + 3] = ax;
          signalPos.array[idx + 4] = ay;
          signalPos.array[idx + 5] = az;
          continue;
        }

        const ax = posAttr.array[sig.from * 3]!;
        const ay = posAttr.array[sig.from * 3 + 1]!;
        const az = posAttr.array[sig.from * 3 + 2]!;
        const bx = posAttr.array[sig.to * 3]!;
        const by = posAttr.array[sig.to * 3 + 1]!;
        const bz = posAttr.array[sig.to * 3 + 2]!;

        const headU = Math.min(1, progress);
        const tailU = Math.max(0, progress - SEGMENT_LENGTH);
        signalPos.array[idx] = ax + (bx - ax) * tailU;
        signalPos.array[idx + 1] = ay + (by - ay) * tailU;
        signalPos.array[idx + 2] = az + (bz - az) * tailU;
        signalPos.array[idx + 3] = ax + (bx - ax) * headU;
        signalPos.array[idx + 4] = ay + (by - ay) * headU;
        signalPos.array[idx + 5] = az + (bz - az) * headU;
      }
      signalPos.needsUpdate = true;
    }

    mesh.rotation.y += delta * current.current.rotationSpeed;
    mesh.rotation.x = Math.sin(t * 0.15) * 0.2;

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
    const scrollTarget = SCROLL_MIN_GROWTH + scrollProgress * (SCROLL_MAX_GROWTH - SCROLL_MIN_GROWTH);
    scrollGrowth.current += (scrollTarget - scrollGrowth.current) * SCROLL_DAMPING;

    mesh.scale.set(
      BASE_SCALE[0] * currentScale.current[0] * scrollGrowth.current,
      BASE_SCALE[1] * currentScale.current[1] * scrollGrowth.current,
      BASE_SCALE[2] * currentScale.current[2] * scrollGrowth.current,
    );

    const mouseX = (pointer.x * viewport.width) / 2;
    const mouseY = (pointer.y * viewport.height) / 2;
    const tiltTarget = new THREE.Vector2(mouseY * -0.03, mouseX * 0.03);
    mesh.rotation.z += (tiltTarget.x - mesh.rotation.z) * 0.05;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial color="#7a5230" wireframe transparent opacity={0.16} />

      <lineSegments ref={linkRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(signalPairs.length * 6), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#ffb26b"
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      <points ref={synapseRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(synapseIndices.length * 3), 3]}
          />
          <bufferAttribute attach="attributes-size" args={[synapseSizes, 1]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          map={dotTexture}
          color="#ffb26b"
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <lineSegments ref={signalRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(activeSignals.length * 6), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#ffe0b3"
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </mesh>
  );
}

export function BackgroundScene({ activeFormation }: { activeFormation: Formation }) {
  return (
    <Canvas
      className="!fixed inset-0"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 6], fov: 50 }}
    >
      <WireframeSolid activeFormation={activeFormation} />
    </Canvas>
  );
}
