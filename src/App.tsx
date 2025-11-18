// App.tsx
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Stars, shaderMaterial, PerspectiveCamera } from '@react-three/drei';
import { InstancedMesh } from 'three';
import { ChevronDown, Github, Calendar, ArrowUpRight } from 'lucide-react';

// ------------------------------------------------------
// 0. PROJECT CARD (Sessions / Workshops)
// ------------------------------------------------------
export interface ProjectProps {
  title: string;
  description: string;
  thumbnail?: string;
  tags: string[];
  repoUrl?: string;
  demoUrl?: string;
  date?: string;
  role?: string;
}

interface ProjectOverviewCardProps {
  project: ProjectProps;
  className?: string;
}

const ProjectOverviewCard: React.FC<ProjectOverviewCardProps> = ({
  project,
  className = '',
}) => {
  const { title, description, thumbnail, tags, repoUrl, demoUrl, date, role } = project;
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black/80 transition-all duration-300 hover:-translate-y-1 hover:border-lime-400/70 hover:shadow-[0_18px_45px_rgba(15,23,42,0.9)] ${className}`}
    >
      {thumbnail ? (
        <div className="relative h-44 w-full overflow-hidden bg-zinc-900">
          <img
            src={thumbnail}
            alt={title}
            className="h-full w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-200">
            {role || 'Session'}
          </div>
        </div>
      ) : (
        <div className="h-32 w-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center justify-between text-[11px] font-medium text-zinc-500">
          <span className="flex items-center gap-1 uppercase tracking-[0.15em]">
            {role || 'Session'}
          </span>
          {date && (
            <span className="flex items-center gap-1 text-zinc-400">
              <Calendar className="h-3 w-3" />
              {date}
            </span>
          )}
        </div>
        <h3 className="mb-2 text-lg font-semibold text-zinc-50 group-hover:text-lime-300">
          {title}
        </h3>
        <p className="mb-5 line-clamp-3 flex-1 text-sm text-zinc-400">
          {description}
        </p>
        <div className="mb-5 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-medium text-zinc-300 shadow-sm shadow-black/40"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-4 border-t border-zinc-800 pt-4">
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-50"
            >
              <Github className="h-4 w-4" />
              Resources
            </a>
          )}
          {demoUrl && (
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-2 rounded-full bg-zinc-50 px-4 py-1.5 text-xs font-semibold text-black shadow shadow-zinc-50/30 transition-transform hover:scale-105"
            >
              Join Session
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------
// 1. 3D CONFIG
// ------------------------------------------------------
const CONFIG = {
  gridRows: 60,
  gridCols: 120,
  cubeSize: 0.15,
  gap: 0.01,
  hoverRadius: 2.5,
  animDuration: 2.5,
};

// ------------------------------------------------------
// 2. CANVAS TEXT → INSTANCED DATA
// ------------------------------------------------------
function createTextData() {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      count: 0,
      positions: new Float32Array(0),
      colors: new Float32Array(0),
      types: new Float32Array(0),
      uvs: new Float32Array(0),
    };
  }

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = width / 2;
  const cy = height / 2;

  // Brackets (grey like poster)
  ctx.font = 'bold 650px "Courier New", monospace';
  ctx.fillStyle = '#999999';
  ctx.fillText('{', cx - 860, cy);
  ctx.fillText('}', cx + 860, cy);

  // DevFest text
  ctx.font = 'bold 320px "Inter", sans-serif';
  ctx.fillStyle = '#4285F4';
  ctx.fillText('Dev', cx - 240, cy - 40);
  ctx.fillStyle = '#EA4335';
  ctx.fillText('Fest', cx + 370, cy - 40);

  // 20 / 25 like poster
  ctx.font = 'bold 260px "Inter", sans-serif';
  ctx.fillStyle = '#FBBC04';
  ctx.fillText('20', cx - 150, cy + 260);
  ctx.fillStyle = '#34A853';
  ctx.fillText('25', cx + 180, cy + 260);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  const positions: number[] = [];
  const colors: number[] = [];
  const types: number[] = [];
  const uvs: number[] = [];

  const rows = CONFIG.gridRows;
  const cols = CONFIG.gridCols;
  const totalWidth = cols * (CONFIG.cubeSize + CONFIG.gap);
  const totalHeight = rows * (CONFIG.cubeSize + CONFIG.gap);
  const offsetX = -totalWidth / 2;
  const offsetY = -totalHeight / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = c / cols;
      const v = r / rows;

      const px = Math.floor(u * width);
      const py = Math.floor((1.0 - v) * height);
      const i = (py * width + px) * 4;

      const red = pixels[i];
      const green = pixels[i + 1];
      const blue = pixels[i + 2];

      if (red < 20 && green < 20 && blue < 20) continue;

      const isGrey = Math.abs(red - green) < 10 && Math.abs(green - blue) < 10;

      positions.push(
        offsetX + c * (CONFIG.cubeSize + CONFIG.gap),
        offsetY + r * (CONFIG.cubeSize + CONFIG.gap),
        0
      );
      colors.push(red / 255, green / 255, blue / 255);
      types.push(isGrey ? 1.0 : 0.0);
      uvs.push(u, v);
    }
  }

  return {
    count: positions.length / 3,
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    types: new Float32Array(types),
    uvs: new Float32Array(uvs),
  };
}

// ------------------------------------------------------
// 3. SHADER MATERIAL
// ------------------------------------------------------
const TechShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uProgress: 0,
    uMouse: new THREE.Vector3(0, 0, 0),
    uHoverStrength: 2.0,
  },
  // Vertex
  `
    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uMouse;
    uniform float uHoverStrength;

    attribute vec3 aColor;
    attribute float aType; // 0 = Text, 1 = Bracket
    attribute vec3 aInstancePosition;
    attribute vec2 aUv;

    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vReveal;

    float easeOutCubic(float x) {
      return 1.0 - pow(1.0 - x, 3.0);
    }

    void main() {
      vColor = aColor;
      vUv = aUv;
      vNormal = normalMatrix * normal;

      vec3 pos = aInstancePosition;

      float ease = easeOutCubic(uProgress);

      if (aType > 0.5) {
        // Brackets slide open from center
        pos.x = mix(0.0, aInstancePosition.x, ease);
        vReveal = 1.0;
      } else {
        // Text reveal from center like a curtain
        float curtainX = 12.0 * ease;
        float distFromCenter = abs(aInstancePosition.x);

        float scale = 0.0;
        if (distFromCenter < curtainX - 1.0) {
          scale = 1.0;
        } else if (distFromCenter < curtainX) {
          scale = curtainX - distFromCenter;
        }

        pos *= scale;
        vReveal = scale;
      }

      if (vReveal > 0.1 && uProgress > 0.5) {
        float d = distance(pos.xy, uMouse.xy);
        float radius = 2.5;
        if (d < radius) {
          float pull = 1.0 - (d / radius);
          pos.z += pull * uHoverStrength;
        }
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment
  `
    uniform float uTime;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vReveal;

    void main() {
      if (vReveal < 0.01) discard;

      float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
      float scan = sin(vUv.y * 50.0 - uTime * 3.0) * 0.1;

      vec3 finalColor = vColor * 1.1;
      finalColor += vec3(rim * 0.35);
      finalColor += vec3(scan);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);
extend({ TechShaderMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      techShaderMaterial: any;
    }
  }
}

// ------------------------------------------------------
// 4. HERO 3D SCENE
// ------------------------------------------------------
const DevFestHeroScene: React.FC = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const matRef = useRef<any>(null);
  const { count, positions, colors, types, uvs } = useMemo(createTextData, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const progress = THREE.MathUtils.clamp(t / CONFIG.animDuration, 0, 1);
    if (matRef.current) {
      matRef.current.uTime = t;
      matRef.current.uProgress = progress;
    }
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (matRef.current) {
      matRef.current.uMouse.copy(e.point);
    }
  };

  return (
    <group>
      {/* Invisible plane to capture pointer movement */}
      <mesh visible={false} onPointerMove={onMove} position={[0, 0, 0]}>
        <planeGeometry args={[60, 30]} />
        <meshBasicMaterial />
      </mesh>

      <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, count]} frustumCulled={false}>
        <boxGeometry args={[CONFIG.cubeSize, CONFIG.cubeSize, 0.2]}>
          {/* @ts-ignore */}
          <instancedBufferAttribute attach="attributes-aInstancePosition" args={[positions, 3]} />
          {/* @ts-ignore */}
          <instancedBufferAttribute attach="attributes-aColor" args={[colors, 3]} />
          {/* @ts-ignore */}
          <instancedBufferAttribute attach="attributes-aType" args={[types, 1]} />
          {/* @ts-ignore */}
          <instancedBufferAttribute attach="attributes-aUv" args={[uvs, 2]} />
        </boxGeometry>
        {/* @ts-ignore */}
        <techShaderMaterial ref={matRef} transparent />
      </instancedMesh>
    </group>
  );
};

// ------------------------------------------------------
// 5. MAIN DEVFEST PAGE
// ------------------------------------------------------
const App: React.FC = () => {
  const sessions: ProjectProps[] = [
    {
      title: 'Kubernetes Auto-Scaler Deep Dive',
      description:
        'Build a custom HPA using Prometheus metrics, queue depth and latency signals – live coding & demo.',
      tags: ['Kubernetes', 'Go', 'Prometheus'],
      role: 'Hands-on Lab',
      date: '10:00 AM',
      repoUrl: '#',
      thumbnail:
        'https://images.unsplash.com/photo-1667372393119-c8f7585c2111?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'GitOps in Real World Production',
      description:
        'End-to-end GitOps workflow with ArgoCD, multi-cluster deployments and safe rollbacks.',
      tags: ['GitOps', 'ArgoCD', 'Terraform'],
      role: 'Talk',
      date: '12:00 PM',
      repoUrl: '#',
    },
  ];

  const speakers = [
    {
      name: 'Rohan Pawar',
      title: 'Cloud & DevOps Engineer',
      tags: ['Cloud Native', 'Data Pipelines'],
    },
    {
      name: 'Guest Speaker',
      title: 'Developer Relations',
      tags: ['Web', 'Community'],
    },
    {
      name: 'ML Engineer',
      title: 'AI & LLMs',
      tags: ['GenAI', 'MLOps'],
    },
  ];

  const schedule = [
    { time: '09:00 AM', label: 'Check-in & Coffee' },
    { time: '10:00 AM', label: 'Keynote: Building for Developers, not just Users' },
    { time: '11:00 AM', label: 'Parallel Tracks: Web · Cloud · AI' },
    { time: '02:00 PM', label: 'Hands-on Workshops & Labs' },
    { time: '05:00 PM', label: 'Community Showcase & Networking' },
  ];

  return (
    <main className="relative min-h-screen w-full bg-zinc-950 text-white selection:bg-lime-400 selection:text-black">
      {/* subtle background shapes inspired by poster */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-10 top-24 h-40 w-40 rounded-full bg-gradient-to-br from-sky-500/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute -right-16 bottom-40 h-56 w-56 rounded-full bg-gradient-to-tl from-emerald-500/20 via-transparent to-transparent blur-3xl" />
      </div>

      {/* HERO SECTION */}
      <section id="top" className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 0, 14]} fov={45} />
            <color attach="background" args={['#050505']} />

            <ambientLight intensity={0.7} />
            <pointLight position={[10, 10, 10]} intensity={1.1} color="#ffffff" />
            <pointLight position={[-10, -10, 10]} intensity={1.1} color="#34A853" />

            <Stars radius={100} depth={50} count={2200} factor={4} saturation={0} fade speed={1} />

            <DevFestHeroScene />
          </Canvas>
        </div>

        {/* Hero Overlay */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between pb-8 pt-4">
          {/* NAVBAR / TOP STRIP */}
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-full bg-black/60 px-5 py-2 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="rounded-full bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-400 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.2em] text-black">
                  GDG
                </span>
                <span className="hidden text-xs text-zinc-300 sm:inline">
                  Chhatrapati Sambhajinagar Developer Group
                </span>
              </div>
            </div>
            <nav className="pointer-events-auto hidden gap-5 text-xs font-medium text-zinc-400 md:flex">
              <a href="#about" className="hover:text-white">
                About
              </a>
              <a href="#schedule" className="hover:text-white">
                Schedule
              </a>
              <a href="#speakers" className="hover:text-white">
                Speakers
              </a>
              <a href="#sessions" className="hover:text-white">
                Sessions
              </a>
              <a
                href="#register"
                className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs font-semibold hover:border-lime-400 hover:text-lime-300"
              >
                Register Interest
              </a>
            </nav>
          </header>

          {/* HERO CONTENT */}
          <div className="pointer-events-none mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 text-center">
            {/* curly bracket logo line */}
            <div className="mb-3 flex items-center gap-3 text-2xl font-extrabold sm:text-3xl md:text-4xl">
              <span className="text-zinc-500">{'{'}</span>
              <span>
                <span className="text-sky-400">Dev</span>
                <span className="text-rose-400">Fest</span>
              </span>
              <span className="text-zinc-500">{'}'}</span>
            </div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-1 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-300">
              Workshops • AI • Cloud • ML • Web • and more
            </span>

            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              <span className="bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
                Community Dev Conference · 2025
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm md:text-base text-zinc-300">
              One day of deep-dive sessions, labs and networking for developers, cloud engineers and AI
              builders – right here in छत्रपती संभाजीनगर.
            </p>

            {/* Coming soon pill card like poster */}
            <div className="pointer-events-auto mt-6 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-3 rounded-full bg-black/70 px-5 py-2 shadow-lg shadow-black/40">
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
                  Coming Soon
                </span>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-200">
                  2025 • छत्रपती संभाजीनगर
                </span>
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 pointer-events-auto">
              <a
                href="#register"
                className="rounded-full bg-lime-400 px-7 py-2 text-sm font-semibold text-black shadow-lg shadow-lime-400/30 transition hover:-translate-y-0.5 hover:bg-lime-300"
              >
                Get DevFest Updates
              </a>
              <a
                href="#schedule"
                className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
              >
                View Tracks
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <p className="mt-3 text-[11px] text-zinc-500">
              Powered by Google Developer Groups • Learn · Build · Connect · Inspire
            </p>
          </div>

          {/* Scroll hint */}
          <div className="pointer-events-none flex flex-col items-center justify-center text-zinc-500">
            <span className="mb-2 block text-center text-[10px] font-medium uppercase tracking-[0.25em]">
              Scroll to explore
            </span>
            <ChevronDown className="mx-auto h-5 w-5 animate-bounce" />
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="relative z-10 bg-zinc-950 px-6 py-20 md:py-24">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 md:flex-row md:items-start">
          <div className="md:w-1/2">
            <div className="mb-4 border-l-4 border-lime-400 pl-4">
              <h2 className="text-3xl font-bold text-white">What is DevFest 2025?</h2>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300">
              DevFest 2025 is a developer-first community conference focused on modern web, scalable cloud
              infrastructure and practical AI. Expect deep dives, lightning demos, and hands-on labs designed
              to give you real skills you can ship to production.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              <li>• Multi-track sessions: Web, Cloud, AI & DevOps</li>
              <li>• Live demos, code walkthroughs and case studies</li>
              <li>• Hands-on workshops with mentors and facilitators</li>
              <li>• Showcase of open-source, side projects and startups</li>
            </ul>
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">When</p>
              <p className="mt-2 text-lg font-semibold text-white">December 2025</p>
              <p className="text-xs text-zinc-500">Exact date & venue to be announced soon.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">Tracks</p>
              <p className="mt-2 text-lg font-semibold text-white">Web · Cloud · AI</p>
              <p className="text-xs text-zinc-500">Jump between tracks, build your own day.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">Audience</p>
              <p className="mt-2 text-lg font-semibold text-white">Developers & Builders</p>
              <p className="text-xs text-zinc-500">Students, professionals, founders, tinkerers.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">Format</p>
              <p className="mt-2 text-lg font-semibold text-white">Talks + Labs + Showcase</p>
              <p className="text-xs text-zinc-500">A mix of learning, building and networking.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SCHEDULE SECTION */}
      <section id="schedule" className="relative z-10 bg-black px-6 py-20 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 border-l-4 border-sky-500 pl-4">
            <h2 className="text-3xl font-bold text-white">Schedule Snapshot</h2>
            <p className="mt-2 text-sm text-zinc-400">
              A high-level overview — detailed timeline and full speaker lineup coming soon.
            </p>
          </div>
          <div className="space-y-3 rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black/90 p-4 md:p-6">
            {schedule.map((slot, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 rounded-lg bg-black/40 px-3 py-3 text-sm text-zinc-200 md:flex-row md:items-center md:justify-between"
              >
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-sky-400">
                  {slot.time}
                </span>
                <span className="font-medium">{slot.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SPEAKERS SECTION */}
      <section id="speakers" className="relative z-10 bg-zinc-950 px-6 py-20 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 border-l-4 border-emerald-500 pl-4">
            <h2 className="text-3xl font-bold text-white">Speakers & Mentors</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Learn from folks who have shipped real systems and are active in the community.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {speakers.map((s, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
              >
                <div>
                  <div className="mb-3 h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 via-sky-500 to-amber-300" />
                  <h3 className="text-sm font-semibold text-white">{s.name}</h3>
                  <p className="text-xs text-zinc-400">{s.title}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-zinc-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SESSIONS / PROJECTS SECTION */}
      <section id="sessions" className="relative z-10 bg-zinc-950 px-6 py-20 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 border-l-4 border-lime-400 pl-6">
            <h2 className="text-3xl font-bold text-white">Featured Sessions & Labs</h2>
            <p className="mt-2 text-sm text-zinc-400">
              A taste of the kind of technical content you’ll experience at DevFest.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {sessions.map((p, i) => (
              <ProjectOverviewCard key={i} project={p} />
            ))}
          </div>
        </div>
      </section>

      {/* REGISTER / CTA SECTION */}
      <section
        id="register"
        className="relative z-10 bg-gradient-to-b from-black via-zinc-950 to-black px-6 py-20 md:py-24"
      >
        <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-800 bg-black/70 p-8 text-center shadow-[0_22px_60px_rgba(0,0,0,0.8)]">
          <h2 className="text-3xl font-bold text-white">Stay in the DevFest loop</h2>
          <p className="mt-3 text-sm text-zinc-300">
            We&apos;ll email you when registrations open, CFP goes live, and the final schedule drops. No
            spam, only DevFest updates.
          </p>
          <form className="mt-6 grid gap-3 sm:grid-cols-[1.5fr_1fr]">
            <input
              type="email"
              required
              placeholder="you@example.dev"
              className="w-full rounded-full border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-lime-400"
            />
            <button
              type="submit"
              className="rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-lime-400/30 transition hover:-translate-y-0.5 hover:bg-lime-300"
            >
              Notify Me
            </button>
          </form>
          <p className="mt-3 text-[11px] text-zinc-500">
            Organized by local Google Developer Groups • Built by volunteers
          </p>
        </div>

        <footer className="mt-12 text-center text-[11px] text-zinc-600">
          <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-500">
            &copy; DevFest 2025 · GDG Community Event
          </span>
        </footer>
      </section>
    </main>
  );
};

export default App;
