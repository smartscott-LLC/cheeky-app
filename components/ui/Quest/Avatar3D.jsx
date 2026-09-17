'use client';

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ===== GENIES SDK LAYER =====
// The real SDK (@geniesinc/genies-naf-webgl) is not yet on npm — it ships
// after beta approval. This module loads it dynamically so the app runs
// now with a Three.js placeholder and flips to Genies seamlessly when
// the SDK becomes available.

let naf = null;
let nafReady = false;
let nacCanvas = null;

async function initGenies(token) {
  if (nafReady) return true;
  try {
    // Dynamic import — resolves when the package is installed
    const mod = await import('@geniesinc/genies-naf-webgl');
    const { initialize } = mod;
    nacCanvas = document.createElement('canvas');
    nacCanvas.width = 512;
    nacCanvas.height = 512;
    nacCanvas.style.display = 'none';
    document.body.appendChild(nacCanvas);

    naf = await initialize({
      canvas: nacCanvas,
      initScene: () => ({
        renderer: new THREE.WebGLRenderer({
          canvas: nacCanvas,
          antialias: true,
          alpha: true
        }),
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(45, 1, 0.1, 100)
      }),
      environment: 'prod',
      bearerToken: token
    });
    nafReady = true;
    return true;
  } catch (e) {
    // SDK not available yet — fall through to placeholder renderer
    console.warn(
      '[Genies] SDK not loaded, using placeholder renderer:',
      e.message
    );
    return false;
  }
}

// ===== PLACEHOLDER 3D AVATAR =====
// Shown while Genies SDK is unavailable. Replace with actual NAF mesh
// once the SDK is integrated.
function PlaceholderAvatar({ config, isGenerating }) {
  const groupRef = useRef(null);
  // hovered // removed for lint

  useFrame((_, delta) => {
    if (groupRef.current && !isGenerating) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  const classColor = RPG_CLASS_COLORS[config?.personality] || '#FFD700';
  const skinColor = getSkinHex(config?.skinTone);
  const hairColor = getHairHex(config?.hairColor);

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      {/* Body */}
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <capsuleGeometry args={[0.3, 0.9, 8, 16]} />
        <meshStandardMaterial
          color={classColor}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 0.82, 0]}>
        <sphereGeometry
          args={[0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]}
        />
        <meshStandardMaterial color={hairColor} roughness={0.9} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.1, 0.7, 0.24]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0.1, 0.7, 0.24]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Glow ring */}
      {isGenerating && (
        <mesh position={[0, 0.1, 0]}>
          <torusGeometry args={[0.5, 0.02, 8, 32]} />
          <meshStandardMaterial
            color={classColor}
            emissive={classColor}
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

// ===== GENIES AVATAR (real implementation) =====
function GeniesAvatar({ avatarId, _config, _isGenerating, onReady }) {
  const groupRef = useRef(null);
  const handleRef = useRef(null);
  const rendererRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!avatarId) return;

    const token = process.env.GENIES_API_KEY || '';
    let mounted = true;

    void (async () => {
      try {
        const ok = await initGenies(token);
        if (!mounted || !ok) return;

        if (!naf) {
          setError('Genies SDK not available');
          return;
        }

        // Try to load the avatar from Genies CAMP
        const avatarDef = {
          assets: [{ id: avatarId, version: '1' }]
        };

        const handle = await naf.loadAvatarProgressive(avatarDef, {
          renderer: rendererRef.current,
          scene: naf.getScene ? naf.getScene() : undefined,
          lod: [2, 0],
          idle: { id: 'idle_neutral', version: '1' }
        });

        if (!mounted) {
          handle.unload();
          return;
        }

        handleRef.current = handle;
        setLoaded(true);

        if (onReady) onReady(handle);
      } catch (e) {
        if (mounted) {
          console.error('[Genies] Avatar load error:', e);
          setError(e.message);
        }
      }
    })();

    return () => {
      mounted = false;
      if (handleRef.current) {
        handleRef.current.unload();
        handleRef.current = null;
      }
    };
  }, [avatarId, onReady]);

  useFrame((_, delta) => {
    if (!naf || !handleRef.current) return;

    const handle = handleRef.current;
    if (handle.controller) {
      handle.controller.update(delta);
      handle.controller.syncPose();
    }
    naf.update(delta);
  });

  if (error) return null;
  if (!loaded) return null;

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      {/* The NAF handle's mesh is added to the scene by the SDK */}
      {/* We render a small indicator here */}
      <mesh visible={false}>
        <boxGeometry args={[0.01, 0.01, 0.01]} />
      </mesh>
    </group>
  );
}

