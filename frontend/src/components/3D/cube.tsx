import React from 'react';

export interface CubeProps {
    id: string;
    x: number;
    y: number;
    z: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    color: string;
}

export const Cube: React.FC<CubeProps> = ({ id, x, y, z, scaleX, scaleY, scaleZ, color }) => {
    return (
        <group key={id} position={[x, y, z]}>
            <mesh>
                <boxGeometry args={[scaleX, scaleY, scaleZ]} />
                <meshStandardMaterial color={color} transparent opacity={0.35} />
            </mesh>
            <mesh>
                <boxGeometry args={[scaleX, scaleY, scaleZ]} />
                <meshStandardMaterial color={color} wireframe />
            </mesh>
        </group>
    );
};