import React, { useMemo } from 'react'
import * as THREE from 'three'
import { VoxelForest } from './VoxelForest'
import { VoxelCity } from './VoxelCity'

export const Stadium: React.FC = () => {
  // FIFA regulation pitch dimensions: 105m long (-52.5 to +52.5 in Z), 68m wide (-34 to +34 in X)
  const pitchWidth = 68
  const pitchLength = 105

  // ─── 1. Procedural Voxel Premier League / Minecraft Mown Lawn Texture ───
  const voxelPitchTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 2048
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.imageSmoothingEnabled = false

      // 18 clean, uniform lawn mower stripes across the 105m pitch length
      const numStripes = 18
      const stripeHeight = 2048 / numStripes

      const lightGreen = '#3ea837'
      const darkGreen = '#2e8629'
      const lightAccent = '#46b53f'
      const darkAccent = '#267521'

      for (let s = 0; s < numStripes; s++) {
        const isEven = s % 2 === 0
        const baseColor = isEven ? lightGreen : darkGreen
        const accentColor = isEven ? lightAccent : darkAccent
        const yStart = s * stripeHeight

        ctx.fillStyle = baseColor
        ctx.fillRect(0, yStart, 1024, stripeHeight)

        // Subtle, clean Minecraft voxel pixel dithering (16x16 pixel blocks)
        for (let x = 0; x < 1024; x += 16) {
          for (let y = yStart; y < yStart + stripeHeight; y += 16) {
            if ((x / 16 + y / 16) % 2 === 0) {
              ctx.fillStyle = accentColor
              ctx.fillRect(x, y, 16, 16)
            }
          }
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    return texture
  }, [])

  // ─── 2. Procedural Minecraft Dirt Side Texture for Raised Pitch Bed ───
  const voxelDirtTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.imageSmoothingEnabled = false
      // Rich brown soil base
      ctx.fillStyle = '#6d4c41'
      ctx.fillRect(0, 0, 64, 64)

      // Soil pixel noise
      ctx.fillStyle = '#5d4037'
      for (let x = 0; x < 64; x += 8) {
        for (let y = 0; y < 64; y += 8) {
          if ((x * 3 + y * 7) % 4 === 0) {
            ctx.fillRect(x, y, 8, 8)
          }
        }
      }

      // Overhanging green grass blocks on top rim
      ctx.fillStyle = '#3ea837'
      ctx.fillRect(0, 0, 64, 16)
      ctx.fillRect(8, 16, 16, 8)
      ctx.fillRect(36, 16, 16, 10)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(16, 1)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    return texture
  }, [])

  // ─── 3. Procedural Terracotta Athletics Track Texture ───
  const trackTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = '#991b1b' // rich terracotta track
      ctx.fillRect(0, 0, 256, 256)

      // Brick paver pattern
      ctx.fillStyle = '#7f1d1d'
      for (let y = 0; y < 256; y += 32) {
        ctx.fillRect(0, y, 256, 2)
        const offset = (y / 32) % 2 === 0 ? 0 : 32
        for (let x = offset; x < 256; x += 64) {
          ctx.fillRect(x, y, 2, 32)
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(6, 8)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    return texture
  }, [])

  // Voxel Spectators positions and colors
  const spectatorData = useMemo(() => {
    const spectators: Array<{ x: number; y: number; z: number; shirt: string }> = []
    const colors = ['#ffffff', '#38bdf8', '#ef4444', '#fbbf24', '#10b981', '#6366f1']

    // West sideline bleachers (X = -41m)
    for (let row = 0; row < 3; row++) {
      for (let z = -35; z <= 35; z += 3.5) {
        const shirt = colors[Math.abs(Math.round(z + row * 7)) % colors.length]
        spectators.push({ x: -40.5 - row * 1.4, y: 0.6 + row * 0.8, z, shirt })
      }
    }

    // East sideline bleachers (X = +41m)
    for (let row = 0; row < 3; row++) {
      for (let z = -35; z <= 35; z += 3.5) {
        const shirt = colors[Math.abs(Math.round(z + row * 11)) % colors.length]
        spectators.push({ x: 40.5 + row * 1.4, y: 0.6 + row * 0.8, z, shirt })
      }
    }

    return spectators
  }, [])

  return (
    <group name="voxel-stadium-and-world">
      {/* ─── 1. Main Raised Voxel Turf Bed (Top: Striped Pitch, Sides: Dirt) ─── */}
      <group position={[0, -0.05, 0]}>
        {/* Top Pitch Turf Surface */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
          <planeGeometry args={[pitchWidth, pitchLength]} />
          <meshStandardMaterial map={voxelPitchTexture} roughness={0.65} metalness={0.0} />
        </mesh>
        {/* Run-off Green Grass Border */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.048, 0]} receiveShadow>
          <planeGeometry args={[pitchWidth + 6, pitchLength + 6]} />
          <meshStandardMaterial color="#277821" roughness={0.7} />
        </mesh>
        {/* Raised 3D Dirt Edge Rim (West, East, North, South) */}
        <mesh position={[-pitchWidth / 2 - 3, -0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.2, pitchLength + 6.2]} />
          <meshStandardMaterial map={voxelDirtTexture} roughness={0.9} />
        </mesh>
        <mesh position={[pitchWidth / 2 + 3, -0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.2, pitchLength + 6.2]} />
          <meshStandardMaterial map={voxelDirtTexture} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.05, -pitchLength / 2 - 3]} castShadow receiveShadow>
          <boxGeometry args={[pitchWidth + 6.2, 0.2, 0.2]} />
          <meshStandardMaterial map={voxelDirtTexture} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.05, pitchLength / 2 + 3]} castShadow receiveShadow>
          <boxGeometry args={[pitchWidth + 6.2, 0.2, 0.2]} />
          <meshStandardMaterial map={voxelDirtTexture} roughness={0.9} />
        </mesh>
      </group>

      {/* ─── 2. Surrounding Terracotta Running Track & Technical Pavement ─── */}
      <group position={[0, -0.08, 0]}>
        {/* Outer Athletic Track Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[pitchWidth + 18, pitchLength + 20]} />
          <meshStandardMaterial map={trackTexture} roughness={0.8} />
        </mesh>
        {/* White Track Inner Lane Stripe */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[(pitchWidth + 6.6) / 2, (pitchWidth + 6.9) / 2, 4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* ─── 3. Raised Concrete Curbstones Framing the Ground ─── */}
      <group position={[0, 0.05, 0]}>
        {/* West Curb */}
        <mesh position={[-pitchWidth / 2 - 9.1, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.2, pitchLength + 20.4]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        {/* East Curb */}
        <mesh position={[pitchWidth / 2 + 9.1, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.2, pitchLength + 20.4]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        {/* North Curb */}
        <mesh position={[0, 0, -pitchLength / 2 - 10.1]} castShadow receiveShadow>
          <boxGeometry args={[pitchWidth + 18.4, 0.2, 0.3]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        {/* South Curb */}
        <mesh position={[0, 0, pitchLength / 2 + 10.1]} castShadow receiveShadow>
          <boxGeometry args={[pitchWidth + 18.4, 0.2, 0.3]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
      </group>

      {/* ─── 4. Surrounding Park Lawn Beyond Track ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[140, 180]} />
        <meshStandardMaterial color="#2c7521" roughness={0.85} />
      </mesh>

      {/* ─── 5. Crisp White Pitch Markings (Elevated Y = 0.02 to eliminate z-fighting) ─── */}
      <group position={[0, 0.02, 0]}>
        {/* Touchlines (Left & Right) */}
        <mesh position={[-pitchWidth / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.16, pitchLength]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[pitchWidth / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.16, pitchLength]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Goal lines (Home & Away) */}
        <mesh position={[0, 0, -pitchLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[pitchWidth, 0.16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0, pitchLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[pitchWidth, 0.16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Half-way line */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[pitchWidth, 0.16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Center Spot */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.34, 0.01, 0.34]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Center Circle (radius 9.15m) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[9.07, 9.23, 48]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* ─── Penalty Area - Home (Z = -52.5) ─── */}
        <group position={[0, 0, -pitchLength / 2 + 8.25]}>
          <mesh position={[0, 0, 8.25]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[40.32, 0.16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-20.16, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, 16.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[20.16, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, 16.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Penalty Spot */}
          <mesh position={[0, 0, 2.75]}>
            <boxGeometry args={[0.26, 0.01, 0.26]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Penalty Arc (D outside box, radius 9.15m from spot) */}
          <mesh position={[0, 0, 2.75]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[9.07, 9.23, 32, 1, Math.PI * 0.28, Math.PI * 0.44]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* 6-yard Goal Box */}
          <mesh position={[0, 0, -2.75]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[18.32, 0.16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-9.16, 0, -5.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, 5.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[9.16, 0, -5.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, 5.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>

        {/* ─── Penalty Area - Away (Z = +52.5) ─── */}
        <group position={[0, 0, pitchLength / 2 - 8.25]}>
          <mesh position={[0, 0, -8.25]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[40.32, 0.16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-20.16, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, 16.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[20.16, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, 16.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Penalty Spot */}
          <mesh position={[0, 0, -2.75]}>
            <boxGeometry args={[0.26, 0.01, 0.26]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Penalty Arc (D outside box, radius 9.15m from spot) */}
          <mesh position={[0, 0, -2.75]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[9.07, 9.23, 32, 1, Math.PI * 1.28, Math.PI * 0.44]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* 6-yard Goal Box */}
          <mesh position={[0, 0, 2.75]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[18.32, 0.16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-9.16, 0, 5.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, 5.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[9.16, 0, 5.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, 5.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>

        {/* ─── Corner Arcs (1m radius at all 4 corners) ─── */}
        {/* Top-Left Corner */}
        <mesh position={[-pitchWidth / 2, 0, -pitchLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.92, 1.08, 16, 1, 0, Math.PI * 0.5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Top-Right Corner */}
        <mesh position={[pitchWidth / 2, 0, -pitchLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.92, 1.08, 16, 1, Math.PI * 0.5, Math.PI * 0.5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Bottom-Left Corner */}
        <mesh position={[-pitchWidth / 2, 0, pitchLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.92, 1.08, 16, 1, Math.PI * 1.5, Math.PI * 0.5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Bottom-Right Corner */}
        <mesh position={[pitchWidth / 2, 0, pitchLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.92, 1.08, 16, 1, Math.PI, Math.PI * 0.5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* ─── 6. Block-Built Voxel Goals ─── */}
      {/* Home Goal (Z = -52.5) */}
      <group position={[0, 0, -pitchLength / 2]}>
        {/* Left post (square block) */}
        <mesh position={[-3.66, 1.22, 0]} castShadow>
          <boxGeometry args={[0.16, 2.44, 0.16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Right post */}
        <mesh position={[3.66, 1.22, 0]} castShadow>
          <boxGeometry args={[0.16, 2.44, 0.16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Crossbar */}
        <mesh position={[0, 2.44, 0]} castShadow>
          <boxGeometry args={[7.48, 0.16, 0.16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Voxel Net Box */}
        <mesh position={[0, 1.22, -1.0]}>
          <boxGeometry args={[7.32, 2.44, 2.0]} />
          <meshStandardMaterial
            color="#f1f5f9"
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>
        {/* Net bottom frame bar */}
        <mesh position={[0, 0.08, -2.0]}>
          <boxGeometry args={[7.48, 0.16, 0.16]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
      </group>

      {/* Away Goal (Z = +52.5) */}
      <group position={[0, 0, pitchLength / 2]}>
        {/* Left post */}
        <mesh position={[-3.66, 1.22, 0]} castShadow>
          <boxGeometry args={[0.16, 2.44, 0.16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Right post */}
        <mesh position={[3.66, 1.22, 0]} castShadow>
          <boxGeometry args={[0.16, 2.44, 0.16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Crossbar */}
        <mesh position={[0, 2.44, 0]} castShadow>
          <boxGeometry args={[7.48, 0.16, 0.16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Voxel Net Box */}
        <mesh position={[0, 1.22, 1.0]}>
          <boxGeometry args={[7.32, 2.44, 2.0]} />
          <meshStandardMaterial
            color="#f1f5f9"
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>
        {/* Net bottom frame bar */}
        <mesh position={[0, 0.08, 2.0]}>
          <boxGeometry args={[7.48, 0.16, 0.16]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
      </group>

      {/* ─── 7. Voxel Corner Flags ─── */}
      {[
        [-pitchWidth / 2, -pitchLength / 2],
        [pitchWidth / 2, -pitchLength / 2],
        [-pitchWidth / 2, pitchLength / 2],
        [pitchWidth / 2, pitchLength / 2],
      ].map(([fx, fz], idx) => (
        <group key={idx} position={[fx, 0, fz]}>
          {/* Voxel Pole */}
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[0.08, 1.5, 0.08]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          {/* Pixel Flag */}
          <mesh position={[0.18, 1.35, 0]}>
            <boxGeometry args={[0.28, 0.22, 0.04]} />
            <meshStandardMaterial color="#ef4444" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* ─── 8. Voxel Sideline Dugouts & Team Benches ─── */}
      {/* Home Dugout */}
      <group position={[-pitchWidth / 2 - 5.5, 0, -8]}>
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[2.5, 2.6, 6.0]} />
          <meshStandardMaterial color="#0f172a" transparent opacity={0.65} roughness={0.2} />
        </mesh>
        {/* Bench seat */}
        <mesh position={[0.4, 0.45, 0]}>
          <boxGeometry args={[1.2, 0.3, 5.2]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
      </group>

      {/* Away Dugout */}
      <group position={[-pitchWidth / 2 - 5.5, 0, 8]}>
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[2.5, 2.6, 6.0]} />
          <meshStandardMaterial color="#0f172a" transparent opacity={0.65} roughness={0.2} />
        </mesh>
        {/* Bench seat */}
        <mesh position={[0.4, 0.45, 0]}>
          <boxGeometry args={[1.2, 0.3, 5.2]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
      </group>

      {/* ─── 9. Voxel Sideline Bleachers & Spectators ─── */}
      {/* West Bleachers Base */}
      <mesh position={[-pitchWidth / 2 - 6, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.8, 76]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      <mesh position={[-pitchWidth / 2 - 7.5, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.8, 76]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* East Bleachers Base */}
      <mesh position={[pitchWidth / 2 + 6, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.8, 76]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      <mesh position={[pitchWidth / 2 + 7.5, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.8, 76]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* Mini Voxel Spectators */}
      {spectatorData.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]}>
          {/* Head */}
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[0.26, 0.26, 0.26]} />
            <meshStandardMaterial color="#d6a374" roughness={0.8} />
          </mesh>
          {/* Body */}
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[0.32, 0.38, 0.22]} />
            <meshStandardMaterial color={s.shirt} roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* ─── 10. Voxel Perimeter Advertising Boards ─── */}
      <group position={[0, 0.4, 0]}>
        {/* West board */}
        <mesh position={[-pitchWidth / 2 - 2.4, 0, 0]}>
          <boxGeometry args={[0.2, 0.8, pitchLength + 4]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.2} />
        </mesh>
        {/* East board */}
        <mesh position={[pitchWidth / 2 + 2.4, 0, 0]}>
          <boxGeometry args={[0.2, 0.8, pitchLength + 4]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.2} />
        </mesh>
        {/* North board */}
        <mesh position={[0, 0, -pitchLength / 2 - 3.4]}>
          <boxGeometry args={[pitchWidth + 4.8, 0.8, 0.2]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.2} />
        </mesh>
        {/* South board */}
        <mesh position={[0, 0, pitchLength / 2 + 3.4]}>
          <boxGeometry args={[pitchWidth + 4.8, 0.8, 0.2]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.2} />
        </mesh>
      </group>

      {/* ─── 11. Procedural Voxel Forest Surrounding Pitch ─── */}
      <VoxelForest pitchWidth={pitchWidth} pitchLength={pitchLength} />

      {/* ─── 12. Living Voxel City & Skyline Beyond ─── */}
      <VoxelCity pitchWidth={pitchWidth} pitchLength={pitchLength} />
    </group>
  )
}
