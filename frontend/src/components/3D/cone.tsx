import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';

export interface ConeProps {
  id: string;
  a: number;
  b: number;
  c: number;
  color: string;
}

// Ikkinchi tartibli konus: x²/a² + y²/b² - z²/c² = 0
export const Cone: React.FC<ConeProps> = ({ a, b, c, color }) => {
  const { posGeo, negGeo, clipPlanes } = useMemo(() => {
    const V_MAX = 3;

    const makeGeo = (sign: number) => {
      const geo = new ParametricGeometry((u, v, target) => {
        const theta = u * Math.PI * 2;
        const t = v * V_MAX;
        target.set(
          a * t * Math.cos(theta),
          sign * c * t,
          b * t * Math.sin(theta)
        );
      }, 64, 64);
      geo.computeVertexNormals();
      return geo;
    };

    const limit = 10;
    const planes = [
      new THREE.Plane(new THREE.Vector3(0, 1, 0), limit),
      new THREE.Plane(new THREE.Vector3(0, -1, 0), limit),
    ];

    return { posGeo: makeGeo(1), negGeo: makeGeo(-1), clipPlanes: planes };
  }, [a, b, c]);

  return (
    <group>
      <mesh geometry={posGeo}>
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.8} roughness={0.2} metalness={0.5} clippingPlanes={clipPlanes} />
      </mesh>
      <mesh geometry={negGeo}>
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.8} roughness={0.2} metalness={0.5} clippingPlanes={clipPlanes} />
      </mesh>
    </group>
  );
};
