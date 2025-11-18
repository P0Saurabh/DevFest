// import React, { useRef, useState, useMemo, Suspense } from 'react';
// import { Canvas, useFrame, useLoader } from '@react-three/fiber';
// // Explicitly import required types and classes from 'three'
// import { TextureLoader, Mesh, Material, BoxGeometry, Float32BufferAttribute, Texture } from 'three'; 
// import { useProgress, Html } from '@react-three/drei';

// // --- Type Definitions ---
// interface CardSection {
//   id: number;
//   title: string;
//   content: string;
//   color: string;
//   image: string;
// }

// interface AnimatedCubeProps {
//   initialPosition: [number, number, number];
//   texture: Texture;
//   dissolveProgress: number;
//   gridX: number;a
//   gridY: number;
// }

// interface TextureWrapperProps {
//     imageUrl: string;
//     dissolveProgress: number;
// }

// // --- Configuration Constants ---
// const GRID_SIZE = 15; // 15x15 grid of cubes
// const DURATION = 1.5; // Animation duration in seconds
// const CUBE_SIZE = 1 / GRID_SIZE; 
// const SCATTER_DISTANCE = 3; 
// const CUBE_DEPTH = 0.1;

// // --- Mock Data (Typed Array) ---
// const CARD_SECTIONS: CardSection[] = [
//   { id: 1, title: "Marketing Strategy", content: "Our strategy focuses on data-driven campaigns, optimizing SEO/SEM, and leveraging social channels for maximum reach.", color: "bg-blue-600", image: "https://placehold.co/100x100/1D4ED8/FFFFFF?text=Mkt" },
//   { id: 2, title: "Product Development", content: "We emphasize agile methodologies, continuous user feedback, and rapid prototyping to deliver features quickly and reliably.", color: "bg-green-600", image: "https://placehold.co/100x100/047857/FFFFFF?text=Dev" },
//   { id: 3, title: "Financial Analysis", content: "Detailed quarterly reviews, cost-benefit analysis of all new projects, and long-term capital forecasting for stability and growth.", color: "bg-red-600", image: "https://placehold.co/100x100/B91C1C/FFFFFF?text=Fin" },
// ];

// // --- 3D Components ---

// // 1. Loader Component (For Canvas Suspense fallback)
// const Loader: React.FC = () => {
//     const { progress } = useProgress();
//     return (
//         <Html center>
//             <div className="text-white text-lg font-mono">
//                 Loading 3D Assets... {progress.toFixed(0)}%
//             </div>
//         </Html>
//     );
// };

// // 2. The Animated Cube Tile
// const AnimatedCube: React.FC<AnimatedCubeProps> = ({ initialPosition, texture, dissolveProgress, gridX, gridY }) => {
//   // Specify Mesh type for the ref
//   const meshRef = useRef<Mesh>(null);
//   const [randomOffset] = useState<number>(() => Math.random() * 0.5); 
  
//   // Custom Geometry with UV Mapping
//   const geometry = useMemo(() => {
//     // Use the imported BoxGeometry class
//     const geom = new BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE * CUBE_DEPTH);
    
//     // UV Mapping setup
//     const uv = geom.attributes.uv.array as number[];
//     const normalizedSize = 1 / GRID_SIZE;
    
//     const uStart = gridX * normalizedSize;
//     const vStart = gridY * normalizedSize;
//     const uEnd = uStart + normalizedSize;
//     const vEnd = vStart + normalizedSize;
    
//     // Apply UVs to the front face (indices 24-29)
//     uv[24] = uStart; uv[25] = vEnd;
//     uv[26] = uStart; uv[27] = vStart;
//     uv[28] = uEnd;   uv[29] = vEnd;
    
//     uv[30] = uStart; uv[31] = vStart;
//     uv[32] = uEnd;   uv[33] = vStart;
//     uv[34] = uEnd;   uv[35] = vEnd;
    
