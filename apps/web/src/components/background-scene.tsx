"use client";

/* eslint-disable react/no-unknown-property --
 * react-three-fiber renders three.js objects as JSX intrinsics (bufferAttribute,
 * pointsMaterial, ...) with props (attach, args, ...) that aren't real DOM
 * attributes — this rule doesn't know about R3F's custom reconciler. */
/* eslint-disable react-hooks/immutability --
 * R3F's whole model is useFrame mutating typed arrays imperatively every
 * frame (this is the standard, documented R3F pattern) — the React
 * Compiler lint rule assumes pure render/no-mutation and doesn't have an
 * exception for imperative WebGL integration code. */

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export const FORMATIONS = ["about", "experience", "skills", "projects", "contact"] as const;
export type Formation = (typeof FORMATIONS)[number];

const NODE_COUNT = 100;
const CONNECT_DISTANCE = 2.2;
const REACT_RADIUS = 2.5;
const MORPH_DAMPING = 0.04;
const REACT_DAMPING = 0.08;

function nodeAt(positions: Float32Array, index: number): [number, number, number] {
  return [positions[index * 3]!, positions[index * 3 + 1]!, positions[index * 3 + 2]!];
}

function setNodeAt(positions: Float32Array, index: number, x: number, y: number, z: number) {
  positions[index * 3] = x;
  positions[index * 3 + 1] = y;
  positions[index * 3 + 2] = z;
}

function buildFormation(type: Formation): Float32Array {
  const positions = new Float32Array(NODE_COUNT * 3);

  for (let i = 0; i < NODE_COUNT; i++) {
    switch (type) {
      case "about": {
        setNodeAt(
          positions,
          i,
          (Math.random() - 0.5) * 9,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 4,
        );
        break;
      }
      case "experience": {
        const t = i / NODE_COUNT;
        setNodeAt(
          positions,
          i,
          Math.sin(t * Math.PI * 6) * 1.6 + (Math.random() - 0.5) * 0.6,
          (t - 0.5) * 9,
          (Math.random() - 0.5) * 2,
        );
        break;
      }
      case "skills": {
        const clusterCount = 6;
        const cluster = i % clusterCount;
        const cols = 3;
        const cx = (cluster % cols) - (cols - 1) / 2;
        const cy = Math.floor(cluster / cols) - 0.5;
        setNodeAt(
          positions,
          i,
          cx * 3 + (Math.random() - 0.5) * 1.4,
          cy * 3 + (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 3,
        );
        break;
      }
      case "projects": {
        const clusterCount = 8;
        const cluster = i % clusterCount;
        const angle = (cluster / clusterCount) * Math.PI * 2;
        const radius = 4.5;
        setNodeAt(
          positions,
          i,
          Math.cos(angle) * radius + (Math.random() - 0.5) * 1.2,
          Math.sin(angle) * radius * 0.6 + (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 3,
        );
        break;
      }
      case "contact": {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.1;
        setNodeAt(
          positions,
          i,
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          (Math.random() - 0.5) * 1.5,
        );
        break;
      }
    }
  }

  return positions;
}

function buildEdgeIndex(positions: Float32Array): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const [ix, iy, iz] = nodeAt(positions, i);
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const [jx, jy, jz] = nodeAt(positions, j);
      const dist = Math.sqrt((ix - jx) ** 2 + (iy - jy) ** 2 + (iz - jz) ** 2);
      if (dist < CONNECT_DISTANCE) edges.push([i, j]);
    }
  }
  return edges;
}

function NetworkField({ activeFormation }: { activeFormation: Formation }) {
  const formations = useMemo(() => {
    const map = new Map<Formation, Float32Array>();
    for (const key of FORMATIONS) map.set(key, buildFormation(key));
    return map;
  }, []);

  const edgeIndex = useMemo(() => buildEdgeIndex(formations.get("about")!), [formations]);

  // These are mutated every frame in useFrame below (standard R3F pattern).
  const currentPositions = useMemo(() => formations.get("about")!.slice(), [formations]);
  const edgeBuffer = useMemo(() => new Float32Array(edgeIndex.length * 6), [edgeIndex]);
  const sizeAttr = useMemo(() => new Float32Array(NODE_COUNT).fill(1), []);

  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const { viewport, pointer } = useThree();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.03;
      groupRef.current.rotation.x = Math.sin(t * 0.05) * 0.05;
    }

    const target = formations.get(activeFormation)!;
    for (let idx = 0; idx < currentPositions.length; idx++) {
      const current = currentPositions[idx]!;
      currentPositions[idx] = current + (target[idx]! - current) * MORPH_DAMPING;
    }

    const pointsGeometry = pointsRef.current?.geometry;
    const positionAttr = pointsGeometry?.getAttribute("position") as
      | THREE.BufferAttribute
      | undefined;
    if (positionAttr) {
      positionAttr.set(currentPositions);
      positionAttr.needsUpdate = true;
    }

    for (let e = 0; e < edgeIndex.length; e++) {
      const [i, j] = edgeIndex[e]!;
      const [ix, iy, iz] = nodeAt(currentPositions, i);
      const [jx, jy, jz] = nodeAt(currentPositions, j);
      edgeBuffer[e * 6] = ix;
      edgeBuffer[e * 6 + 1] = iy;
      edgeBuffer[e * 6 + 2] = iz;
      edgeBuffer[e * 6 + 3] = jx;
      edgeBuffer[e * 6 + 4] = jy;
      edgeBuffer[e * 6 + 5] = jz;
    }
    const linesGeometry = linesRef.current?.geometry;
    const edgeAttr = linesGeometry?.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (edgeAttr) {
      edgeAttr.set(edgeBuffer);
      edgeAttr.needsUpdate = true;
    }

    const sizeGeomAttr = pointsGeometry?.getAttribute("size") as THREE.BufferAttribute | undefined;
    if (sizeGeomAttr) {
      const mouseX = (pointer.x * viewport.width) / 2;
      const mouseY = (pointer.y * viewport.height) / 2;
      for (let i = 0; i < NODE_COUNT; i++) {
        const [nx, ny] = nodeAt(currentPositions, i);
        const dist = Math.hypot(nx - mouseX, ny - mouseY);
        const reactTarget = dist < REACT_RADIUS ? 2.4 : 1;
        const current = sizeGeomAttr.array[i]!;
        sizeGeomAttr.array[i] = current + (reactTarget - current) * REACT_DAMPING;
      }
      sizeGeomAttr.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentPositions.slice(), 3]} />
          <bufferAttribute attach="attributes-size" args={[sizeAttr, 1]} />
        </bufferGeometry>
        <pointsMaterial size={0.06} color="#e8934a" sizeAttenuation transparent opacity={0.85} />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgeBuffer.slice(), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#6b7a99" transparent opacity={0.18} />
      </lineSegments>
    </group>
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
      <NetworkField activeFormation={activeFormation} />
    </Canvas>
  );
}
