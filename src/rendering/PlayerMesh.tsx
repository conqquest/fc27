import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SimPlayer, Kit } from '../data/types'
import { VoxelKitGenerator } from './VoxelKitGenerator'

interface PlayerMeshProps {
  player: SimPlayer
  kit: Kit
  isPassTarget?: boolean
  onSelect?: (playerId: string) => void
}

export const PlayerMesh: React.FC<PlayerMeshProps> = ({
  player,
  kit,
  isPassTarget = false,
  onSelect,
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  const isControlled = player.isControlled
  const { shirtNumber, shortName, position } = player.playerData

  // Deterministic variety for hair and skin tones based on player ID
  const seed = useMemo(() => {
    let s = 0
    for (let i = 0; i < player.id.length; i++) s += player.id.charCodeAt(i)
    return s
  }, [player.id])

  const skinTones = ['#e0ac69', '#d6a374', '#bb8656', '#8d5524', '#f1c27d', '#593110']
  const hairColors = ['#1a110b', '#2e1c0c', '#4a3728', '#c68642', '#0f0f14', '#b55233']
  const eyeColors = ['#2563eb', '#15803d', '#78350f', '#0284c7']

  const skinColor = skinTones[seed % skinTones.length]
  const hairColor = hairColors[(seed * 3) % hairColors.length]
  const eyeColor = eyeColors[(seed * 5) % eyeColors.length]

  const bootColor = player.teamIndex === 0 ? '#111827' : '#e11d48'
  const sockColor = kit.colors.secondary || kit.colors.primary
  const shortsColor = kit.colors.accent || kit.colors.secondary || '#1e293b'

  // Procedural voxel textures
  const jerseyTexture = useMemo(() => {
    return VoxelKitGenerator.createVoxelJerseyTexture(kit, shirtNumber, shortName)
  }, [kit, shirtNumber, shortName])

  const faceTexture = useMemo(() => {
    return VoxelKitGenerator.createVoxelFaceTexture(skinColor, eyeColor, hairColor)
  }, [skinColor, eyeColor, hairColor])

  // Canvas texture for player name badge above head
  const nameBadgeTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = 'rgba(10, 15, 25, 0.88)'
      ctx.fillRect(8, 8, 240, 48)

      // Voxel border
      ctx.strokeStyle = '#00ffcc'
      ctx.lineWidth = 4
      ctx.strokeRect(8, 8, 240, 48)

      // Position badge
      ctx.fillStyle = '#00ffcc'
      ctx.font = 'bold 22px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(position, 22, 40)

      // Name & Number
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${shortName.toUpperCase()} #${shirtNumber}`, 234, 40)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    return texture
  }, [shortName, shirtNumber, position])

  // Multi-material setup for the cubic head (Face on +Z front, skin on sides/bottom, hair on top/back)
  const headMaterials = useMemo(() => {
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 })
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 })
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 0.7 })

    // [px, nx, py, ny, pz, nz] -> right, left, top, bottom, front, back
    return [skinMat, skinMat, hairMat, skinMat, faceMat, hairMat]
  }, [skinColor, hairColor, faceTexture])

  // Torso materials: Jersey on front/back, sides
  const torsoMaterials = useMemo(() => {
    const jMat = new THREE.MeshStandardMaterial({ map: jerseyTexture, roughness: 0.6 })
    const sideMat = new THREE.MeshStandardMaterial({ color: kit.colors.primary, roughness: 0.6 })
    return [sideMat, sideMat, sideMat, sideMat, jMat, jMat]
  }, [jerseyTexture, kit.colors.primary])

  useFrame(({ clock }) => {
    if (!groupRef.current || !player.isOnPitch) return

    // Position and rotation
    groupRef.current.position.set(player.position.x, player.position.y, player.position.z)
    groupRef.current.rotation.y = player.rotation

    // Pulsing circle ring effect around controlled player
    if (isControlled && ringRef.current) {
      const pulse = 1.0 + Math.sin(clock.getElapsedTime() * 6.0) * 0.08
      ringRef.current.scale.set(pulse, pulse, pulse)
    }

    // Realistic voxel running and kicking animations
    const speed = Math.hypot(player.velocity.x, player.velocity.z)
    if (speed > 0.2) {
      const strideFreq = Math.min(18.0, 7.0 + speed * 1.8)
      const t = clock.getElapsedTime() * strideFreq
      const swing = Math.sin(t) * 0.75

      // Torso leans forward into the sprint
      if (bodyRef.current) {
        bodyRef.current.rotation.x = Math.min(0.24, 0.08 + speed * 0.02)
        bodyRef.current.position.y = Math.abs(Math.sin(t)) * 0.05
      }

      // Voxel limbs swing around shoulder and hip pivots
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing

      // Arms swing counter to legs
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -swing * 0.8
        leftArmRef.current.rotation.z = 0.08
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = swing * 0.8
        rightArmRef.current.rotation.z = -0.08
      }
    } else {
      // Natural voxel idle breathing pose
      const breathe = Math.sin(clock.getElapsedTime() * 2.5) * 0.02
      if (bodyRef.current) {
        bodyRef.current.rotation.x = breathe
        bodyRef.current.position.y = 0
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 0.04
        leftArmRef.current.rotation.z = 0.06
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = 0.04
        rightArmRef.current.rotation.z = -0.06
      }
    }
  })

  if (!player.isOnPitch) {
    return null
  }

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(player.id)
      }}
    >
      {/* ─── Pass Target Indicator on Teammate (Voxel Amber Marker) ─── */}
      {!isControlled && isPassTarget && (
        <group position={[0, 0.025, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.65, 0.85, 8]} />
            <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} transparent opacity={0.85} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.65, 8]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.18} />
          </mesh>
          {/* Voxel floating downward arrow */}
          <group position={[0, 2.3, 0]}>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[0.1, 0.2, 0.1]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
            <mesh position={[0, -0.08, 0]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.16, 0.18, 4]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
          </group>
        </group>
      )}

      {/* ─── Controlled Player Surrounding Voxel Circle Indicator ─── */}
      {isControlled && (
        <group position={[0, 0.03, 0]}>
          {/* Outer glowing pulsing octagon ring */}
          <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.82, 0.98, 16]} />
            <meshBasicMaterial color="#00ffcc" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>

          {/* Inner accent ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.72, 0.78, 16]} />
            <meshBasicMaterial color="#00d4ff" side={THREE.DoubleSide} transparent opacity={0.6} />
          </mesh>

          {/* Translucent floor disc */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.72, 16]} />
            <meshBasicMaterial color="#00ffcc" transparent opacity={0.16} />
          </mesh>

          {/* Directional Voxel Arrow / Chevron pointing forward */}
          <group position={[0, 0.02, 0.88]}>
            <mesh>
              <boxGeometry args={[0.22, 0.04, 0.22]} />
              <meshBasicMaterial color="#00ffcc" />
            </mesh>
            <mesh position={[0, 0.01, 0.12]}>
              <boxGeometry args={[0.12, 0.04, 0.12]} />
              <meshBasicMaterial color="#00ffcc" />
            </mesh>
          </group>

          {/* Overhead Floating Nameplate Billboard */}
          <mesh position={[0, 2.35, 0]}>
            <planeGeometry args={[1.5, 0.38]} />
            <meshBasicMaterial map={nameBadgeTexture} transparent opacity={0.95} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* ─── Authentic Minecraft-Style Voxel Character Hierarchy ─── */}
      <group ref={bodyRef}>
        {/* Head Group (Center Y = 1.62) */}
        <group ref={headRef} position={[0, 1.62, 0]}>
          {/* Main Cubic Head with pixel face */}
          <mesh material={headMaterials} castShadow receiveShadow>
            <boxGeometry args={[0.38, 0.38, 0.38]} />
          </mesh>

          {/* 3D Layered Voxel Hair Helmet/Cap */}
          <mesh position={[0, 0.03, -0.01]} castShadow>
            <boxGeometry args={[0.405, 0.38, 0.405]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          {/* Hair Front Fringe Blocks */}
          <mesh position={[0, 0.16, 0.19]}>
            <boxGeometry args={[0.32, 0.08, 0.04]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
        </group>

        {/* Torso & Athletic Chest with Voxel Jersey (Center Y = 1.15) */}
        <group position={[0, 1.15, 0]}>
          <mesh material={torsoMaterials} castShadow receiveShadow>
            <boxGeometry args={[0.44, 0.54, 0.24]} />
          </mesh>
        </group>

        {/* Pelvis & Shorts (Center Y = 0.82) */}
        <group position={[0, 0.82, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.43, 0.18, 0.23]} />
            <meshStandardMaterial color={shortsColor} roughness={0.7} />
          </mesh>
        </group>

        {/* Left Arm (Pivot at shoulder: X = -0.32, Y = 1.38, Z = 0) */}
        <group ref={leftArmRef} position={[-0.31, 1.38, 0]}>
          {/* Upper sleeve */}
          <mesh position={[0, -0.14, 0]} castShadow>
            <boxGeometry args={[0.18, 0.28, 0.20]} />
            <meshStandardMaterial color={kit.colors.primary} roughness={0.6} />
          </mesh>
          {/* Forearm & Hand (skin tone) */}
          <mesh position={[0, -0.38, 0]} castShadow>
            <boxGeometry args={[0.16, 0.24, 0.18]} />
            <meshStandardMaterial color={skinColor} roughness={0.8} />
          </mesh>
        </group>

        {/* Right Arm (Pivot at shoulder: X = 0.32, Y = 1.38, Z = 0) */}
        <group ref={rightArmRef} position={[0.31, 1.38, 0]}>
          {/* Upper sleeve */}
          <mesh position={[0, -0.14, 0]} castShadow>
            <boxGeometry args={[0.18, 0.28, 0.20]} />
            <meshStandardMaterial color={kit.colors.primary} roughness={0.6} />
          </mesh>
          {/* Forearm & Hand (skin tone) */}
          <mesh position={[0, -0.38, 0]} castShadow>
            <boxGeometry args={[0.16, 0.24, 0.18]} />
            <meshStandardMaterial color={skinColor} roughness={0.8} />
          </mesh>
        </group>

        {/* Left Leg (Pivot at hip: X = -0.11, Y = 0.72, Z = 0) */}
        <group ref={leftLegRef} position={[-0.11, 0.72, 0]}>
          {/* Upper leg: shorts cuff */}
          <mesh position={[0, -0.09, 0]} castShadow>
            <boxGeometry args={[0.20, 0.18, 0.21]} />
            <meshStandardMaterial color={shortsColor} roughness={0.7} />
          </mesh>
          {/* Mid leg: Team Socks */}
          <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.19, 0.22, 0.20]} />
            <meshStandardMaterial color={sockColor} roughness={0.7} />
          </mesh>
          {/* Sock Top Stripe */}
          <mesh position={[0, -0.19, 0]}>
            <boxGeometry args={[0.195, 0.04, 0.205]} />
            <meshStandardMaterial color={kit.colors.accent || '#ffffff'} roughness={0.7} />
          </mesh>
          {/* Blocky Football Boot */}
          <group position={[0, -0.45, 0.03]}>
            <mesh castShadow>
              <boxGeometry args={[0.20, 0.12, 0.26]} />
              <meshStandardMaterial color={bootColor} roughness={0.5} />
            </mesh>
            {/* Boot Studs */}
            <mesh position={[0.06, -0.07, -0.06]}>
              <boxGeometry args={[0.05, 0.03, 0.05]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-0.06, -0.07, -0.06]}>
              <boxGeometry args={[0.05, 0.03, 0.05]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.06, -0.07, 0.06]}>
              <boxGeometry args={[0.05, 0.03, 0.05]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-0.06, -0.07, 0.06]}>
              <boxGeometry args={[0.05, 0.03, 0.05]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        </group>

        {/* Right Leg (Pivot at hip: X = 0.11, Y = 0.72, Z = 0) */}
        <group ref={rightLegRef} position={[0.11, 0.72, 0]}>
          {/* Upper leg: shorts cuff */}
          <mesh position={[0, -0.09, 0]} castShadow>
            <boxGeometry args={[0.20, 0.18, 0.21]} />
            <meshStandardMaterial color={shortsColor} roughness={0.7} />
          </mesh>
          {/* Mid leg: Team Socks */}
          <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.19, 0.22, 0.20]} />
            <meshStandardMaterial color={sockColor} roughness={0.7} />
          </mesh>
          {/* Sock Top Stripe */}
          <mesh position={[0, -0.19, 0]}>
            <boxGeometry args={[0.195, 0.04, 0.205]} />
            <meshStandardMaterial color={kit.colors.accent || '#ffffff'} roughness={0.7} />
          </mesh>
          {/* Blocky Football Boot */}
          <group position={[0, -0.45, 0.03]}>
            <mesh castShadow>
              <boxGeometry args={[0.20, 0.12, 0.26]} />
              <meshStandardMaterial color={bootColor} roughness={0.5} />
            </mesh>
            {/* Boot Studs */}
            <mesh position={[0.06, -0.07, -0.06]}>
              <boxGeometry args={[0.05, 0.03, 0.05]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-0.06, -0.07, -0.06]}>
              <boxGeometry args={[0.05, 0.03, 0.05]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.06, -0.07, 0.06]}>
              <boxGeometry args={[0.05, 0.03, 0.05]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-0.06, -0.07, 0.06]}>
              <boxGeometry args={[0.05, 0.03, 0.05]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}
