import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';

export interface HyperboloidProps {
  id: string; // Har bir shaklning o'z ID si bo'lishi shart (List uchun)
  a: number;
  b: number;
  c: number;
  color: string;
}

export const Hyperboloid: React.FC<HyperboloidProps> = ({ a, b, c, color }) => {
  const { posGeo, negGeo, clipPlanes } = useMemo(() => {
    const cosh = (x: number) => (Math.exp(x) + Math.exp(-x)) / 2;
    const sinh = (x: number) => (Math.exp(x) - Math.exp(-x)) / 2;
    const V_MAX = 3;

    const pos = new ParametricGeometry((u, v, target) => {
      target.set(a * sinh(v*V_MAX) * Math.cos(u*Math.PI*2), c * cosh(v*V_MAX), b * sinh(v*V_MAX) * Math.sin(u*Math.PI*2));
    }, 50, 50);
    pos.computeVertexNormals();

    const neg = new ParametricGeometry((u, v, target) => {
      target.set(a * sinh(v*V_MAX) * Math.cos(u*Math.PI*2), -c * cosh(v*V_MAX), b * sinh(v*V_MAX) * Math.sin(u*Math.PI*2));
    }, 50, 50);
    neg.computeVertexNormals();

    const limit = 10;
    const planes = [
      new THREE.Plane(new THREE.Vector3(1,0,0), limit), new THREE.Plane(new THREE.Vector3(-1,0,0), limit),
      new THREE.Plane(new THREE.Vector3(0,0,1), limit), new THREE.Plane(new THREE.Vector3(0,0,-1), limit),
      new THREE.Plane(new THREE.Vector3(0,1,0), limit), new THREE.Plane(new THREE.Vector3(0,-1,0), limit)
    ];

    return { posGeo: pos, negGeo: neg, clipPlanes: planes };
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