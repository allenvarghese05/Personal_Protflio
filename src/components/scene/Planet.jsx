'use client';
import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

/* ------------------------------------------------------------------
   Shared 3D simplex noise (Ashima) — used by the surface FBM.
   ------------------------------------------------------------------ */
const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
      i.z+vec4(0.0,i1.z,i2.z,1.0))
    + i.y+vec4(0.0,i1.y,i2.y,1.0))
    + i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float v=0.0;
  float a=0.5;
  for(int i=0;i<5;i++){
    v+=a*snoise(p);
    p*=2.0;
    a*=0.5;
  }
  return v;
}
`;

/* ------------------------------------------------------------------
   Surface material — swirling procedural planet skin.
   ------------------------------------------------------------------ */
const PlanetSurfaceMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorDeep: new THREE.Color('#081522'),
    uColorMid: new THREE.Color('#2a5a8a'),
    uColorBright: new THREE.Color('#6fb0ee'),
    uRim: new THREE.Color('#ff8a3d'),
    uLightDir: new THREE.Vector3(0.6, 0.4, 0.8),
    uBrightness: 1.0,
  },
  /* vertex */ `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }
  `,
  /* fragment */ `
    uniform float uTime;
    uniform vec3 uColorDeep;
    uniform vec3 uColorMid;
    uniform vec3 uColorBright;
    uniform vec3 uRim;
    uniform vec3 uLightDir;
    uniform float uBrightness;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;
    ${NOISE_GLSL}
    void main() {
      // Slowly evolving cloud/continent bands
      vec3 p = vPosition * 1.6;
      float n = fbm(p + vec3(uTime * 0.04, uTime * 0.02, 0.0));
      float bands = fbm(p * 0.6 + n * 0.8);

      float t = smoothstep(-0.6, 0.7, bands);
      vec3 col = mix(uColorDeep, uColorMid, t);
      // Bright cyan filaments where noise spikes
      float fil = smoothstep(0.55, 0.85, n);
      col = mix(col, uColorBright, fil * 0.7);

      // Simple lambert shading for form
      float light = clamp(dot(normalize(vNormal), normalize(uLightDir)), 0.0, 1.0);
      col *= 0.35 + 0.75 * light;

      // Warm rim brightening (sunrise catch on the limb)
      float fres = pow(1.0 - clamp(dot(normalize(vViewPosition), vNormal), 0.0, 1.0), 2.5);
      col += uRim * fres * 0.5;

      gl_FragColor = vec4(col * uBrightness, 1.0);
    }
  `
);

/* ------------------------------------------------------------------
   Atmosphere halo — fresnel glow shell, additive.
   ------------------------------------------------------------------ */
const AtmosphereMaterial = shaderMaterial(
  {
    uColor: new THREE.Color('#4a90d9'),
    uColor2: new THREE.Color('#c9763f'),
    uIntensity: 1.0,
    uBrightness: 1.0,
  },
  /* vertex */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }
  `,
  /* fragment */ `
    uniform vec3 uColor;
    uniform vec3 uColor2;
    uniform float uIntensity;
    uniform float uBrightness;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      float fres = pow(1.0 - clamp(dot(normalize(vViewPosition), normalize(vNormal)), 0.0, 1.0), 3.0);
      vec3 col = mix(uColor, uColor2, fres);
      gl_FragColor = vec4(col, fres * uIntensity * uBrightness);
    }
  `
);

extend({ PlanetSurfaceMaterial, AtmosphereMaterial });

export default function Planet({ position = [0, 0.5, -11], radius = 4.0 }) {
  const surfaceRef = useRef();
  const atmInnerRef = useRef();
  const atmOuterRef = useRef();
  const groupRef = useRef();

  const lightDir = useMemo(() => new THREE.Vector3(0.6, 0.5, 0.8), []);

  // Present from page load — the destination glowing ahead. Full steel-blue
  // colour the whole time (the dark intro is about the foreground rocket).
  useFrame((state, delta) => {
    if (surfaceRef.current) surfaceRef.current.uTime = state.clock.elapsedTime;
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.03;
  });

  return (
    <group position={position}>
      {/* Surface */}
      <mesh ref={groupRef}>
        <sphereGeometry args={[radius, 128, 128]} />
        <planetSurfaceMaterial ref={surfaceRef} uLightDir={lightDir} uBrightness={1} />
      </mesh>

      {/* Inner atmosphere */}
      <mesh scale={1.04}>
        <sphereGeometry args={[radius, 64, 64]} />
        <atmosphereMaterial
          ref={atmInnerRef}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.FrontSide}
          uIntensity={0.7}
          uBrightness={1}
        />
      </mesh>

      {/* Outer soft halo */}
      <mesh scale={1.16}>
        <sphereGeometry args={[radius, 64, 64]} />
        <atmosphereMaterial
          ref={atmOuterRef}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          uIntensity={0.28}
          uBrightness={1}
        />
      </mesh>
    </group>
  );
}