// ===== SCENE SETUP =====
function QuestScene({ config, isGenerating, avatarId, showGenies }) {
  const _canvasRef = useRef(null);
  const _fov = 45; // unused, kept for API compat

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight
        position={[-3, 2, -1]}
        intensity={0.3}
        color="#66FFFF"
      />
      <pointLight position={[0, 3, 2]} intensity={0.5} color="#FFD700" />
      <fog attach="fog" args={['#080B1A', 8, 20]} />

      {showGenies && avatarId ? (
        <GeniesAvatar
          avatarId={avatarId}
          config={config}
          isGenerating={isGenerating}
          onReady={() => {}}
        />
      ) : (
        <PlaceholderAvatar config={config} isGenerating={isGenerating} />
      )}

      {/* Ground */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.3, 0]}
        receiveShadow
      >
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#0a0a1a" roughness={0.9} />
      </mesh>

      {/* Subtle ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.29, 0]}>
        <ringGeometry args={[0.6, 0.65, 32]} />
        <meshStandardMaterial
          color="#FFD700"
          transparent
          opacity={0.15}
          emissive="#FFD700"
          emissiveIntensity={0.5}
        />
      </mesh>
    </>
  );
}

// ===== EXPORTED COMPONENT =====
export default function Avatar3D({
  config,
  isGenerating,
  avatarId,
  className = ''
}) {
  const [showGenies, setShowGenies] = useState(false);
  const [sdkError, setSdkError] = useState(null);

  useEffect(() => {
    // Attempt to init SDK on mount (non-blocking)
    const token = process.env.GENIES_API_KEY || '';
    if (token) {
      initGenies(token)
        .then((ready) => {
          if (ready) setShowGenies(true);
          else setSdkError('Genies SDK unavailable — showing 3D preview');
        })
        .catch(() =>
          setSdkError('Genies SDK unavailable — showing 3D preview')
        );
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0.5, 3.5], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <QuestScene
          config={config}
          isGenerating={isGenerating}
          avatarId={avatarId}
          showGenies={showGenies}
        />
      </Canvas>
      {!showGenies && !avatarId && (
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <span className="text-[10px] text-white/30 font-mono">
            3D Preview
          </span>
        </div>
      )}
      {sdkError && (
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <span className="text-[10px] text-white/30 font-mono">
            ⚡ {sdkError}
          </span>
        </div>
      )}
    </div>
  );
}

// ===== HELPERS (duplicated here for standalone usage) =====
const RPG_CLASS_COLORS = {
  romantic: '#FF69B4',
  adventurer: '#FFD700',
  scholar: '#00E5FF',
  mystic: '#9B59B6',
  champion: '#E74C3C'
};

const SKIN_TONES = [
  { name: 'Fair', hex: '#FDEBD0' },
  { name: 'Light', hex: '#F5CBA7' },
  { name: 'Medium', hex: '#DBA27A' },
  { name: 'Warm', hex: '#C68642' },
  { name: 'Olive', hex: '#8D5524' },
  { name: 'Deep', hex: '#5D3A1A' },
  { name: 'Dark', hex: '#3B2210' }
];

const HAIR_COLORS = [
  { name: 'Jet Black', hex: '#1C1209' },
  { name: 'Dark Brown', hex: '#3B2210' },
  { name: 'Brown', hex: '#6F4E37' },
  { name: 'Blonde', hex: '#D4A843' },
  { name: 'Auburn', hex: '#703629' },
  { name: 'Red', hex: '#A52A2A' },
  { name: 'Platinum', hex: '#E5D4B0' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Blue', hex: '#1E3A5F' },
  { name: 'Purple', hex: '#4A148C' }
];

function getSkinHex(name) {
  return SKIN_TONES.find((s) => s.name === name)?.hex || '#DBA27A';
}

function getHairHex(name) {
  return HAIR_COLORS.find((h) => h.name === name)?.hex || '#1C1209';
}
