import React from 'react';
import { Html } from '@react-three/drei';

export interface DotProps {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  title?: string;
}

export const Dot: React.FC<DotProps> = ({ id, x, y, z, color, title }) => {
  return (
    <group key={id} position={[x, y, z]}>
      <mesh>
        {/* <sphereGeometry args={[0.15, 16, 16]} /> */}
        <meshStandardMaterial color={color} />
        <Html
          position={[0, 0, 0]}
          style={{
            color: color,
            fontWeight: 'bold',
            fontSize: '14px',
            background: 'transparent',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
            textAlign: 'left',
          }}
        >
          <span style={{
            position: 'absolute',
            top: '0',
            left: '0',
            fontSize: '40px',
            transform: 'translate(-50%, -50%)',
            color: color,
          }}>•</span><span style={{
            position: 'absolute',
            top: '0',
            left: '10px',
            fontSize: '18px',
            transform: 'translateY(-50%)',
            color: color,
          }}
          >{title}</span>
        </Html>

        </mesh>
    </group>
  );
};

