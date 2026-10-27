import React, { useMemo } from 'react'
import * as THREE from 'three'

export const Stadium: React.FC = () => {
  // Pitch dimensions: 105m long (-52.5 to +52.5 in Z), 68m wide (-34 to +34 in X)
  const pitchWidth = 68
  const pitchLength = 105

  // Procedural striped grass texture
  const grassTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const stripeHeight = 1024 / 16
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#276822' : '#2e7a28'
        ctx.fillRect(0, i * stripeHeight, 1024, stripeHeight)
      }
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 1)
    return texture
  }, [])

  return (
    <group>
      {/* ─── Ground Pitch Plane ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[pitchWidth + 8, pitchLength + 10]} />
        <meshStandardMaterial map={grassTexture} roughness={0.8} />
      </mesh>

      {/* ─── Outer Run-off grass ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[pitchWidth + 24, pitchLength + 24]} />
        <meshStandardMaterial color="#1a4516" roughness={0.9} />
      </mesh>

      {/* ─── Pitch Markings (White Lines) ─── */}
      <group position={[0, 0.01, 0]}>
        {/* Outer boundary lines */}
        {/* Touchlines (Left & Right) */}
        <mesh position={[-pitchWidth / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, pitchLength]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[pitchWidth / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, pitchLength]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Goal lines (Top & Bottom) */}
        <mesh position={[0, 0, -pitchLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[pitchWidth, 0.12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0, pitchLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[pitchWidth, 0.12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Half-way line */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[pitchWidth, 0.12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Center Spot */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.25, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Center Circle (radius 9.15m) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[9.1, 9.22, 64]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Penalty Area - Home (Z = -52.5) */}
        <group position={[0, 0, -pitchLength / 2 + 8.25]}>
          <mesh position={[0, 0, 8.25]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[40.32, 0.12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-20.16, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.12, 16.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[20.16, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.12, 16.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Penalty Spot */}
          <mesh position={[0, 0, 2.75]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.22, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>

        {/* Penalty Area - Away (Z = +52.5) */}
        <group position={[0, 0, pitchLength / 2 - 8.25]}>
          <mesh position={[0, 0, -8.25]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[40.32, 0.12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-20.16, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.12, 16.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[20.16, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.12, 16.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Penalty Spot */}
          <mesh position={[0, 0, -2.75]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.22, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      </group>

      {/* ─── 3D Goals ─── */}
      {/* Home Goal (Z = -52.5) */}
      <group position={[0, 0, -pitchLength / 2]}>
        {/* Left post */}
        <mesh position={[-3.66, 1.22, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 2.44, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.3} />
        </mesh>
        {/* Right post */}
        <mesh position={[3.66, 1.22, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 2.44, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.3} />
        </mesh>
        {/* Crossbar */}
        <mesh position={[0, 2.44, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 7.46, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.3} />
        </mesh>
        {/* Net box */}
        <mesh position={[0, 1.22, -1.0]}>
          <boxGeometry args={[7.32, 2.44, 2.0]} />
          <meshStandardMaterial color="#e0e0e0" wireframe transparent opacity={0.35} />
        </mesh>
      </group>

      {/* Away Goal (Z = +52.5) */}
      <group position={[0, 0, pitchLength / 2]}>
        {/* Left post */}
        <mesh position={[-3.66, 1.22, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 2.44, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.3} />
        </mesh>
        {/* Right post */}
        <mesh position={[3.66, 1.22, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 2.44, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.3} />
        </mesh>
        {/* Crossbar */}
        <mesh position={[0, 2.44, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 7.46, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.3} />
        </mesh>
        {/* Net box */}
        <mesh position={[0, 1.22, 1.0]}>
          <boxGeometry args={[7.32, 2.44, 2.0]} />
          <meshStandardMaterial color="#e0e0e0" wireframe transparent opacity={0.35} />
        </mesh>
      </group>

      {/* ─── Corner Flags ─── */}
      {[
        [-pitchWidth / 2, -pitchLength / 2],
        [pitchWidth / 2, -pitchLength / 2],
        [-pitchWidth / 2, pitchLength / 2],
        [pitchWidth / 2, pitchLength / 2],
      ].map(([fx, fz], idx) => (
        <group key={idx} position={[fx, 0, fz]}>
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
            <meshStandardMaterial color="#ffff00" />
          </mesh>
          <mesh position={[0.15, 1.35, 0]}>
            <planeGeometry args={[0.3, 0.2]} />
            <meshBasicMaterial color="#ff0000" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* ─── Perimeter LED Advertising Boards ─── */}
      <group position={[0, 0.45, 0]}>
        {/* Left board */}
        <mesh position={[-pitchWidth / 2 - 3, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[pitchLength + 4, 0.9, 0.2]} />
          <meshStandardMaterial color="#0b1e36" emissive="#003366" emissiveIntensity={0.3} />
        </mesh>
        {/* Right board */}
        <mesh position={[pitchWidth / 2 + 3, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <boxGeometry args={[pitchLength + 4, 0.9, 0.2]} />
          <meshStandardMaterial color="#0b1e36" emissive="#003366" emissiveIntensity={0.3} />
        </mesh>
        {/* Top board */}
        <mesh position={[0, 0, -pitchLength / 2 - 4]}>
          <boxGeometry args={[pitchWidth + 8, 0.9, 0.2]} />
          <meshStandardMaterial color="#0b1e36" emissive="#003366" emissiveIntensity={0.3} />
        </mesh>
        {/* Bottom board */}
        <mesh position={[0, 0, pitchLength / 2 + 4]}>
          <boxGeometry args={[pitchWidth + 8, 0.9, 0.2]} />
          <meshStandardMaterial color="#0b1e36" emissive="#003366" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* ─── Stadium Stands & Seating ─── */}
      <group position={[0, 0, 0]}>
        {/* West Stand (Side) */}
        <mesh position={[-pitchWidth / 2 - 18, 10, 0]} rotation={[0, 0, -0.45]} receiveShadow>
          <boxGeometry args={[26, 3, pitchLength + 20]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* East Stand (Side) */}
        <mesh position={[pitchWidth / 2 + 18, 10, 0]} rotation={[0, 0, 0.45]} receiveShadow>
          <boxGeometry args={[26, 3, pitchLength + 20]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* North Stand (Behind Home Goal) */}
        <mesh position={[0, 10, -pitchLength / 2 - 18]} rotation={[0.45, 0, 0]} receiveShadow>
          <boxGeometry args={[pitchWidth + 24, 3, 26]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* South Stand (Behind Away Goal) */}
        <mesh position={[0, 10, pitchLength / 2 + 18]} rotation={[-0.45, 0, 0]} receiveShadow>
          <boxGeometry args={[pitchWidth + 24, 3, 26]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* ─── Stadium Floodlight Towers ─── */}
      {[
        [-pitchWidth / 2 - 14, -pitchLength / 2 - 14],
        [pitchWidth / 2 + 14, -pitchLength / 2 - 14],
        [-pitchWidth / 2 - 14, pitchLength / 2 + 14],
        [pitchWidth / 2 + 14, pitchLength / 2 + 14],
      ].map(([lx, lz], i) => (
        <group key={i} position={[lx, 0, lz]}>
          {/* Tower Pole */}
          <mesh position={[0, 15, 0]}>
            <cylinderGeometry args={[0.4, 0.8, 30, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Light Rig Head */}
          <mesh position={[0, 30, 0]}>
            <boxGeometry args={[4, 2, 2]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          {/* Point/Spot light */}
          <pointLight position={[0, 29, 0]} intensity={1200} distance={130} color="#fff8e7" />
        </group>
      ))}
    </group>
  )
}
