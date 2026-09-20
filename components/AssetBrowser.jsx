'use client';

import { useState, useEffect } from 'react';

export default function AssetBrowser({ initialCatalog }) {
  const [catalog] = useState(initialCatalog);
  const [tiers, setTiers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quest-asset-tiers') || '{}'); } catch { return {}; }
  });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  useEffect(() => {
    localStorage.setItem('quest-asset-tiers', JSON.stringify(tiers));
  }, [tiers]);

  const cycleTier = (assetPath) => {
    setTiers(prev => {
      const current = prev[assetPath];
      const cycle = { undefined: 'free', free: 'token', token: 'prize', prize: 'future', future: 'none' };
      return { ...prev, [assetPath]: cycle[current] };
    });
  };

  const categorizedCount = Object.values(tiers).filter(t => t !== 'none').length;
  const freeCount = Object.values(tiers).filter(t => t === 'free').length;
  const tokenCount = Object.values(tiers).filter(t => t === 'token').length;
  const prizeCount = Object.values(tiers).filter(t => t === 'prize').length;
  const futureCount = Object.values(tiers).filter(t => t === 'future').length;

  const totalAssets = Object.values(catalog).reduce((s, c) => s + (c.count || 0), 0);
  const totalSizeMB = Object.values(catalog).reduce((s, c) => s + (c.totalSizeKB || 0), 0) / 1024;

  // Compute thumbnail URL for an asset
  const thumbUrl = (cat) => `/pictures/previews/${cat}.jpeg`;

  return (
    <div style={{ background: '#0a0a0f', color: '#FFB5FF', minHeight: '100vh', fontFamily: 'Rancho, cursive' }}>
      <h1 style={{ color: '#FFD800', fontFamily: 'Fascinate, cursive', fontSize: 32, textAlign: 'center', padding: '20px 0' }}>
        ⚔️ Quest Asset Browser
      </h1>
      <div style={{ textAlign: 'center', color: '#66FFFF', fontSize: 14, marginBottom: 20 }}>
        Total: {totalAssets} assets · {totalSizeMB.toFixed(1)} MB · {freeCount} free · {tokenCount} token · {prizeCount} prize · {futureCount} future
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        {['all', 'free', 'token', 'prize', 'future'].map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding: '8px 20px', borderRadius: 6, border: `2px solid ${filter === t ? '#FFD800' : '#333'}`,
            background: 'transparent', color: filter === t ? '#FFD800' : '#FFB5FF',
            fontFamily: 'Rancho, cursive', fontSize: 16, cursor: 'pointer'
          }}>{t === 'all' ? 'All' : t === 'free' ? '🟢 Free' : t === 'token' ? '🟡 Token' : t === 'prize' ? '🟣 Prize' : '⬜ Future'}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." style={{ background: '#1a1a2e', border: '1px solid #FFD800', color: '#FFB5FF', padding: '8px 16px', borderRadius: 8, fontSize: 16, width: 300 }} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ background: '#1a1a2e', border: '1px solid #66FFFF', color: '#66FFFF', padding: '8px 16px', borderRadius: 8, fontSize: 16 }}>
          <option value="all">All Categories</option>
          {Object.keys(catalog).sort().map(c => <option key={c} value={c}>{c} ({catalog[c].count})</option>)}
        </select>
      </div>

      <div style={{ padding: '0 20px' }}>
        {Object.entries(catalog)
          .filter(([cat]) => catFilter === 'all' || cat === catFilter)
          .map(([category, data]) => {
            const catFree = (data.assets || []).filter(a => tiers[a.path] === 'free').length;
            const catToken = (data.assets || []).filter(a => tiers[a.path] === 'token').length;
            const catPrize = (data.assets || []).filter(a => tiers[a.path] === 'prize').length;
            const catFuture = (data.assets || []).filter(a => tiers[a.path] === 'future').length;

            const filtered = (data.assets || []).filter(a => {
              const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.path.toLowerCase().includes(search.toLowerCase());
              const matchesTier = filter === 'all' || tiers[a.path] === filter;
              return matchesSearch && matchesTier;
            });

            if (filtered.length === 0) return null;

            return (
              <div key={category} style={{ marginBottom: 20 }}>
                <h2 style={{ color: '#FFD800', fontFamily: 'Fascinate, cursive', fontSize: 24, borderBottom: '2px solid #FFD800', padding: '10px 0' }}>
                  {category} <span style={{ color: '#66FFFF', fontFamily: 'Rancho', fontSize: 14 }}>{data.count} assets · {catFree} free · {catToken} token · {catPrize} prize · {catFuture} future</span>
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, padding: '15px 0' }}>
                  {filtered.map(a => {
                    const tier = tiers[a.path];
                    const tierColors = { free: '#4ade80', token: '#f59e0b', prize: '#a855f7', future: '#64748b' };
                    const tierLabels = { free: 'FREE', token: 'TOKEN', prize: 'PRIZE', future: 'FUTURE' };
                    const thumb = thumbUrl(category);
                    return (
                      <div key={a.path} onClick={() => cycleTier(a.path)} style={{
                        background: '#1a1a2e', border: `2px solid ${tier ? tierColors[tier] : '#333'}`,
                        borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                        borderLeft: `4px solid ${tier ? tierColors[tier] : '#333'}`,
                        position: 'relative', overflow: 'hidden'
                      }} title={`Click to cycle: ${tier || 'none'} → ${tier === 'free' ? 'token' : tier === 'token' ? 'prize' : tier === 'prize' ? 'future' : 'free'}`}>
                        <div style={{ height: 100, background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={thumb} alt={a.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="color:#444;font-size:24px">📦</span>'; }} />
                        </div>
                        <div style={{ padding: '6px 8px' }}>
                          <div style={{ color: '#FFB5FF', fontSize: 11, wordBreak: 'break-all' }}>{a.name}</div>
                          <div style={{ color: '#66FFFF', fontSize: 10, marginTop: 2 }}>{a.sizeKB} KB</div>
                        </div>
                        {tier && <span style={{ position: 'absolute', top: 4, right: 4, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 'bold', background: `${tierColors[tier]}33`, color: tierColors[tier], border: `1px solid ${tierColors[tier]}` }}>{tierLabels[tier]}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1a1a2e', borderTop: '2px solid #FFD800', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#66FFFF' }}>{categorizedCount} of {totalAssets} assets categorized</span>
        <button onClick={() => {
          const entries = Object.entries(tiers).filter(([, t]) => t !== 'none').map(([assetPath, tier]) => ({ path: assetPath, tier }));
          const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'asset-tiers.json'; a.click();
          URL.revokeObjectURL(url);
        }} style={{ background: '#FFD800', color: '#0a0a0f', border: 'none', padding: '10px 24px', borderRadius: 8, fontFamily: 'Fascinate, cursive', fontSize: 16, cursor: 'pointer' }}>
          Export Selection
        </button>
      </div>
      <div style={{ height: 60 }} />
    </div>
  );
}
