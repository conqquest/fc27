import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface VoxelCityProps {
  pitchWidth?: number
  pitchLength?: number
}

export const VoxelCity: React.FC<VoxelCityProps> = () => {
  const cloudsRef = useRef<THREE.Group>(null)

  // Move clouds slowly across the sky
  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.position.x += delta * 1.5
      if (cloudsRef.current.position.x > 300) {
        cloudsRef.current.position.x = -300
      }
    }
  })

  // Procedural city layout generation
  const {
    buildingInstances,
    windowInstances,
    roofInstances,
    streetlightPositions,
  } = useMemo(() => {
    const buildings: Array<{
      x: number
      z: number
      w: number
      d: number
      h: number
      color: string
    }> = []

    const windows: Array<{
      x: number
      y: number
      z: number
      w: number
      h: number
      d: number
    }> = []

    const roofs: Array<{
      x: number
      y: number
      z: number
      w: number
      d: number
      color: string
    }> = []

    const streetlights: Array<[number, number]> = []

    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }

    const buildingColors = [
      '#e2e8f0', // modern white concrete
      '#94a3b8', // light slate
      '#64748b', // slate
      '#475569', // dark slate
      '#cbd5e1', // off-white
      '#b45309', // warm red brick
      '#d97706', // ochre brick
      '#334155', // dark business glass
      '#1e293b', // deep navy high-rise
      '#0f172a', // midnight skyscraper
    ]

    let seed = 101

    // ─── Zone 5: Low-to-Mid Rise Residential & Commercial (Rings 68m to 110m) ───
    const numMidBuildings = 52
    for (let i = 0; i < numMidBuildings; i++) {
      const angle = (i / numMidBuildings) * Math.PI * 2 + (pseudoRandom(seed++) - 0.5) * 0.2
      const radius = 72 + pseudoRandom(seed++) * 32
      const x = Math.cos(angle) * radius * 1.05
      const z = Math.sin(angle) * radius * 1.25

      const w = 12 + pseudoRandom(seed++) * 14
      const d = 12 + pseudoRandom(seed++) * 14
      const h = 14 + pseudoRandom(seed++) * 24 // 14m to 38m tall
      const color = buildingColors[Math.floor(pseudoRandom(seed++) * buildingColors.length)]

      buildings.push({ x, z, w, d, h, color })

      // Rooftop structure (HVAC unit or water tower)
      roofs.push({
        x: x + (pseudoRandom(seed++) - 0.5) * (w * 0.4),
        y: h + 1.2,
        z: z + (pseudoRandom(seed++) - 0.5) * (d * 0.4),
        w: 3 + pseudoRandom(seed++) * 3,
        d: 3 + pseudoRandom(seed++) * 3,
        color: '#334155',
      })

      // Window blocks on front/sides
      const floors = Math.floor(h / 3.5)
      for (let f = 1; f < floors; f++) {
        const wy = f * 3.5
        // Front facing windows
        windows.push({
          x,
          y: wy,
          z: z + d / 2 + 0.1,
          w: w * 0.75,
          h: 1.4,
          d: 0.2,
        })
      }
    }

    // ─── Zone 6 & 7: Distant Skyline Skyscrapers (Radius 120m to 230m) ───
    const numSkyscrapers = 48
    for (let i = 0; i < numSkyscrapers; i++) {
      const angle = (i / numSkyscrapers) * Math.PI * 2 + (pseudoRandom(seed++) - 0.5) * 0.25
      const radius = 125 + pseudoRandom(seed++) * 85
      const x = Math.cos(angle) * radius * 1.1
      const z = Math.sin(angle) * radius * 1.3

      const w = 18 + pseudoRandom(seed++) * 22
      const d = 18 + pseudoRandom(seed++) * 22
      const h = 45 + pseudoRandom(seed++) * 55 // 45m to 100m tall skyscrapers!
      const color = buildingColors[Math.floor(pseudoRandom(seed++) * buildingColors.length)]

      buildings.push({ x, z, w, d, h, color })

      // Rooftop antenna / spire
      roofs.push({
        x,
        y: h + 4.5,
        z,
        w: 1.2,
        d: 1.2,
        color: '#dc2626', // red antenna
      })

      // Window bands on skyscraper
      const floors = Math.floor(h / 4.0)
      for (let f = 1; f < floors; f += 2) {
        windows.push({
          x,
          y: f * 4.0,
          z: z + d / 2 + 0.15,
          w: w * 0.82,
          h: 1.6,
          d: 0.3,
        })
      }
    }

    // ─── Streetlights along perimeter road (Radius ~58m) ───
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2
      const lx = Math.cos(angle) * 58
      const lz = Math.sin(angle) * 76
      streetlights.push([lx, lz])
    }

    return {
      buildingInstances: buildings,
      windowInstances: windows,
      roofInstances: roofs,
      streetlightPositions: streetlights,
    }
  }, [])

  // Voxel clouds floating in the sky
  const cloudBlocks = useMemo(() => {
    const blocks: Array<[number, number, number, number, number, number]> = []
    const pseudo = (s: number) => {
      const x = Math.sin(s) * 10000
      return x - Math.floor(x)
    }
    let s = 99
    for (let c = 0; c < 24; c++) {
      const cx = (pseudo(s++) - 0.5) * 450
      const cz = (pseudo(s++) - 0.5) * 450
      const cy = 60 + pseudo(s++) * 18
      const w = 18 + pseudo(s++) * 24
      const d = 14 + pseudo(s++) * 20
      const h = 4 + pseudo(s++) * 3
      blocks.push([cx, cy, cz, w, h, d])
    }
    return blocks
  }, [])

  return (
    <group name="voxel-city">
      {/* ─── Perimeter Roads & Asphalt Network ─── */}
      {/* Outer Road Ring */}
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[56, 68, 64]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* Road Lane Marking Lines (Dashed Voxel Pattern) */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[61.8, 62.2, 64]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>

      {/* Sidewalk Curbs */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[54.8, 56, 64]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[68, 69.2, 64]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>

      {/* ─── Voxel Streetlights ─── */}
      {streetlightPositions.map(([lx, lz], idx) => (
        <group key={idx} position={[lx, 0, lz]}>
          {/* Post */}
          <mesh position={[0, 3.5, 0]} castShadow>
            <boxGeometry args={[0.25, 7, 0.25]} />
            <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Overhang Arm */}
          <mesh position={[0, 7, 0.6]}>
            <boxGeometry args={[0.25, 0.25, 1.4]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          {/* Lantern Head */}
          <mesh position={[0, 6.7, 1.2]}>
            <boxGeometry args={[0.5, 0.4, 0.5]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#fef08a"
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      ))}

      {/* ─── Voxel City Buildings ─── */}
      {buildingInstances.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, b.h / 2, b.z]}
          receiveShadow
        >
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.7} metalness={0.15} />
        </mesh>
      ))}

      {/* ─── Window Grids & Glass Facades ─── */}
      {windowInstances.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, w.z]}>
          <boxGeometry args={[w.w, w.h, w.d]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.25}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* ─── Rooftops, Antennas & Water Towers ─── */}
      {roofInstances.map((r, i) => (
        <mesh key={i} position={[r.x, r.y, r.z]}>
          <boxGeometry args={[r.w, 4, r.d]} />
          <meshStandardMaterial color={r.color} roughness={0.8} />
        </mesh>
      ))}

      {/* ─── Minecraft-Style Volumetric Block Clouds ─── */}
      <group ref={cloudsRef} position={[0, 0, 0]}>
        {cloudBlocks.map(([cx, cy, cz, cw, ch, cd], idx) => (
          <mesh key={idx} position={[cx, cy, cz]}>
            <boxGeometry args={[cw, ch, cd]} />
            <meshStandardMaterial
              color="#ffffff"
              transparent
              opacity={0.82}
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}
