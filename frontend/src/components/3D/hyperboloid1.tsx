import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';

export interface Hyperboloid1Props {
  id: string;
  a: number;
  b: number;
  c: number;
  color: string;
}

// Bir pallali giperboloid: x²/a² + y²/b² - z²/c² = 1
export const Hyperboloid1: React.FC<Hyperboloid1Props> = ({ a, b, c, color }) => {
  const { geometry, clipPlanes } = useMemo(() => {
    const cosh = (x: number) => (Math.exp(x) + Math.exp(-x)) / 2;
    const sinh = (x: number) => (Math.exp(x) - Math.exp(-x)) / 2;
    const V_MAX = 2;

    const geo = new ParametricGeometry((u, v, target) => {
      const theta = u * Math.PI * 2;
      const t = (v - 0.5) * 2 * V_MAX; // -V_MAX dan V_MAX gacha
      target.set(
        a * cosh(t) * Math.cos(theta),
        c * sinh(t),
        b * cosh(t) * Math.sin(theta)
      );
    }, 64, 64);
    geo.computeVertexNormals();

    const limit = 10;
    const planes = [
      new THREE.Plane(new THREE.Vector3(0, 1, 0), limit),
      new THREE.Plane(new THREE.Vector3(0, -1, 0), limit),
    ];

    return { geometry: geo, clipPlanes: planes };
  }, [a, b, c]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.8} roughness={0.2} metalness={0.5} clippingPlanes={clipPlanes} />
    </mesh>
  );
};
