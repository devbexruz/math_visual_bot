import React from 'react';

export interface EllipsProps {
  id: string;
  a: number;
  b: number;
  c: number;
  color: string;
}

export const Ellips: React.FC<EllipsProps> = ({ id, a, b, c, color }) => {
  // 3D ellipsoid: sphereGeometry + scale, with transparency
  return (
    <mesh key={id} position={[0, 0, 0]} scale={[a, b, c]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color={color}
        opacity={0.5}
        transparent={true}
        roughness={0.2}
        metalness={0.3}
      />
    </mesh>
  );
};