'use client';

import { useState, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';


function Viewer({ asset }) {
  const url = asset ? `/api/quest/assets/${encodeURIComponent(asset.path)}` : null;
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) { setModel(null); setError(null); return; }
    setModel(null);
    setError(null);
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => setModel(gltf), undefined, (err) => {
      console.error('GLTF load error:', err);
      setError('Failed to load model');
    });
  }, [url]);

  if (!asset) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#66FFFF', fontFamily: 'Rancho', fontSize: 18 }}>Select an asset to preview</div>;
  }
  if (error) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ff6b6b', fontFamily: 'Rancho' }}>{error}</div>;
  }

  return (
    <Canvas camera={{ position: [0, 0.5, 2], fov: 50 }} style={{ background: '#0a0a0f' }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 2]} intensity={0.8} />
      <directionalLight position={[-2, 2, -1]} intensity={0.3} />
      {model && <primitive object={model.scene} attach="scene" />}
      <OrbitControls makeDefault minDistance={0.5} maxDistance={5} />
    </Canvas>
  );
}

export default function AssetPreviewPage() {
  const [catalog] = useState(window.ASSET_CATALOG || {});
  const [selected, setSelected] = useState<AssetInfo | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const allAssets = [];
  Object.entries(catalog).forEach(([cat, data]) => {
    (data.assets || []).forEach((a) => allAssets.push({ ...a, path: `${cat}/${a.name}` }));
  });

  const filtered = allAssets.filter(a => {
    const matchesCat = catFilter === 'all' || a.path.startsWith(catFilter + '/');
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.path.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: '#0a0a0f', color: '#FFB5FF', fontFamily: 'Rancho, cursive' }}>
      <div style={{ width: 320, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 12, borderBottom: '1px solid #333' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." style={{ width: '100%', background: '#1a1a2e', border: '1px solid #FFD800', color: '#FFB5FF', padding: '6px 10px', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: '100%', marginTop: 8, background: '#1a1a2e', border: '1px solid #66FFFF', color: '#66FFFF', padding: '6px 10px', borderRadius: 4, fontSize: 14 }}>
            <option value="all">All Categories ({allAssets.length})</option>
            {Object.keys(catalog).sort().map(c => <option key={c} value={c}>{c} ({catalog[c]?.assets?.length || 0})</option>)}
          </select>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.slice(0, 150).map(a => (
            <div key={a.path} onClick={() => setSelected(a)} style={{
              padding: '8px 12px', cursor: 'pointer',
              borderLeft: selected?.path === a.path ? '3px solid #FFD800' : '3px solid transparent',
              background: selected?.path === a.path ? '#1a1a2e' : 'transparent'
            }}>
              <div style={{ color: '#FFB5FF', fontSize: 13, wordBreak: 'break-all' }}>{a.name}</div>
              <div style={{ color: '#66FFFF', fontSize: 11, marginTop: 2 }}>{a.sizeKB} KB</div>
            </div>
          ))}
          {filtered.length > 150 && <div style={{ padding: 8, color: '#666', fontSize: 11 }}>Showing 150 of {filtered.length}</div>}
          {filtered.length === 0 && <div style={{ padding: 16, color: '#666', textAlign: 'center' }}>No assets match</div>}
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <Viewer asset={selected} />
        {selected && (
          <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(10,10,15,0.85)', padding: '10px 16px', borderRadius: 8, border: '1px solid #FFD800' }}>
            <div style={{ color: '#FFD800', fontFamily: 'Fascinate', fontSize: 16 }}>{selected.name}</div>
            <div style={{ color: '#66FFFF', fontSize: 12, marginTop: 4 }}>{selected.sizeKB} KB · {selected.path.split('/')[0]}</div>
          </div>
        )}
      </div>
    </div>
  );
}
