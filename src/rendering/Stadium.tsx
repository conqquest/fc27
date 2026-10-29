import React, { useMemo } from 'react'
import * as THREE from 'three'
import { VoxelForest } from './VoxelForest'
import { VoxelCity } from './VoxelCity'

export const Stadium: React.FC = () => {
  // FIFA regulation pitch dimensions: 105m long (-52.5 to +52.5 in Z), 68m wide (-34 to +34 in X)
  const pitchWidth = 68
  const pitchLength = 105

  // ─── 1. Clean, Simple Tournament Turf Grass Texture ───
  const voxelPitchTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 2048
    const ctx = canvas.getContext('2d')

    if (ctx) {
      // 16 tournament mowing stripes across the 105m pitch length (~6.56m per stripe)
      const numStripes = 16
      const stripeHeight = 2048 / numStripes

      // Lush, vibrant grass tones: Emerald & Tournament Green
      const lightGreen = '#389b3f'
      const darkGreen = '#2c8332'

      for (let s = 0; s < numStripes; s++) {
        const isEven = s % 2 === 0
        const baseColor = isEven ? lightGreen : darkGreen
        const yStart = s * stripeHeight

        ctx.fillStyle = baseColor
        ctx.fillRect(0, yStart, 1024, stripeHeight)

        // Subtle mower cut roller sheen (gradient across each stripe)
        const grad = ctx.createLinearGradient(0, yStart, 0, yStart + stripeHeight)
        grad.addColorStop(0, isEven ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)')
        grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
        grad.addColorStop(1, isEven ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)')
        ctx.fillStyle = grad
        ctx.fillRect(0, yStart, 1024, stripeHeight)

        // Clean, crisp mower seam line between stripes
        ctx.fillStyle = 'rgba(20, 70, 25, 0.25)'
        ctx.fillRect(0, yStart, 1024, 2)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
        ctx.fillRect(0, yStart + stripeHeight - 1, 1024, 1)
      }

      // Natural, high-density grass blade dithering (fine grain, eliminates checkerboard)
      const imgData = ctx.getImageData(0, 0, 1024, 2048)
      const data = imgData.data

      let seed = 4281
      const pseudoRandom = () => {
        seed = (seed * 16807) % 2147483647
        return (seed - 1) / 2147483646
      }

      for (let i = 0; i < data.length; i += 4) {
        const noise = (pseudoRandom() - 0.5) * 10
        data[i] = Math.min(255, Math.max(0, data[i] + noise * 0.8))
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 1.2))
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.7))
      }
      ctx.putImageData(imgData, 0, 0)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 16
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
      {/* ─── 1. Tiled Voxel Grass Pitch ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[pitchWidth + 8, pitchLength + 10]} />
        <meshStandardMaterial map={voxelPitchTexture} roughness={0.75} />
      </mesh>

      {/* ─── 2. Surrounding Park Grass Plane ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[140, 180]} />
        <meshStandardMaterial color="#2d6a1e" roughness={0.9} />
      </mesh>

      {/* ─── 3. Crisp White Pitch Markings ─── */}
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

      {/* ─── 7. Voxel Sideline Bleachers & Spectators ─── */}
      {/* West Bleachers Base */}
      <mesh position={[-pitchWidth / 2 - 6, 0.4, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.8, 76]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      <mesh position={[-pitchWidth / 2 - 7.5, 1.2, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.8, 76]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* East Bleachers Base */}
      <mesh position={[pitchWidth / 2 + 6, 0.4, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.8, 76]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      <mesh position={[pitchWidth / 2 + 7.5, 1.2, 0]} receiveShadow>
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

      {/* ─── 8. Voxel Perimeter Advertising Boards ─── */}
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

      {/* ─── 9. Procedural Voxel Forest Surrounding Pitch ─── */}
      <VoxelForest pitchWidth={pitchWidth} pitchLength={pitchLength} />

      {/* ─── 10. Living Voxel City & Skyline Beyond ─── */}
      <VoxelCity pitchWidth={pitchWidth} pitchLength={pitchLength} />
    </group>
  )
}
