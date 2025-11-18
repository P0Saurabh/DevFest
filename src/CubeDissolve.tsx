import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
// ✅ Import all necessary classes/types explicitly from 'three'
import { TextureLoader, Mesh, Material, Float32BufferAttribute, Texture } from 'three';
import { OrbitControls, useProgress, Html } from '@react-three/drei';

// --- Configuration Constants ---
const GRID_SIZE = 20; 
const DURATION = 3; 
const CUBE_SIZE = 1 / GRID_SIZE; 
const SCATTER_DISTANCE = 5; 
const CUBE_DEPTH = 0.1; // Make it a flat tile for simple texture mapping

// --- Type Definitions ---
interface AnimatedCubeProps {
  initialPosition: [number, number, number];
  texture: Texture; 
  isDissolving: boolean; 
  gridX: number; // New: Grid index for UV mapping
  gridY: number; // New: Grid index for UV mapping
}

interface CubeDissolveProps {
  imageUrl: string;
  isDissolving: boolean;
}

// 1. Loader Component (For Canvas Suspense fallback)
const Loader = () => {
    const { progress } = useProgress();
    return (
        <Html center>
            <p style={{ color: 'white' }}>Loading image... {progress.toFixed(0)}%</p>
        </Html>
    );
};

// --- AnimatedCube Component ---

function AnimatedCube({ initialPosition, texture, isDissolving, gridX, gridY }: AnimatedCubeProps) {
  const meshRef = useRef<Mesh>(null);
  const [randomOffset] = useState(() => Math.random() * 0.5); 
  
  // Use useMemo to generate the cube geometry with correct UVs once
  const geometry = useMemo(() => {
    const geom = new (window as any).THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE * CUBE_DEPTH);
    
    // --- UV Mapping to show only the correct portion of the image ---
    // The BoxGeometry has 12 faces * 3 vertices per face = 36 vertices total.
    // The front face corresponds to the last 6 vertices/2 faces (indices 24-29).
    const uv = geom.attributes.uv.array as number[];
    const normalizedSize = 1 / GRID_SIZE;
    
    // Calculate the UV coordinates for this specific tile
    const uStart = gridX * normalizedSize;
    const vStart = gridY * normalizedSize;
    const uEnd = uStart + normalizedSize;
    const vEnd = vStart + normalizedSize;
    
    // Apply UVs only to the front face (indices 24-29)
    // Face 1 (Triangle 1)
    uv[24] = uStart; uv[25] = vEnd;
    uv[26] = uStart; uv[27] = vStart;
    uv[28] = uEnd;   uv[29] = vEnd;
    
    // Face 2 (Triangle 2)
    uv[30] = uStart; uv[31] = vStart;
    uv[32] = uEnd;   uv[33] = vStart;
    uv[34] = uEnd;   uv[35] = vEnd;
    
    geom.attributes.uv = new Float32BufferAttribute(uv, 2);
    return geom;
  }, [gridX, gridY]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const material = meshRef.current.material as Material;
    const centerOffset = (GRID_SIZE / 2) * CUBE_SIZE - CUBE_SIZE / 2;
    const [startX, startY] = initialPosition;

    if (!isDissolving) {
        // Not dissolving: hold initial position
        meshRef.current.position.set(startX - centerOffset, startY - centerOffset, initialPosition[2]);
        material.opacity = 1;
        return;
    }

    const elapsed = clock.getElapsedTime();
    const t = Math.max(0, Math.min(1, (elapsed - randomOffset) / DURATION)); 

    // Dissolve Animation
    const finalX = startX * SCATTER_DISTANCE;
    const finalY = startY * SCATTER_DISTANCE;
    const finalZ = (Math.random() - 0.5) * 10; 

    const currentX = (startX - centerOffset) * (1 - t) + finalX * t;
    const currentY = (startY - centerOffset) * (1 - t) + finalY * t;
    const currentZ = initialPosition[2] * (1 - t) + finalZ * t;
    
    meshRef.current.position.set(currentX, currentY, currentZ);

    meshRef.current.rotation.x += 0.05 * t;
    meshRef.current.rotation.y += 0.05 * t;

    material.opacity = Math.max(0, 1 - t);
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial map={texture} transparent />
    </mesh>
  );
}

// --- Texture Loader Wrapper Component ---
const TextureWrapper = React.memo(({ imageUrl, isDissolving }: CubeDissolveProps) => {
    const texture = useLoader(TextureLoader, imageUrl);
    
    // This is a common workaround for a persistent R3F issue where THREE is accessed globally
    // We make sure the BufferAttribute class is available globally if needed by internal dependencies.
    if (!(window as any).THREE) {
        (window as any).THREE = {};
    }
    (window as any).THREE.BoxGeometry = (window as any).THREE.BoxGeometry || new (window as any).THREE.BoxGeometry().constructor;


    const cubes = useMemo(() => {
        const pieces = [];
        const offset = CUBE_SIZE / 2; 

        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                
                const initialPosition: [number, number, number] = [
                    i * CUBE_SIZE + offset,
                    j * CUBE_SIZE + offset,
                    0,
                ];

                pieces.push(
                    <AnimatedCube
                        key={`${i}-${j}`}
                        initialPosition={initialPosition}
                        texture={texture}
                        isDissolving={isDissolving}
                        gridX={i}
                        gridY={GRID_SIZE - 1 - j} // Flip Y for correct UV mapping (UV coordinates start at the bottom)
                    />
                );
            }
        }
        return pieces;
    }, [texture, isDissolving]);

    return (
        <>
            {cubes}
            <OrbitControls enableZoom={true} />
        </>
    );
});


// --- CubeDissolve Component (Main Export) ---
export function CubeDissolve({ imageUrl, isDissolving }: CubeDissolveProps) {
    return (
        <div style={{ height: '100vh', width: '100vw', background: '#222' }}>
            <Canvas 
                camera={{ 
                    position: [0, 0, 1.5], 
                    fov: 60 
                }}
                fallback={<Loader />} 
            >
                <ambientLight intensity={0.8} />
                <pointLight position={[2, 2, 2]} intensity={1.5} />
                
                {/* Wrap the texture loading in a Suspense-compliant component */}
                <React.Suspense fallback={null}>
                    <TextureWrapper 
                        imageUrl={imageUrl} 
                        isDissolving={isDissolving} 
                    />
                </React.Suspense>
            </Canvas>
        </div>
    );
}