//     // Use the imported Float32BufferAttribute class
//     geom.attributes.uv = new Float32BufferAttribute(uv, 2);
//     return geom;
//   }, [gridX, gridY]);

//   useFrame(() => {
//     if (!meshRef.current) return;

//     // Type cast to Material to access opacity safely
//     const material = meshRef.current.material as Material;
//     const centerOffset = (GRID_SIZE / 2) * CUBE_SIZE - CUBE_SIZE / 2;
//     const [startX, startY] = initialPosition;
    
//     // Normalize time t
//     const t = Math.max(0, Math.min(1, (dissolveProgress - randomOffset) / DURATION)); 

//     // 1. Calculate the final scattered position 
//     const finalX = startX * SCATTER_DISTANCE * 0.8;
//     const finalY = startY * SCATTER_DISTANCE * 0.8;
//     const finalZ = (Math.random() - 0.5) * 5; 

//     // 2. Interpolate position
//     const currentX = (startX - centerOffset) * (1 - t) + finalX * t;
//     const currentY = (startY - centerOffset) * (1 - t) + finalY * t;
//     const currentZ = initialPosition[2] * (1 - t) + finalZ * t;
    
//     meshRef.current.position.set(currentX, currentY, currentZ);

//     // 3. Rotation and Opacity
//     meshRef.current.rotation.x += 0.05 * t;
//     meshRef.current.rotation.y += 0.05 * t;

//     material.opacity = Math.max(0, 1 - t);
//   });

//   return (
//     <mesh ref={meshRef} geometry={geometry}>
//       <meshStandardMaterial map={texture} transparent />
//     </mesh>
//   );
// }

// // 3. Texture and Grid Generator
// const TextureWrapper: React.FC<TextureWrapperProps> = React.memo(({ imageUrl, dissolveProgress }) => {
//     // useLoader is type-safe and returns the imported Texture type
//     const texture = useLoader(TextureLoader, imageUrl);
    
//     // Workaround for environments where R3F dependencies might access THREE globally
//     if (typeof window !== 'undefined' && !(window as any).THREE) {
//         (window as any).THREE = {};
//     }

//     const cubes = useMemo(() => {
//         const pieces: JSX.Element[] = [];
//         const offset = CUBE_SIZE / 2; 

//         for (let i = 0; i < GRID_SIZE; i++) {
//             for (let j = 0; j < GRID_SIZE; j++) {
                
//                 const initialPosition: [number, number, number] = [
//                     i * CUBE_SIZE + offset,
//                     j * CUBE_SIZE + offset,
//                     0,
//                 ];

//                 pieces.push(
//                     <AnimatedCube
//                         key={`${i}-${j}`}
//                         initialPosition={initialPosition}
//                         texture={texture}
//                         dissolveProgress={dissolveProgress}
//                         gridX={i}
//                         gridY={GRID_SIZE - 1 - j} 
//                     />
//                 );
//             }
//         }
//         return pieces;
//     }, [texture, dissolveProgress]);

//     return (
//         <>{cubes}</>
//     );
// });


// // --- SectionCard Component (Main Export) ---

// const SectionCard: React.FC = () => {
//   // Add types to useState hooks
//   const [selectedSection, setSelectedSection] = useState<CardSection | null>(null); 
//   const [isDissolving, setIsDissolving] = useState<boolean>(false); 
//   const [dissolveProgress, setDissolveProgress] = useState<number>(0); 
//   const [cardImageUrl, setCardImageUrl] = useState<string>(CARD_SECTIONS[0].image);

//   const startDissolve = (section: CardSection) => {
//     if (isDissolving) return; 

//     setCardImageUrl(section.image);
//     setSelectedSection(section);
//     setIsDissolving(true);
//     setDissolveProgress(0);

//     const startTime = performance.now();
//     const interval = setInterval(() => {
//       const elapsed = (performance.now() - startTime) / 1000;
//       setDissolveProgress(elapsed);

