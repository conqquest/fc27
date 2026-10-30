import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface TropicalBeachEnvironmentProps {
  pitchWidth: number
  pitchLength: number
}

export const TropicalBeachEnvironment: React.FC<TropicalBeachEnvironmentProps> = ({
  pitchWidth,
  pitchLength,
}) => {
  const oceanRef = useRef<THREE.Mesh>(null)
  const boatsRef = useRef<THREE.Group>(null)

  // ─── 1. Procedural Palm Trees, Cabanas, Umbrellas, Rocks & Islands ───
  const {
    palmTrees,
    beachUmbrellas,
    woodenHuts,
    coastalRocks,
    horizonIslands,
    sailboats,
    clouds,
  } = useMemo(() => {
    let seed = 3847
    const pseudoRandom = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    const clearX = pitchWidth / 2 + 5 // ~39m
    const clearZ = pitchLength / 2 + 6 // ~58.5m

    // ─── Voxel Palm Trees ───
    const palms: Array<{
      x: number
      z: number
      height: number
      curveX: number
      curveZ: number
      leafRadius: number
    }> = []

    // Side groves on the beach (East & West)
    for (let i = 0; i < 34; i++) {
      const side = pseudoRandom() > 0.5 ? 1 : -1
      const x = side * (clearX + 4 + pseudoRandom() * 26)
      const z = (pseudoRandom() - 0.5) * (pitchLength + 24)
      const height = 6 + Math.floor(pseudoRandom() * 4) // 6 to 9 blocks high
      const curveX = (pseudoRandom() - 0.5) * 1.5
      const curveZ = (pseudoRandom() - 0.5) * 1.5
      palms.push({ x, z, height, curveX, curveZ, leafRadius: 3 })
    }

    // Behind Goal groves (North & South)
    for (let i = 0; i < 28; i++) {
      const side = pseudoRandom() > 0.5 ? 1 : -1
      const x = (pseudoRandom() - 0.5) * (pitchWidth + 24)
      const z = side * (clearZ + 4 + pseudoRandom() * 24)
      const height = 6 + Math.floor(pseudoRandom() * 4)
      const curveX = (pseudoRandom() - 0.5) * 1.5
      const curveZ = (pseudoRandom() - 0.5) * 1.5
      palms.push({ x, z, height, curveX, curveZ, leafRadius: 3 })
    }

    // Corner clusters
    const corners = [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]
    for (const [cx, cz] of corners) {
      for (let i = 0; i < 8; i++) {
        const x = cx * (clearX + 2 + pseudoRandom() * 28)
        const z = cz * (clearZ + 2 + pseudoRandom() * 28)
        const height = 7 + Math.floor(pseudoRandom() * 3)
        palms.push({
          x,
          z,
          height,
          curveX: cx * 1.2,
          curveZ: cz * 1.2,
          leafRadius: 3,
        })
      }
    }

    // ─── Striped Beach Umbrellas ───
    const umbrellas: Array<{ x: number; z: number; color: string }> = []
    const umbrellaColors = ['#ef4444', '#0284c7', '#f59e0b', '#10b981', '#ec4899']
    for (let i = 0; i < 18; i++) {
      const side = pseudoRandom() > 0.5 ? 1 : -1
      const x = side * (clearX + 3 + pseudoRandom() * 18)
      const z = (pseudoRandom() - 0.5) * (pitchLength + 10)
      const color = umbrellaColors[i % umbrellaColors.length]
      umbrellas.push({ x, z, color })
    }

    // ─── Wooden Beach Huts / Cabanas ───
    const huts: Array<{ x: number; z: number; rot: number }> = [
      { x: -clearX - 12, z: -25, rot: 0.2 },
      { x: -clearX - 14, z: 22, rot: -0.15 },
      { x: clearX + 13, z: -22, rot: -0.3 },
      { x: clearX + 15, z: 25, rot: 0.25 },
      { x: -18, z: clearZ + 12, rot: 0 },
      { x: 18, z: -clearZ - 12, rot: Math.PI },
    ]

    // ─── Coastal Rocks ───
    const rocks: Array<{ x: number; z: number; scale: number }> = []
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + (pseudoRandom() - 0.5) * 0.3
      const radius = 68 + pseudoRandom() * 20
      const x = Math.cos(angle) * radius * 1.05
      const z = Math.sin(angle) * radius * 1.25
      const scale = 1.2 + pseudoRandom() * 1.8
      rocks.push({ x, z, scale })
    }

    // ─── Distant Horizon Volcanic Islands ───
    const islands: Array<{ x: number; z: number; w: number; h: number; d: number }> = [
      { x: -160, z: -170, w: 75, h: 28, d: 65 },
      { x: 170, z: -160, w: 90, h: 36, d: 80 },
      { x: -190, z: 150, w: 85, h: 32, d: 70 },
      { x: 180, z: 170, w: 100, h: 42, d: 85 },
      { x: 0, z: -210, w: 110, h: 48, d: 80 },
    ]

    // ─── Distant Sailboats on Ocean ───
    const boats: Array<{ x: number; z: number; angle: number; speed: number }> = [
      { x: -110, z: -90, angle: 0.8, speed: 0.4 },
      { x: 120, z: -80, angle: -0.6, speed: 0.35 },
      { x: -130, z: 95, angle: 1.2, speed: 0.5 },
      { x: 115, z: 105, angle: -1.0, speed: 0.45 },
      { x: -75, z: -140, angle: 0.4, speed: 0.3 },
    ]

    // ─── Tropical Soft Clouds ───
    const cloudClusters: Array<{ x: number; y: number; z: number; scale: number }> = []
    for (let i = 0; i < 14; i++) {
      cloudClusters.push({
        x: (pseudoRandom() - 0.5) * 320,
        y: 65 + pseudoRandom() * 30,
        z: (pseudoRandom() - 0.5) * 340,
        scale: 1.2 + pseudoRandom() * 0.8,
      })
    }

    return {
      palmTrees: palms,
      beachUmbrellas: umbrellas,
      woodenHuts: huts,
      coastalRocks: rocks,
      horizonIslands: islands,
      sailboats: boats,
      clouds: cloudClusters,
    }
  }, [pitchWidth, pitchLength])

  // Subtle wave shimmer animation
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (oceanRef.current) {
      oceanRef.current.position.y = -0.12 + Math.sin(t * 1.2) * 0.04
    }
    if (boatsRef.current) {
      const children = boatsRef.current.children
      for (let i = 0; i < children.length; i++) {
        children[i].rotation.z = Math.sin(t * 1.5 + i) * 0.05
        children[i].rotation.x = Math.cos(t * 1.2 + i * 2) * 0.04
      }
    }
  })

  return (
    <group name="tropical-beach-environment">
      {/* ─── Golden Sandy Beach Apron Surrounding Pitch ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[150, 190]} />
        <meshStandardMaterial color="#eab308" roughness={0.9} />
      </mesh>

      {/* Outer Sand Shoreline Ring Transitioning to Water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <ringGeometry args={[65, 85, 48]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.95} />
      </mesh>

      {/* ─── Vast Turquoise Ocean Water Surface ─── */}
      <mesh
        ref={oceanRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.12, 0]}
        receiveShadow
      >
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.15}
          metalness={0.1}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Ocean Shore Surf / Wave Foam Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]}>
        <ringGeometry args={[84, 87, 48]} />
        <meshBasicMaterial color="#e0f2fe" transparent opacity={0.6} />
      </mesh>

      {/* ─── Coastal Granite Rocks ─── */}
      {coastalRocks.map((r, i) => (
        <group key={i} position={[r.x, 0, r.z]} scale={r.scale}>
          <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 1.6, 2.2]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          <mesh position={[0.4, 1.8, -0.2]}>
            <boxGeometry args={[1.5, 1.0, 1.4]} />
            <meshStandardMaterial color="#64748b" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ─── Voxel Palm Trees ─── */}
      {palmTrees.map((p, idx) => (
        <group key={idx} position={[p.x, 0, p.z]}>
          {/* Segmented Curved Trunk */}
          {Array.from({ length: p.height }).map((_, h) => {
            const frac = h / p.height
            const bx = frac * p.curveX
            const bz = frac * p.curveZ
            return (
              <mesh key={h} position={[bx, h * 0.9 + 0.45, bz]} castShadow receiveShadow>
                <boxGeometry args={[0.65 - frac * 0.15, 0.9, 0.65 - frac * 0.15]} />
                <meshStandardMaterial color={h % 2 === 0 ? '#78350f' : '#92400e'} roughness={0.9} />
              </mesh>
            )
          })}

          {/* Palm Canopy Crown at top */}
          <group position={[p.curveX, p.height * 0.9, p.curveZ]}>
            {/* Voxel Coconuts */}
            <mesh position={[0.3, -0.2, 0.3]}>
              <boxGeometry args={[0.35, 0.35, 0.35]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>
            <mesh position={[-0.3, -0.2, 0.2]}>
              <boxGeometry args={[0.35, 0.35, 0.35]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>
            <mesh position={[0, -0.2, -0.35]}>
              <boxGeometry args={[0.35, 0.35, 0.35]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>

            {/* 8 Arching Frond Branches (North, South, East, West, Diagonals) */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angleDeg, fIdx) => {
              const rad = (angleDeg * Math.PI) / 180
              const fx = Math.cos(rad)
              const fz = Math.sin(rad)
              return (
                <group key={fIdx}>
                  {/* Inner Frond Block */}
                  <mesh position={[fx * 1.3, 0.2, fz * 1.3]}>
                    <boxGeometry args={[0.8, 0.16, 0.8]} />
                    <meshStandardMaterial color="#16a34a" roughness={0.8} />
                  </mesh>
                  {/* Middle Drooping Frond Block */}
                  <mesh position={[fx * 2.4, -0.1, fz * 2.4]}>
                    <boxGeometry args={[0.9, 0.14, 0.9]} />
                    <meshStandardMaterial color="#15803d" roughness={0.8} />
                  </mesh>
                  {/* Outer Tip */}
                  <mesh position={[fx * 3.4, -0.5, fz * 3.4]}>
                    <boxGeometry args={[0.7, 0.12, 0.7]} />
                    <meshStandardMaterial color="#166534" roughness={0.8} />
                  </mesh>
                </group>
              )
            })}
          </group>
        </group>
      ))}

      {/* ─── Striped Beach Umbrellas ─── */}
      {beachUmbrellas.map((u, i) => (
        <group key={i} position={[u.x, 0, u.z]}>
          {/* Wooden Pole */}
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[0.12, 2.8, 0.12]} />
            <meshStandardMaterial color="#b45309" />
          </mesh>
          {/* Canopy Shade Pyramid */}
          <mesh position={[0, 2.8, 0]} rotation={[0, 0.2, 0]}>
            <boxGeometry args={[2.6, 0.2, 2.6]} />
            <meshStandardMaterial color={u.color} roughness={0.6} />
          </mesh>
          <mesh position={[0, 3.0, 0]} rotation={[0, 0.2, 0]}>
            <boxGeometry args={[1.6, 0.25, 1.6]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
          <mesh position={[0, 3.2, 0]} rotation={[0, 0.2, 0]}>
            <boxGeometry args={[0.6, 0.2, 0.6]} />
            <meshStandardMaterial color={u.color} />
          </mesh>
        </group>
      ))}

      {/* ─── Rustic Wooden Beach Huts / Tiki Cabanas ─── */}
      {woodenHuts.map((h, i) => (
        <group key={i} position={[h.x, 0, h.z]} rotation={[0, h.rot, 0]}>
          {/* 4 Corner Wooden Pillars */}
          {[-1.6, 1.6].map((px) =>
            [-1.6, 1.6].map((pz) => (
              <mesh key={`${px}-${pz}`} position={[px, 1.6, pz]}>
                <boxGeometry args={[0.3, 3.2, 0.3]} />
                <meshStandardMaterial color="#78350f" />
              </mesh>
            ))
          )}
          {/* Wooden Deck Floor */}
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[3.8, 0.4, 3.8]} />
            <meshStandardMaterial color="#92400e" roughness={0.8} />
          </mesh>
          {/* Thatched Roof Canopy */}
          <mesh position={[0, 3.4, 0]}>
            <boxGeometry args={[4.4, 0.5, 4.4]} />
            <meshStandardMaterial color="#d97706" roughness={0.9} />
          </mesh>
          <mesh position={[0, 3.9, 0]}>
            <boxGeometry args={[3.0, 0.6, 3.0]} />
            <meshStandardMaterial color="#b45309" roughness={0.9} />
          </mesh>
          <mesh position={[0, 4.4, 0]}>
            <boxGeometry args={[1.4, 0.5, 1.4]} />
            <meshStandardMaterial color="#92400e" />
          </mesh>
        </group>
      ))}

      {/* ─── Distant Volcanic Horizon Islands ─── */}
      {horizonIslands.map((isl, i) => (
        <group key={i} position={[isl.x, 0, isl.z]}>
          {/* Mountain base */}
          <mesh position={[0, isl.h * 0.4, 0]}>
            <boxGeometry args={[isl.w, isl.h * 0.8, isl.d]} />
            <meshStandardMaterial color="#334155" roughness={0.9} />
          </mesh>
          {/* Lush green ridge cap */}
          <mesh position={[0, isl.h * 0.85, 0]}>
            <boxGeometry args={[isl.w * 0.6, isl.h * 0.4, isl.d * 0.6]} />
            <meshStandardMaterial color="#166534" roughness={0.9} />
          </mesh>
          {/* Peak summit */}
          <mesh position={[0, isl.h + 2, 0]}>
            <boxGeometry args={[isl.w * 0.25, 4, isl.d * 0.25]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      ))}

      {/* ─── Animated Distant Sailboats ─── */}
      <group ref={boatsRef}>
        {sailboats.map((b, i) => (
          <group key={i} position={[b.x, 0.4, b.z]} rotation={[0, b.angle, 0]}>
            {/* White boat hull */}
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[2.5, 1.0, 6.0]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
            {/* Mast */}
            <mesh position={[0, 4.5, 0.4]}>
              <boxGeometry args={[0.2, 7.5, 0.2]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
            {/* White Triangular Sail */}
            <mesh position={[0, 4.8, 1.8]} rotation={[0, 0, 0.08]}>
              <boxGeometry args={[0.08, 6.0, 2.8]} />
              <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ─── Tropical Soft Clouds in Bright Sky ─── */}
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.scale}>
          <mesh>
            <boxGeometry args={[24, 6, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
          </mesh>
          <mesh position={[4, 3, 2]}>
            <boxGeometry args={[16, 5, 12]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
