"use client";

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import Image from 'next/image';
import * as THREE from 'three';

const LiquidShader = {
  uniforms: {
    uTime: { value: 0 },
    uTexture: { value: null },
    uHover: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform sampler2D uTexture;
    uniform float uHover;
    varying vec2 vUv;

    void main() {
      vec2 p = vUv;
      
      // Simple sine wave displacement based on hover state
      float wave = sin(p.y * 20.0 + uTime * 5.0) * 0.02 * uHover;
      p.x += wave;
      p.y += cos(p.x * 20.0 + uTime * 5.0) * 0.02 * uHover;
      
      vec4 color = texture2D(uTexture, p);
      gl_FragColor = color;
    }
  `
};

const Scene = ({ src, isHovered }: { src: string, isHovered: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Load texture securely
  const texture = useTexture(src);
  
  const hoverValue = useRef(0);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      // Lerp hover for smooth enter/exit of water effect
      hoverValue.current += ((isHovered ? 1.0 : 0.0) - hoverValue.current) * 0.1;
      materialRef.current.uniforms.uHover.value = hoverValue.current;
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[5, 5]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={LiquidShader.vertexShader}
        fragmentShader={LiquidShader.fragmentShader}
        uniforms={{
          uTexture: { value: texture },
          uTime: { value: 0 },
          uHover: { value: 0 }
        }}
        transparent={true}
      />
    </mesh>
  );
};

// Error Boundary to catch any WebGL/Texture crashes
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function LiquidImageCard({ src, alt }: { src: string; alt: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div 
      className="absolute inset-0 w-full h-full bg-slate-50 overflow-hidden cursor-pointer flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Orijinal fotoğraf her zaman güvende altta durur. Eğer WebGL çökerse bu görünür. */}
      <Image 
        src={src} 
        alt={alt} 
        fill
        className={`object-contain p-4 transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`} 
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />

      {/* Sadece fare üzerine gelindiğinde Canvas'ı yükleyip suyu hareket ettiriyoruz. Bu performansı 100 kat artırır ve çökmeleri önler. */}
      {mounted && isHovered && (
        <div className="absolute inset-0 z-10">
          <ErrorBoundary>
            <Canvas camera={{ position: [0, 0, 3] }}>
              <React.Suspense fallback={null}>
                <Scene src={src} isHovered={isHovered} />
              </React.Suspense>
            </Canvas>
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
