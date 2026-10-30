import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface NeonMetropolisEnvironmentProps {
  pitchWidth: number
  pitchLength: number
}

export const NeonMetropolisEnvironment: React.FC<NeonMetropolisEnvironmentProps> = ({
  pitchWidth,
  pitchLength,
}) => {
  const trafficGroupRef = useRef<THREE.Group>(null)

  // ─── 1. Procedural Cyber Skyscraper & Tower Instances ───
  const {
    buildingInstances,
    windowInstances,
    spireInstances,
    floodlightTowers,
    starPositions,
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
      glowColor: string
    }> = []

    const spires: Array<{
      x: number
      y: number
      z: number
      h: number
      beaconColor: string
    }> = []

    // Dark cyberpunk building base palette
    const cyberBuildingColors = [
      '#090d16',
      '#0f172a',
      '#1e1b4b',
      '#111827',
      '#172554',
      '#020617',
    ]

    // Neon glow palette for windows & billboards
    const neonWindowColors = [
      '#00f0ff', // Cyber cyan
      '#ec4899', // Hot neon pink / magenta
      '#a855f7', // Electric purple
      '#facc15', // Amber gold
      '#38bdf8', // Neon sky blue
    ]

    let seed = 7129
    const pseudoRandom = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    // Mid-range Skyline Ring (Radius 68m to 110m)
    const numMidBuildings = 54
    for (let i = 0; i < numMidBuildings; i++) {
      const angle = (i / numMidBuildings) * Math.PI * 2 + (pseudoRandom() - 0.5) * 0.18
      const radius = 68 + pseudoRandom() * 38
      const x = Math.cos(angle) * radius * 1.05
      const z = Math.sin(angle) * radius * 1.25

      const w = 12 + pseudoRandom() * 14
      const d = 12 + pseudoRandom() * 14
      const h = 22 + pseudoRandom() * 40
      const color = cyberBuildingColors[Math.floor(pseudoRandom() * cyberBuildingColors.length)]

      buildings.push({ x, z, w, d, h, color })

      // Glowing window blocks / vertical stripes
      const floors = Math.floor(h / 3.8)
      const glowColor = neonWindowColors[Math.floor(pseudoRandom() * neonWindowColors.length)]

      for (let f = 1; f < floors; f += 2) {
        const wy = f * 3.8
        windows.push({
          x,
          y: wy,
          z: z + (d / 2) * (z > 0 ? -1 : 1),
          w: w * 0.76,
          h: 1.6,
          d: 0.3,
          glowColor,
        })
      }

      // Spire with warning light
      if (pseudoRandom() > 0.4) {
        spires.push({
          x,
          y: h + 4,
          z,
          h: 7 + pseudoRandom() * 6,
          beaconColor: pseudoRandom() > 0.5 ? '#ff0055' : '#00f0ff',
        })
      }
    }

    // Massive Distant Megastructures & Skyscrapers (Radius 120m to 240m)
    const numMegaTowers = 46
    for (let i = 0; i < numMegaTowers; i++) {
      const angle = (i / numMegaTowers) * Math.PI * 2 + (pseudoRandom() - 0.5) * 0.22
      const radius = 125 + pseudoRandom() * 105
      const x = Math.cos(angle) * radius * 1.15
      const z = Math.sin(angle) * radius * 1.35

      const w = 22 + pseudoRandom() * 26
      const d = 22 + pseudoRandom() * 26
      const h = 55 + pseudoRandom() * 85 // Up to 140m high megatowers!
      const color = cyberBuildingColors[Math.floor(pseudoRandom() * cyberBuildingColors.length)]

      buildings.push({ x, z, w, d, h, color })

      // Tower window bands
      const floors = Math.floor(h / 4.5)
      const glowColor = neonWindowColors[Math.floor(pseudoRandom() * neonWindowColors.length)]

      for (let f = 1; f < floors; f += 3) {
        windows.push({
          x,
          y: f * 4.5,
          z: z + (d / 2) * (z > 0 ? -1 : 1),
          w: w * 0.85,
          h: 2.2,
          d: 0.4,
          glowColor,
        })
      }

      spires.push({
        x,
        y: h + 6,
        z,
        h: 12 + pseudoRandom() * 10,
        beaconColor: '#ff0044',
      })
    }

    // 4 Massive Stadium Corner Floodlight Pylons
    const cornerClearX = pitchWidth / 2 + 7.5
    const cornerClearZ = pitchLength / 2 + 8.5
    const floodlightTowersList = [
      [-cornerClearX, -cornerClearZ],
      [cornerClearX, -cornerClearZ],
      [-cornerClearX, cornerClearZ],
      [cornerClearX, cornerClearZ],
    ]

    // Night Stars in Sky Dome
    const stars: Array<[number, number, number]> = []
    for (let i = 0; i < 90; i++) {
      const theta = pseudoRandom() * Math.PI * 2
      const phi = 0.2 + pseudoRandom() * (Math.PI / 2 - 0.25)
      const r = 260
      const sx = r * Math.sin(phi) * Math.cos(theta)
      const sy = r * Math.cos(phi)
      const sz = r * Math.sin(phi) * Math.sin(theta)
      stars.push([sx, sy, sz])
    }

    return {
      buildingInstances: buildings,
      windowInstances: windows,
      spireInstances: spires,
      floodlightTowers: floodlightTowersList,
      starPositions: stars,
    }
  }, [pitchWidth, pitchLength])

  // ─── 2. Highway Vehicle Traffic (Animated Moving Headlights & Taillights) ───
  const vehicleCount = 36
  const vehicles = useMemo(() => {
    return Array.from({ length: vehicleCount }).map((_, idx) => {
      const isInnerLane = idx % 2 === 0
      return {
        progress: (idx / vehicleCount) * Math.PI * 2,
        speed: (isInnerLane ? 0.35 : -0.28) * (0.8 + (idx % 3) * 0.15),
        radius: isInnerLane ? 58 : 62,
        isHeadlight: isInnerLane,
      }
    })
  }, [])

  // Animate traffic movement
  useFrame((_, delta) => {
    if (!trafficGroupRef.current) return
    const children = trafficGroupRef.current.children
    for (let i = 0; i < vehicles.length && i < children.length; i++) {
      const v = vehicles[i]
      v.progress += v.speed * delta
      const x = Math.cos(v.progress) * v.radius * 1.05
      const z = Math.sin(v.progress) * v.radius * 1.25
      children[i].position.set(x, 1.2, z)
      children[i].rotation.y = -v.progress + (v.isHeadlight ? 0 : Math.PI)
    }
  })

  return (
    <group name="neon-metropolis-environment">
      {/* ─── Voxel Crescent Moon ─── */}
      <group position={[120, 150, -160]}>
        <mesh>
          <boxGeometry args={[14, 14, 2]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
        <mesh position={[-3, 1, 1]}>
          <boxGeometry args={[11, 13, 2.2]} />
          <meshBasicMaterial color="#090a1a" />
        </mesh>
      </group>

      {/* ─── Twinkling Voxel Stars ─── */}
      {starPositions.map(([sx, sy, sz], i) => (
        <mesh key={i} position={[sx, sy, sz]}>
          <boxGeometry args={[1.4, 1.4, 1.4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* ─── Surrounding Dark Cyber Tarmac & Ground Apron ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]} receiveShadow>
        <planeGeometry args={[160, 200]} />
        <meshStandardMaterial color="#0a0f1d" roughness={0.8} />
      </mesh>

      {/* ─── Perimeter Highway Ring Road (Radius ~60m) ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[56, 64, 48]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      {/* Highway Glowing Cyan Dividing Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[59.8, 60.2, 48]} />
        <meshBasicMaterial color="#00f0ff" />
      </mesh>

      {/* ─── 4 Corner Stadium Floodlight Pylon Towers ─── */}
      {floodlightTowers.map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          {/* Main Lattice Tower Mast */}
          <mesh position={[0, 15, 0]}>
            <boxGeometry args={[1.4, 30, 1.4]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Top Cross-Arm Gantry */}
          <mesh position={[0, 30, 0]}>
            <boxGeometry args={[7.5, 2.2, 2.2]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {/* Glowing Floodlight Banks (High-output stadium lights aimed at pitch) */}
          <mesh position={[0, 29.8, 0.8]}>
            <boxGeometry args={[6.8, 1.6, 0.4]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={1.8}
            />
          </mesh>
        </group>
      ))}

      {/* ─── Animated Vehicle Traffic (Headlights & Taillights) ─── */}
      <group ref={trafficGroupRef}>
        {vehicles.map((v, i) => (
          <group key={i}>
            {/* Vehicle voxel body */}
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[1.6, 0.8, 3.2]} />
              <meshStandardMaterial color={v.isHeadlight ? '#1e293b' : '#0f172a'} />
            </mesh>
            {/* Front Headlights (White/Yellow Glow) or Rear Taillights (Red Glow) */}
            <mesh position={[0, 0.4, v.isHeadlight ? 1.7 : -1.7]}>
              <boxGeometry args={[1.4, 0.25, 0.2]} />
              <meshBasicMaterial color={v.isHeadlight ? '#fef08a' : '#ff0033'} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ─── Cyber Skyscraper Buildings ─── */}
      {buildingInstances.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.65} metalness={0.4} />
        </mesh>
      ))}

      {/* ─── Glowing Neon Window Panels & Holo Facades ─── */}
      {windowInstances.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, w.z]}>
          <boxGeometry args={[w.w, w.h, w.d]} />
          <meshStandardMaterial
            color={w.glowColor}
            emissive={w.glowColor}
            emissiveIntensity={1.4}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* ─── Rooftop Communication Spires with Warning Beacons ─── */}
      {spireInstances.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]}>
          <mesh position={[0, s.h / 2, 0]}>
            <boxGeometry args={[0.5, s.h, 0.5]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          {/* Top Flashing Beacon Light */}
          <mesh position={[0, s.h, 0]}>
            <boxGeometry args={[1.0, 1.0, 1.0]} />
            <meshBasicMaterial color={s.beaconColor} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
