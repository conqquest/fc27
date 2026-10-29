import React, { useMemo } from 'react'
import * as THREE from 'three'
import { VoxelForest } from './VoxelForest'
import { VoxelCity } from './VoxelCity'

export const Stadium: React.FC = () => {
  // FIFA regulation pitch dimensions: 105m long (-52.5 to +52.5 in Z), 68m wide (-34 to +34 in X)
  const pitchWidth = 68
  const pitchLength = 105

  // Procedural Minecraft-style pixelated checkered grass texture
  const voxelGrassTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.imageSmoothingEnabled = false

      // Palette of vibrant Minecraft grass tones
      const grassShades = ['#3b8526', '#43992b', '#347922', '#4ca831', '#378024']

      // 16x16 pixel blocks
      const blockSize = 32
      for (let x = 0; x < 512; x += blockSize) {
        for (let y = 0; y < 512; y += blockSize) {
          const isStripeLight = Math.floor(y / 64) % 2 === 0
          const baseColorIndex = isStripeLight ? 1 : 0
          ctx.fillStyle = grassShades[baseColorIndex]
          ctx.fillRect(x, y, blockSize, blockSize)

          // Pixel noise within each block
          for (let px = 0; px < blockSize; px += 8) {
            for (let py = 0; py < blockSize; py += 8) {
              if ((px * 3 + py * 7) % 5 === 0) {
                const shadeIdx = (baseColorIndex + ((px + py) % 3)) % grassShades.length
                ctx.fillStyle = grassShades[shadeIdx]
                ctx.fillRect(x + px, y + py, 8, 8)
              }
            }
          }
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 6)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    return texture
  }, [])

  // Voxel Spectators positions and colors
  const spectatorData = useMemo(() => {
    const spectators: Array<{ x: number; y: number; z: number; shirt: string }> = []
    const colors = ['#ffffff', '#38bdf8', '#ef4444', '#fbbf24', '#10b981', '#6366f1']

    // West sideline bleachers (X = -38m)
    for (let row = 0; row < 3; row++) {
      for (let z = -35; z <= 35; z += 3.5) {
        const shirt = colors[Math.abs(Math.round(z + row * 7)) % colors.length]
        spectators.push({ x: -37.5 - row * 1.4, y: 0.6 + row * 0.8, z, shirt })
      }
    }

    // East sideline bleachers (X = +38m)
    for (let row = 0; row < 3; row++) {
      for (let z = -35; z <= 35; z += 3.5) {
        const shirt = colors[Math.abs(Math.round(z + row * 11)) % colors.length]
        spectators.push({ x: 37.5 + row * 1.4, y: 0.6 + row * 0.8, z, shirt })
      }
    }

    return spectators
  }, [])

  return (
    <group name="voxel-stadium-and-world">
      {/* ─── 1. Tiled Voxel Grass Pitch ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[pitchWidth + 8, pitchLength + 10]} />
        <meshStandardMaterial map={voxelGrassTexture} roughness={0.85} />
      </mesh>

      {/* ─── 2. Surrounding Park Grass Plane ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[140, 180]} />
        <meshStandardMaterial color="#2d6a1e" roughness={0.9} />
      </mesh>

      {/* ─── 3. White Voxel Pitch Markings ─── */}
      <group position={[0, 0.015, 0]}>
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
          <boxGeometry args={[0.32, 0.01, 0.32]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Center Circle (radius 9.15m, octagonal voxel ring) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[9.07, 9.23, 32]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Penalty Area - Home (Z = -52.5) */}
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

        {/* Penalty Area - Away (Z = +52.5) */}
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
      </group>

      {/* ─── 4. Block-Built Voxel Goals ─── */}
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

      {/* ─── 5. Voxel Corner Flags ─── */}
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

      {/* ─── 6. Voxel Sideline Dugouts & Team Benches ─── */}
      {/* Home Dugout */}
      <group position={[-pitchWidth / 2 - 4.5, 0, -8]}>
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
      <group position={[-pitchWidth / 2 - 4.5, 0, 8]}>
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

      {/* ─── 7. Voxel Sideline Bleachers & Spectators ─── */}
      {/* West Bleachers Base */}
      <mesh position={[-pitchWidth / 2 - 5, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.8, 76]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      <mesh position={[-pitchWidth / 2 - 6.5, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.8, 76]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* East Bleachers Base */}
      <mesh position={[pitchWidth / 2 + 5, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.8, 76]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      <mesh position={[pitchWidth / 2 + 6.5, 1.2, 0]} castShadow receiveShadow>
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

      {/* ─── 8. Voxel Advertising Boards Along Sidelines ─── */}
      <group position={[0, 0.4, 0]}>
        {/* West board */}
        <mesh position={[-pitchWidth / 2 - 2.2, 0, 0]}>
          <boxGeometry args={[0.2, 0.8, pitchLength + 4]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.2} />
        </mesh>
        {/* East board */}
        <mesh position={[pitchWidth / 2 + 2.2, 0, 0]}>
          <boxGeometry args={[0.2, 0.8, pitchLength + 4]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.2} />
        </mesh>
        {/* North board */}
        <mesh position={[0, 0, -pitchLength / 2 - 3.2]}>
          <boxGeometry args={[pitchWidth + 4, 0.8, 0.2]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.2} />
        </mesh>
        {/* South board */}
        <mesh position={[0, 0, pitchLength / 2 + 3.2]}>
          <boxGeometry args={[pitchWidth + 4, 0.8, 0.2]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.2} />
        </mesh>
      </group>

      {/* ─── 9. Procedural Voxel Forest Surrounding Pitch ─── */}
      <VoxelForest pitchWidth={pitchWidth} pitchLength={pitchLength} />

      {/* ─── 10. Living Voxel City & Skyline Beyond ─── */}
      <VoxelCity pitchWidth={pitchWidth} pitchLength={pitchLength} />
    </group>
  )
}