//       if (elapsed > DURATION + 0.5) { 
//         clearInterval(interval);
//         // Reset dissolving flag slightly later to prevent immediate re-triggering
//         setTimeout(() => setIsDissolving(false), 500); 
//       }
//     }, 16); 
//   };

//   const resetCard = () => {
//     // Only allow resetting if a section is selected and we are not dissolving
//     if (selectedSection) {
//         setSelectedSection(null);
//         setDissolveProgress(0);
//         setIsDissolving(false);
//     }
//   }

//   // Determine if the detailed view should be shown
//   const showDetailedView = dissolveProgress > DURATION * 1.5 && selectedSection;
  
//   // --- Main Content Render ---
//   return (
//     <div className="flex justify-center items-center h-screen bg-gray-100 p-4">
      
//       {/* The main card container */}
//       <div 
//         className="w-full max-w-4xl h-full max-h-[600px] bg-white shadow-2xl rounded-xl overflow-hidden transition-all duration-700 relative"
//         style={{ perspective: '1000px' }}
//       >
        
//         {/* --- Detailed View (After Dissolve) --- */}
//         {showDetailedView ? (
//           <div className={`p-8 h-full flex flex-col items-start ${selectedSection!.color} text-white relative`}>
//             <button 
//                 onClick={resetCard} // Use the type-safe reset function
//                 className="absolute top-4 right-4 text-white text-3xl hover:text-gray-200 transition p-2 rounded-full hover:bg-white/10"
//                 aria-label="Close detailed view"
//             >
//                 &times;
//             </button>
//             <h1 className="text-5xl font-extrabold mb-4">{selectedSection!.title}</h1>
//             <p className="text-xl opacity-90 mb-8">Detailed Information</p>
//             <div className="bg-white/10 p-6 rounded-lg w-full">
//                 <p className="text-2xl leading-relaxed">{selectedSection!.content}</p>
//                 <p className="mt-6 text-sm italic">This comprehensive view was revealed using a digital particle deconstruction effect.</p>
//             </div>
//           </div>
//         ) : (
          
//           /* --- Initial View (Before Dissolve) --- */
//           <div className="flex h-full transition-all duration-700 relative">
            
//             {/* 3D Dissolve Container (Always present but hidden when not dissolving) */}
//             <div 
//                 className={`absolute inset-0 z-10 transition-opacity duration-500`}
//                 style={{ opacity: dissolveProgress > 0 ? 1 : 0, pointerEvents: 'none' }}
//             >
//                 <Canvas 
//                     camera={{ position: [0, 0, 1.5], fov: 60 }} 
//                     fallback={<Loader />}
//                 >
//                     <ambientLight intensity={0.8} />
//                     <pointLight position={[2, 2, 2]} intensity={1.5} />
//                     <Suspense fallback={null}>
//                         <TextureWrapper 
//                             imageUrl={cardImageUrl} 
//                             dissolveProgress={dissolveProgress} 
//                         />
//                     </Suspense>
//                 </Canvas>
//             </div>

//             {/* Section Grids (Base Content) */}
//             {CARD_SECTIONS.map((section, index) => (
//               <div 
//                 key={section.id}
//                 className={`flex-1 flex flex-col justify-center items-center p-6 border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-gray-50 transition duration-300 transform hover:scale-[1.01] ${section.color} text-white`}
//                 onClick={() => startDissolve(section)}
//                 style={{ zIndex: 5, pointerEvents: isDissolving ? 'none' : 'auto' }} // Disable clicks during dissolve
//               >
//                 <img 
//                     src={section.image} 
//                     alt={section.title} 
//                     className="w-24 h-24 rounded-full shadow-lg mb-4 object-cover"
//                 />
//                 <h2 className="text-3xl font-bold mb-2">{section.title}</h2>
//                 <p className="text-sm text-center opacity-80">Click to reveal details</p>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default SectionCard;