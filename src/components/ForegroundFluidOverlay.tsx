"use client";

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const FluidShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uResolution: { value: new THREE.Vector2(0, 0) },
    uColor1: { value: new THREE.Color('#1A1A1A') },
    uColor2: { value: new THREE.Color('#C69F6B') },
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
    uniform vec2 uMouse;
    uniform vec2 uResolution;
    uniform vec3 uColor1;
    uniform vec3 uColor2;

    varying vec2 vUv;

    // Simplex noise implementation
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                          0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                         -0.577350269189626,  // -1.0 + 2.0 * C.x
                          0.024390243902439); // 1.0 / 41.0
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 st = gl_FragCoord.xy / uResolution.xy;
      float aspect = uResolution.x / uResolution.y;
      vec2 stAspect = vec2(st.x * aspect, st.y);
      vec2 mouseAspect = vec2(uMouse.x * aspect, uMouse.y);

      // Distance to mouse for interaction
      float dist = distance(stAspect, mouseAspect);
      
      // Create a smooth ripple effect around the mouse
      float mouseRipple = smoothstep(0.3, 0.0, dist);
      
      // Noise coordinates
      vec2 noisePos = stAspect * 2.0;
      noisePos.y += uTime * 0.1;
      noisePos.x -= uTime * 0.05;
      
      // Distortion from mouse
      noisePos += mouseRipple * 0.2;

      float n = snoise(noisePos) * 0.5 + 0.5;
      n += snoise(noisePos * 2.0 - vec2(uTime * 0.15)) * 0.25;
      
      // Combine noise and mouse interaction
      n = smoothstep(0.3, 0.7, n + mouseRipple * 0.3);

      vec3 finalColor = mix(uColor1, uColor2, n);
      
      // Alpha: only visible where the liquid/noise is concentrated
      // This creates a "sheen" over the page instead of blocking it completely
      float alpha = n * 0.15 + (mouseRipple * 0.3);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

const FluidPlane = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport, size } = useThree();

  const mousePos = useRef({ x: 0.5, y: 0.5 });
  const targetMousePos = useRef({ x: 0.5, y: 0.5 });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uColor1: { value: new THREE.Color('#1A1A1A') },
    uColor2: { value: new THREE.Color('#C69F6B') },
  }), [size.width, size.height]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to 0-1 range
      targetMousePos.current = {
        x: e.clientX / window.innerWidth,
        y: 1.0 - (e.clientY / window.innerHeight), // Invert Y for WebGL
      };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Lerp mouse for smooth trailing
      mousePos.current.x += (targetMousePos.current.x - mousePos.current.x) * 0.05;
      mousePos.current.y += (targetMousePos.current.y - mousePos.current.y) * 0.05;

      materialRef.current.uniforms.uMouse.value.x = mousePos.current.x;
      materialRef.current.uniforms.uMouse.value.y = mousePos.current.y;
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[viewport.width, viewport.height, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={FluidShaderMaterial.vertexShader}
        fragmentShader={FluidShaderMaterial.fragmentShader}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
};

const ForegroundFluidOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-[100dvh] z-[9999] overflow-hidden mix-blend-screen opacity-90" style={{ pointerEvents: 'none' }}>
      <Canvas
        style={{ pointerEvents: 'none' }}
        camera={{ position: [0, 0, 1] }}
        dpr={[1, 2]} // Support high-dpi displays but cap at 2 for performance
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
      >
        <FluidPlane />
      </Canvas>
    </div>
  );
};

export default ForegroundFluidOverlay;
