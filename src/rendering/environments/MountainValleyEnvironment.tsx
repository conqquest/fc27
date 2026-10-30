import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface MountainValleyEnvironmentProps {
  pitchWidth: number
  pitchLength: number
}

export const MountainValleyEnvironment: React.FC<MountainValleyEnvironmentProps> = ({
  pitchWidth,
  pitchLength,
}) => {
  const birdsGroupRef = useRef<THREE.Group>(null)
  const waterfallRef = useRef<THREE.Mesh>(null)

  // ─── 1. Procedural Mountain Peaks, Pine Forests, Stream & Cliffs ───
  const {
    mountainPeaks,
    foothills,
    pineTrees,
    streamBlocks,
    mountainClouds,
    soaringBirds,
  } = useMemo(() => {
    let seed = 9182
    const pseudoRandom = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    const clearX = pitchWidth / 2 + 5 // ~39m
    const clearZ = pitchLength / 2 + 6 // ~58.5m

    // ─── Layer 1: Monumental Snow-Capped Alpine Mountain Peaks (Radius 140m to 260m) ───
    const peaks: Array<{
      x: number
      z: number
      w: number
      d: number
      baseHeight: number
      peakHeight: number
      color: string
    }> = []

    const numPeaks = 32
    for (let i = 0; i < numPeaks; i++) {
      const angle = (i / numPeaks) * Math.PI * 2 + (pseudoRandom() - 0.5) * 0.16
      const radius = 150 + pseudoRandom() * 95
      const x = Math.cos(angle) * radius * 1.15
      const z = Math.sin(angle) * radius * 1.35

      const w = 45 + pseudoRandom() * 45
      const d = 45 + pseudoRandom() * 45
      const peakHeight = 70 + pseudoRandom() * 65 // 70m to 135m monumental peaks!
      const baseHeight = peakHeight * 0.55

      peaks.push({
        x,
        z,
        w,
        d,
        baseHeight,
        peakHeight,
        color: i % 2 === 0 ? '#334155' : '#475569',
      })
    }

    // ─── Layer 2: Mid-Range Rocky Cliffs & Green Foothills (Radius 70m to 130m) ───
    const hills: Array<{
      x: number
      z: number
      w: number
      d: number
      h: number
      color: string
    }> = []

    const numHills = 38
    for (let i = 0; i < numHills; i++) {
      const angle = (i / numHills) * Math.PI * 2 + (pseudoRandom() - 0.5) * 0.2
      const radius = 72 + pseudoRandom() * 48
      const x = Math.cos(angle) * radius * 1.08
      const z = Math.sin(angle) * radius * 1.25

      const w = 24 + pseudoRandom() * 26
      const d = 24 + pseudoRandom() * 26
      const h = 18 + pseudoRandom() * 28

      hills.push({
        x,
        z,
        w,
        d,
        h,
        color: pseudoRandom() > 0.4 ? '#1e3a1f' : '#334155',
      })
    }

    // ─── Dense Alpine Pine & Spruce Forests ───
    const pines: Array<{
      x: number
      z: number
      height: number
      scale: number
      colorIdx: number
    }> = []

    // Side valley forests (East & West)
    for (let i = 0; i < 48; i++) {
      const side = pseudoRandom() > 0.5 ? 1 : -1
      const x = side * (clearX + 4 + pseudoRandom() * 32)
      const z = (pseudoRandom() - 0.5) * (pitchLength + 36)
      const height = 5 + Math.floor(pseudoRandom() * 4)
      const scale = 0.85 + pseudoRandom() * 0.4
      pines.push({ x, z, height, scale, colorIdx: i % 3 })
    }

    // Behind Goal forests (North & South)
    for (let i = 0; i < 42; i++) {
      const side = pseudoRandom() > 0.5 ? 1 : -1
      const x = (pseudoRandom() - 0.5) * (pitchWidth + 34)
      const z = side * (clearZ + 4 + pseudoRandom() * 30)
      const height = 5 + Math.floor(pseudoRandom() * 4)
      const scale = 0.85 + pseudoRandom() * 0.4
      pines.push({ x, z, height, scale, colorIdx: i % 3 })
    }

    // Valley corners
    const corners = [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]
    for (const [cx, cz] of corners) {
      for (let i = 0; i < 16; i++) {
        const x = cx * (clearX + 2 + pseudoRandom() * 35)
        const z = cz * (clearZ + 2 + pseudoRandom() * 35)
        const height = 6 + Math.floor(pseudoRandom() * 4)
        pines.push({
          x,
          z,
          height,
          scale: 0.9 + pseudoRandom() * 0.35,
          colorIdx: i % 3,
        })
      }
    }

    // ─── Rocky Mountain Stream Outside Perimeter ───
    const stream: Array<{ x: number; z: number; w: number; d: number }> = []
    // Stream flowing around the east-north perimeter
    for (let t = -70; t <= 70; t += 10) {
      const sx = clearX + 16 + Math.sin(t * 0.05) * 5
      const sz = t
      stream.push({ x: sx, z: sz, w: 5, d: 11 })
    }

    // ─── Alpine Peak Mist & Floating Clouds ───
    const clouds: Array<{ x: number; y: number; z: number; scale: number }> = []
    for (let i = 0; i < 16; i++) {
      clouds.push({
        x: (pseudoRandom() - 0.5) * 360,
        y: 60 + pseudoRandom() * 45,
        z: (pseudoRandom() - 0.5) * 360,
        scale: 1.4 + pseudoRandom() * 1.0,
      })
    }

    // ─── High-Altitude Soaring Eagles / Birds ───
    const birds: Array<{
      radius: number
      speed: number
      height: number
      phase: number
    }> = [
      { radius: 65, speed: 0.45, height: 42, phase: 0 },
      { radius: 78, speed: 0.38, height: 50, phase: 2.1 },
      { radius: 95, speed: -0.32, height: 58, phase: 4.2 },
    ]

    return {
      mountainPeaks: peaks,
      foothills: hills,
      pineTrees: pines,
      streamBlocks: stream,
      mountainClouds: clouds,
      soaringBirds: birds,
    }
  }, [pitchWidth, pitchLength])

  // Animate birds soaring and waterfall shimmer
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (birdsGroupRef.current) {
      const children = birdsGroupRef.current.children
      for (let i = 0; i < soaringBirds.length && i < children.length; i++) {
        const b = soaringBirds[i]
        const angle = b.phase + t * b.speed
        const bx = Math.cos(angle) * b.radius
        const bz = Math.sin(angle) * b.radius
        children[i].position.set(bx, b.height + Math.sin(t * 1.5 + i) * 1.5, bz)
        children[i].rotation.y = -angle + (b.speed > 0 ? 0 : Math.PI)
      }
    }
    if (waterfallRef.current) {
      const mat = waterfallRef.current.material as THREE.MeshStandardMaterial
      if (mat) {
        mat.emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.2
      }
    }
  })

  // Evergreen foliage colors
  const pineLeafColors = ['#14532d', '#166534', '#0f3d1e']

  return (
    <group name="mountain-valley-environment">
      {/* ─── Deep Valley Grass Floor Surrounding Pitch ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[160, 200]} />
        <meshStandardMaterial color="#166534" roughness={0.88} />
      </mesh>

      {/* Surrounding Mountain Valley Basin ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#14532d" roughness={0.92} />
      </mesh>

      {/* ─── Rocky Mountain Stream Water Surface ─── */}
      {streamBlocks.map((s, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[s.x, -0.04, s.z]}
          receiveShadow
        >
          <planeGeometry args={[s.w, s.d]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.2}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* ─── Cascading Cliff Waterfall (North Mountain Face) ─── */}
      <group position={[0, 0, -pitchLength / 2 - 45]}>
        {/* Waterfall Cliff Wall */}
        <mesh position={[0, 24, -2]}>
          <boxGeometry args={[18, 48, 6]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
        {/* Cascading Water Fall Sheet */}
        <mesh ref={waterfallRef} position={[0, 24, 1.2]}>
          <boxGeometry args={[7.5, 48, 0.4]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#bae6fd"
            emissiveIntensity={0.6}
            roughness={0.15}
          />
        </mesh>
        {/* Splash Basin Pool at Base */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 5]}>
          <planeGeometry args={[14, 10]} />
          <meshStandardMaterial
            color="#7dd3fc"
            emissive="#e0f2fe"
            emissiveIntensity={0.4}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* ─── Layer 2: Mid-Range Cliffs & Foothills ─── */}
      {foothills.map((h, i) => (
        <group key={i} position={[h.x, 0, h.z]}>
          <mesh position={[0, h.h / 2, 0]} receiveShadow>
            <boxGeometry args={[h.w, h.h, h.d]} />
            <meshStandardMaterial color={h.color} roughness={0.9} />
          </mesh>
          {/* Green stepped ledge */}
          <mesh position={[0, h.h + 1.2, 0]}>
            <boxGeometry args={[h.w * 0.7, 2.4, h.d * 0.7]} />
            <meshStandardMaterial color="#15803d" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* ─── Layer 1: Monumental Snow-Capped Mountain Peaks ─── */}
      {mountainPeaks.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          {/* Mountain Base (Dark Slate Rock) */}
          <mesh position={[0, p.baseHeight / 2, 0]} receiveShadow>
            <boxGeometry args={[p.w, p.baseHeight, p.d]} />
            <meshStandardMaterial color={p.color} roughness={0.85} />
          </mesh>
          {/* Mountain Mid-Section */}
          <mesh position={[0, p.baseHeight + (p.peakHeight - p.baseHeight) * 0.35, 0]}>
            <boxGeometry args={[p.w * 0.75, (p.peakHeight - p.baseHeight) * 0.7, p.d * 0.75]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          {/* Snow-Capped Summit Crown (Pristine White Voxel Snow) */}
          <mesh position={[0, p.peakHeight, 0]}>
            <boxGeometry args={[p.w * 0.45, (p.peakHeight - p.baseHeight) * 0.6, p.d * 0.45]} />
            <meshStandardMaterial color="#ffffff" roughness={0.7} />
          </mesh>
          {/* Razor-sharp summit peak */}
          <mesh position={[0, p.peakHeight + (p.peakHeight - p.baseHeight) * 0.35, 0]}>
            <boxGeometry args={[p.w * 0.2, 8, p.d * 0.2]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        </group>
      ))}

      {/* ─── Dense Pine & Spruce Forest Trees ─── */}
      {pineTrees.map((pt, i) => (
        <group key={i} position={[pt.x, 0, pt.z]} scale={pt.scale}>
          {/* Wood Trunk */}
          <mesh position={[0, pt.height * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.7, pt.height, 0.7]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} />
          </mesh>

          {/* Tier 1 - Wide Bottom Foliage */}
          <mesh position={[0, pt.height * 0.6, 0]} castShadow>
            <boxGeometry args={[3.2, 1.8, 3.2]} />
            <meshStandardMaterial color={pineLeafColors[pt.colorIdx]} roughness={0.85} />
          </mesh>

          {/* Tier 2 - Middle Foliage */}
          <mesh position={[0, pt.height * 0.6 + 1.6, 0]} castShadow>
            <boxGeometry args={[2.3, 1.6, 2.3]} />
            <meshStandardMaterial color={pineLeafColors[(pt.colorIdx + 1) % 3]} roughness={0.85} />
          </mesh>

          {/* Tier 3 - Top Tip Foliage */}
          <mesh position={[0, pt.height * 0.6 + 3.0, 0]} castShadow>
            <boxGeometry args={[1.3, 1.4, 1.3]} />
            <meshStandardMaterial color={pineLeafColors[(pt.colorIdx + 2) % 3]} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* ─── High-Altitude Soaring Eagles / Birds ─── */}
      <group ref={birdsGroupRef}>
        {soaringBirds.map((_, i) => (
          <group key={i}>
            {/* Eagle Body */}
            <mesh>
              <boxGeometry args={[0.6, 0.3, 1.4]} />
              <meshBasicMaterial color="#1e293b" />
            </mesh>
            {/* Left Outspread Wing */}
            <mesh position={[-1.1, 0.05, 0]}>
              <boxGeometry args={[1.8, 0.1, 0.8]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
            {/* Right Outspread Wing */}
            <mesh position={[1.1, 0.05, 0]}>
              <boxGeometry args={[1.8, 0.1, 0.8]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ─── Drifting Alpine Mountain Clouds ─── */}
      {mountainClouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.scale}>
          <mesh>
            <boxGeometry args={[32, 7, 22]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
          </mesh>
          <mesh position={[6, 3, -3]}>
            <boxGeometry args={[22, 6, 16]} />
            <meshBasicMaterial color="#f1f5f9" transparent opacity={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
