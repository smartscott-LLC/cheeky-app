'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function GLBViewer({ url }) {
  const { scene } = useGLTF(url || '');
  const group = useRef(null);
  
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [scene]);

  useFrame((_, delta) => {
    if (group.current && !url) {
      group.current.rotation.y += delta * 0.5;
    }
  });

  if (!url || url === '') {
    return (
      <group ref={group}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>
    );
  }

  return <primitive object={scene} scale={[0.8, 0.8, 0.8]} />;
}

export default function AssetViewer({ asset }) {
  const url = asset ? `/api/quest/assets/${encodeURIComponent(asset.path)}` : null;

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a0f' }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 4, 2]} intensity={0.8} />
        <directionalLight position={[-2, 2, -1]} intensity={0.3} />
        <GLBViewer url={url} />
        <OrbitControls makeDefault minDistance={1} maxDistance={10} />
        <gridHelper args={[10, 10, '#333', '#222']} position={[0, -1, 0]} />
      </Canvas>
      {asset && (
        <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(10,10,15,0.9)', padding: '10px 16px', borderRadius: 8, border: '1px solid #FFD800' }}>
          <div style={{ color: '#FFD800', fontFamily: 'Fascinate', fontSize: 16 }}>{asset.name}</div>
          <div style={{ color: '#66FFFF', fontSize: 12, marginTop: 4 }}>{asset.sizeKB} KB</div>
        </div>
      )}
    </div>
  );
}
