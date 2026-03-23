import { Dot } from './3D/dot';
import { Cube } from './3D/cube';
import { Plane } from './3D/plane';
import { Hyperboloid1 } from './3D/hyperboloid1';
import { HyperbolicParaboloid } from './3D/hyperbolicParaboloid';
import { EllipticParaboloid } from './3D/ellipticParaboloid';
import { Cone } from './3D/cone';
// 5. Tekislik (plane) parametrlari
export interface PlaneParams {
  a: number;
  b: number;
  c: number;
  d: number;
  size: number;
  color: string;
}

export type PlaneData = {
  id: string;
  type: 'plane';
  params: PlaneParams;
};

// 4. Cube (kub) parametrlari
export interface CubeParams {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  color: string;
}

export type CubeData = {
  id: string;
  type: 'cube';
  params: CubeParams;
};
// 3. Dot (nuqta) parametrlari

export interface DotParams {
  x: number;
  y: number;
  z: number;
  color: string;
  title?: string;
}

export type DotData = {
  id: string;
  type: 'dot';
  params: DotParams;
};
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Hyperboloid } from './3D/hyperboloid';
import { Ellips } from './3D/ellips';


// 1. Giperboloid parametrlari
export interface HyperboloidParams {
  a: number;
  b: number;
  c: number;
  color: string;
}

// 2. Ellips parametrlari (3D ellipsoid uchun a, b, c)
export interface EllipsParams {
  a: number;
  b: number;
  c: number;
  color: string;
}

// 2. Har bir shaklning o'zining qat'iy ma'lumot turi (Data turi)


export type HyperboloidData = {
  id: string;
  type: 'hyperboloid';
  params: HyperboloidParams;
};

export type EllipsData = {
  id: string;
  type: 'ellips';
  params: EllipsParams;
};

// Bir pallali giperboloid parametrlari
export interface Hyperboloid1Params {
  a: number;
  b: number;
  c: number;
  color: string;
}

export type Hyperboloid1Data = {
  id: string;
  type: 'hyperboloid1';
  params: Hyperboloid1Params;
};

// Giperbolik paraboloid parametrlari
export interface HyperbolicParaboloidParams {
  a: number;
  b: number;
  size: number;
  color: string;
}

export type HyperbolicParaboloidData = {
  id: string;
  type: 'hyperbolicParaboloid';
  params: HyperbolicParaboloidParams;
};

// Elliptik paraboloid parametrlari
export interface EllipticParaboloidParams {
  a: number;
  b: number;
  size: number;
  color: string;
}

export type EllipticParaboloidData = {
  id: string;
  type: 'ellipticParaboloid';
  params: EllipticParaboloidParams;
};

// Konus parametrlari
export interface ConeParams {
  a: number;
  b: number;
  c: number;
  color: string;
}

export type ConeData = {
  id: string;
  type: 'cone';
  params: ConeParams;
};

// ShapeData umumiy tip
export type ShapeData = HyperboloidData | EllipsData | DotData | CubeData | PlaneData | Hyperboloid1Data | HyperbolicParaboloidData | EllipticParaboloidData | ConeData;


interface WorkspaceProps {
  shapes: ShapeData[]; // Shakllar ro'yxati (List)
}

const Workspace3D: React.FC<WorkspaceProps> = ({ shapes }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [15, 10, 15], fov: 50 }} gl={{ localClippingEnabled: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={3} />
        <directionalLight position={[-10, -10, -10]} intensity={2} color="#abcdef" />
        <OrbitControls makeDefault />
        <axesHelper args={[5]} />
        <Grid args={[20, 20]} cellSize={1} cellColor="#444444" sectionSize={5} sectionColor="#00ddff" fadeDistance={50} infiniteGrid />

        {/* MANTIQ: Ro'yxatdagi shakllarni aylanib chiqib, turlarini aniqlab chizamiz */}
        {shapes.map((shape) => {
          if (shape.type === 'hyperboloid') {
            return <Hyperboloid key={shape.id} id={shape.id} {...shape.params} />;
          }
          if (shape.type === 'ellips') {
            return <Ellips key={shape.id} id={shape.id} {...shape.params} />;
          }
          if (shape.type === 'dot') {
            return <Dot key={shape.id} id={shape.id} {...shape.params} />;
          }
          if (shape.type === 'cube') {
            return <Cube key={shape.id} id={shape.id} {...shape.params} />;
          }
          if (shape.type === 'plane') {
            return <Plane key={shape.id} id={shape.id} {...shape.params} />;
          }
          if (shape.type === 'hyperboloid1') {
            return <Hyperboloid1 key={shape.id} id={shape.id} {...shape.params} />;
          }
          if (shape.type === 'hyperbolicParaboloid') {
            return <HyperbolicParaboloid key={shape.id} id={shape.id} {...shape.params} />;
          }
          if (shape.type === 'ellipticParaboloid') {
            return <EllipticParaboloid key={shape.id} id={shape.id} {...shape.params} />;
          }
          if (shape.type === 'cone') {
            return <Cone key={shape.id} id={shape.id} {...shape.params} />;
          }
          return null;
        })}

      </Canvas>
    </div>
  );
};

export default Workspace3D;