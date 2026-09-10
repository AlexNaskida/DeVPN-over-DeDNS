"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Mirrors packages/ui/src/tokens.ts's --primary exactly - flat, no gradient,
// no glow, matching the rest of the design system.
const PRIMARY = "#2E7D6B";

/**
 * An icosahedron: vertices standing in for the operators in the ENSv2
 * registry, edges for the relationships the watchdog contract has to reason
 * about between them. Draggable (OrbitControls' default rotate), and slowly
 * auto-rotating when left alone.
 */
function Polyhedron() {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(2.52, 1), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
  const vertexPositions = useMemo(() => {
    const pos = geometry.attributes.position;
    if (!pos) return [];
    const seen = new Set<string>();
    const points: [number, number, number][] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        points.push([x, y, z]);
      }
    }
    return points;
  }, [geometry]);

  const dotRefs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.1;
    const t = clock.getElapsedTime();
    dotRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const scale = 1 + Math.sin(t * 1.6 + i * 0.7) * 0.35;
      mesh.scale.setScalar(scale);
    });
  });

  return (
    <group ref={group}>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={PRIMARY} transparent opacity={0.5} />
      </lineSegments>
      {vertexPositions.map((p, i) => (
        <mesh key={i} position={p} ref={(el) => { if (el) dotRefs.current[i] = el; }}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color={PRIMARY} />
        </mesh>
      ))}
    </group>
  );
}

export function HeroPolyhedron() {
  return (
    <div style={{ width: "100%", height: 456, cursor: "grab" }}>
      <Canvas camera={{ position: [0, 0, 7.2], fov: 45 }} dpr={[1, 2]}>
        <Polyhedron />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.2}
          rotateSpeed={0.6}
        />
      </Canvas>
    </div>
  );
}
