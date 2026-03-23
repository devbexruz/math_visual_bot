import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface PlaneProps {
  id: string;
  a: number;
  b: number;
  c: number;
  d: number;
  size: number;
  color: string;
}

export const Plane: React.FC<PlaneProps> = ({ id, a, b, c, d, size, color }) => {
  const { position, quaternion } = useMemo(() => {
    const normal = new THREE.Vector3(a, b, c);
    const len = normal.length();
    if (len === 0) return { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };

    const nNorm = normal.clone().normalize();

    // Tekislikdagi eng yaqin nuqta originga: P = -D * n / |n|^2
    const pos = nNorm.clone().multiplyScalar(-d / len);

    // PlaneGeometry default normal = (0, 0, 1), buni (a, b, c) ga aylantirish
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultNormal, nNorm);

    return { position: pos, quaternion: quat };
  }, [a, b, c, d]);

  return (
    <group key={id} position={position} quaternion={quaternion}>
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.6} />
      </mesh>
      {/* Chekka (wireframe) */}
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
    </group>
  );
};
