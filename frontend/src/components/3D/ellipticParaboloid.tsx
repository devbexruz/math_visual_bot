import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';

export interface EllipticParaboloidProps {
  id: string;
  a: number;
  b: number;
  size: number;
  color: string;
}

// Elliptik paraboloid: z = x²/a² + y²/b²
export const EllipticParaboloid: React.FC<EllipticParaboloidProps> = ({ a, b, size, color }) => {
  const geometry = useMemo(() => {
    const half = size / 2;
    const geo = new ParametricGeometry((u, v, target) => {
      const x = (u - 0.5) * 2 * half;
      const y = (v - 0.5) * 2 * half;
      const z = (x * x) / (a * a) + (y * y) / (b * b);
      target.set(x, z, y);
    }, 64, 64);
    geo.computeVertexNormals();
    return geo;
  }, [a, b, size]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.8} roughness={0.2} metalness={0.5} />
    </mesh>
  );
};
