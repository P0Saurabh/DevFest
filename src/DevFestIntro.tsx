import React, { useMemo, useRef, useEffect,  useCallback, useState } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { Stars, shaderMaterial } from '@react-three/drei';
import { InstancedBufferAttribute, InstancedMesh } from 'three';

// --- 1. Configuration ---
const CONFIG = {
  particleSize: 0.15,
  gap: 0.05,
  gridSize: 0.2, // distance between particle centers
  textWidthPx: 200,
  textHeightPx: 40,
  colors: {
    bracket: { r: 191, g: 255, b: 0, hex: '#BFFF00' }, // Neon Lime (R,G,B for programmatic check)
    blue: { r: 66, g: 133, b: 244, hex: '#4285F4' },
    red: { r: 234, g: 67, b: 53, hex: '#EA4335' },
    yellow: { r: 251, g: 188, b: 4, hex: '#FBBC04' },
    green: { r: 52, g: 168, b: 83, hex: '#34A853' },
  },
};

// --- 2. Data Generation (Hidden Canvas) ---
// This function generates the pixel data for the text and detects particle types
interface TextDataResult {
  count: number;
  positions: Float32Array;
  colors: Float32Array;
  types: Float32Array; // 0.0 = Text, 1.0 = Bracket
}

function createTextData(): TextDataResult {
  const { textWidthPx: width, textHeightPx: height } = CONFIG;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error("2D canvas context not available.");
    return { count: 0, positions: new Float32Array(0), colors: new Float32Array(0), types: new Float32Array(0) };
  }

  // Background (transparent)
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, width, height);

  // Font Setup
  const fontSize = 20;
  const centerY = height / 2 + fontSize / 3; // Adjust for vertical centering

  // Helper to draw text with specific color and font
  const drawText = (text: string, x: number, y: number, color: string, font: string) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    return ctx.measureText(text).width;
  };

  // 1. Draw Brackets ({ and })
  ctx.textAlign = 'center';
  drawText('{', 20, centerY, CONFIG.colors.bracket.hex, `bold ${fontSize}px monospace`);
  drawText('}', width - 20, centerY, CONFIG.colors.bracket.hex, `bold ${fontSize}px monospace`);

  // 2. Draw "DevFest"
  ctx.textAlign = 'left';
  let currentX = 45;
  currentX += drawText('Dev', currentX, centerY, CONFIG.colors.blue.hex, `bold ${fontSize}px sans-serif`);
  currentX += drawText('Fest', currentX, centerY, CONFIG.colors.red.hex, `bold ${fontSize}px sans-serif`);

  // 3. Draw "2025"
  currentX += 10; // Spacing after DevFest
  currentX += drawText('20', currentX, centerY, CONFIG.colors.yellow.hex, `bold ${fontSize}px sans-serif`);
  drawText('25', currentX, centerY, CONFIG.colors.green.hex, `bold ${fontSize}px sans-serif`);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixelData = imageData.data;

  const tempPos: number[] = [];
  const tempColor: number[] = [];
  const tempType: number[] = [];

  // Parse pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      const a = pixelData[i + 3];

      if (a > 0) { // If pixel is not fully transparent
        // Center the grid around (0,0,0)
        const pX = (x - width / 2) * CONFIG.gridSize;
        const pY = -(y - height / 2) * CONFIG.gridSize; // Invert Y for canvas coords
        const pZ = 0;

        tempPos.push(pX, pY, pZ);

        // Normalize color (0-1)
        tempColor.push(r / 255, g / 255, b / 255);

        // Detect Type: Check if it is the Neon Lime color (approximate check)
        const isBracket = (r >= 190 && r <= 192 && g >= 254 && g <= 255 && b >= 0 && b <= 1);
        tempType.push(isBracket ? 1.0 : 0.0);
      }
    }
  }

  return {
    count: tempPos.length / 3,
    positions: new Float32Array(tempPos),
    colors: new Float32Array(tempColor),
    types: new Float32Array(tempType),
  };
}

// --- 3. The Shader (GLSL) ---
// Define ShaderMaterial uniforms and attributes
type ParticleShaderMaterialProps = {
  uTime: number;
  uProgress: number; // 0 = closed, 1 = open
  uMouse: THREE.Vector3; // World space mouse
  // uResolution: THREE.Vector2; // Not strictly needed if not doing screen-space effects
};

// Declare the type for our extended material
declare module '@react-three/fiber' {
  interface ThreeElements {
    particleShaderMaterial: Partial<ParticleShaderMaterialProps> & JSX.IntrinsicElements['shaderMaterial'];
  }
}

const ParticleShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uProgress: 0, // 0 = closed, 1 = open
    uMouse: new THREE.Vector3(0, 0, 0),
  },
  // Vertex Shader
  `
    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uMouse;
    
    attribute vec3 aColor;
    attribute float aType; // 0.0 = Text, 1.0 = Bracket
    attribute vec3 aInstancePosition; // Original grid position
    
    varying vec3 vColor;
    varying float vType;
    varying float vHoverFactor; // Pass hover intensity to fragment
    varying float vRevealFactor; // Pass reveal intensity to fragment for consistent color
    
    // Easing: Cubic Out
    float easeOutCubic(float x) {
      return 1.0 - pow(1.0 - x, 3.0);
    }

    void main() {
      vColor = aColor;
      vType = aType;
      vHoverFactor = 0.0; // Default to no hover

      vec3 finalPos = aInstancePosition;
      
      float easedProgress = easeOutCubic(uProgress);
      
      // --- 1. Bracket Movement (The Curtain) ---
      if (aType > 0.5) { // It's a bracket
        float dir = sign(aInstancePosition.x); // -1 for left bracket, 1 for right
        
        // Brackets start closer to center and move to their original position
        float startXOffset = dir * 1.5; // How close to center when closed
        finalPos.x = mix(startXOffset, aInstancePosition.x, easedProgress);
      }
      
      // --- 2. Text Reveal & Rise Up ---
      float currentCurtainEdgeX = mix(1.5, 9.5, easedProgress); // Approximate X position of the inner edge of the curtain
      
      if (aType < 0.5) { // It's text
         // Calculate distance from this particle to the nearest curtain edge
         float distToCurtain = currentCurtainEdgeX - abs(finalPos.x);
         
         // Smoothly transition reveal factor based on distance to curtain
         // Negative distToCurtain means it's still hidden by the curtain
         vRevealFactor = smoothstep(-2.0, 1.0, distToCurtain); // Reveals over a 3-unit distance

         // Rise Effect:
         // Text starts lower when hidden and rises as it's revealed
         float yOffset = (1.0 - vRevealFactor) * -5.0; // Moves 5 units down when hidden
         finalPos.y += yOffset;
         
         // Scale down if hidden (makes it truly disappear)
         float scale = mix(0.0, 1.0, vRevealFactor);
         finalPos *= scale;
      } else { // Brackets are always revealed
         vRevealFactor = 1.0; 
      }

      // --- 3. Interactivity (Mouse Physics) ---
      // Apply only if the particle is visible/revealed
      if (vRevealFactor > 0.01) { 
        float distToMouse = distance(finalPos.xy, uMouse.xy);
        float hoverRadius = 3.5; // Radius of mouse influence
        
        if (distToMouse < hoverRadius) {
          float force = (1.0 - distToMouse / hoverRadius); // 0 to 1 strength
          force = easeOutCubic(force); // Apply easing for a smoother repulsion
          
          // Repel X/Y
          vec3 dir = normalize(finalPos - uMouse);
          finalPos.xy += dir.xy * force * 0.7; // Stronger repulsion
          
          // Lift Z
          finalPos.z += force * 2.0; // Lift towards camera
          
          vHoverFactor = force; // Pass force to fragment for color highlight
        }
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    varying vec3 vColor;
    varying float vType;
    varying float vHoverFactor;
    varying float vRevealFactor;

    void main() {
      // Discard fragment if not visible (due to scaling in vertex shader)
      if (vRevealFactor < 0.01) {
          discard;
      }
      
      vec3 finalColor = vColor;

      // Apply hover highlight: mix towards bright white
      // Only apply if actively hovering and visible
      if (vHoverFactor > 0.0) {
        finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), vHoverFactor); // Mix with white based on hover intensity
      }
      
      // Add a slight glow effect for brackets, make text slightly dimmer
      if (vType > 0.5) { // Bracket
          finalColor *= 1.1; // Boost brightness
      } else { // Text
          finalColor *= 0.9; // Slightly dim text for contrast
      }
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ ParticleShaderMaterial });

// --- 4. The Main Component ---
const IntroScene: React.FC = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  // Generate Data (only once)
  const { count, positions, colors, types } = useMemo(createTextData, []);

  // Set initial attributes to the InstancedMesh's geometry
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry.setAttribute(
        'aInstancePosition',
        new InstancedBufferAttribute(positions, 3)
      );
      meshRef.current.geometry.setAttribute(
        'aColor',
        new InstancedBufferAttribute(colors, 3)
      );
      meshRef.current.geometry.setAttribute(
        'aType',
        new InstancedBufferAttribute(types, 1)
      );
    }
  }, [positions, colors, types]);


  // Update shader uniforms in the animation loop
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const duration = 3.5; // Animation duration in seconds
    const delay = 0.5; // Start animation after 0.5 seconds

    // Calculate progress, clamping it between 0 and 1
    const progress = Math.min(Math.max((t - delay) / duration, 0), 1);
const [_animationProgress] = useState(0);

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t;
      materialRef.current.uniforms.uProgress.value = progress;
    }
  });

  // Mouse interaction logic
  const handlePointerMove = useCallback((event: any) => {
    // `event.point` is the world position where the raycaster hit the object
    if (materialRef.current && event.point) {
      materialRef.current.uniforms.uMouse.value.copy(event.point);
    }
  }, []);

  return (
    <group>
      {/* An invisible plane to catch mouse events for raycasting */}
      <mesh 
        position={[0, 0, -0.1]} // Slightly behind particles to avoid self-intersection
        onPointerMove={handlePointerMove}
        visible={false} // Make it invisible
      >
        <planeGeometry args={[viewport.width * 2, viewport.height * 2]} /> {/* Large enough to cover screen */}
        <meshBasicMaterial transparent opacity={0} /> {/* Fully transparent */}
      </mesh>

      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        {/* Geometry for each instance (a small cube) */}
        <boxGeometry args={[CONFIG.particleSize, CONFIG.particleSize, CONFIG.particleSize]} />
        
        {/* Our custom shader material */}
        <particleShaderMaterial
          ref={materialRef}
          transparent // Allow for discard and potential alpha fading
          depthWrite={false} // Improves rendering for transparent/discarded particles
        />
      </instancedMesh>
    </group>
  );
};

// --- 5. App Entry Point ---
const DevFestIntro: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas 
        camera={{ position: [0, 0, 15], fov: 45 }}
        onPointerMove={() => {}} // Dummy handler to ensure raycaster is active on canvas itself
      >
        <color attach="background" args={['#050505']} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <IntroScene />
        
      </Canvas>
    </div>
  );
}

export default DevFestIntro;