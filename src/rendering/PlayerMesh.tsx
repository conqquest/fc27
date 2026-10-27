import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SimPlayer, Kit } from '../data/types'
import { KitGenerator } from './KitGenerator'

interface PlayerMeshProps {
  player: SimPlayer
  kit: Kit
}

export const PlayerMesh: React.FC<PlayerMeshProps> = ({ player, kit }) => {
  const groupRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)

  const isControlled = player.isControlled
  const { shirtNumber, shortName } = player.playerData

  // Generate procedural jersey texture with stripes/number/name
  const jerseyTexture = useMemo(() => {
    return KitGenerator.createJerseyTexture(kit, shirtNumber, shortName)
  }, [kit, shirtNumber, shortName])

  // Skin and material colors
  const skinColor = '#d2a679'
  const hairColor = '#2b1d0c'
  const bootColor = '#111111'

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    // Position and rotation interpolation
    groupRef.current.position.set(player.position.x, player.position.y, player.position.z)
    groupRef.current.rotation.y = player.rotation

    // Running limb animation based on speed
    const speed = Math.hypot(player.velocity.x, player.velocity.z)
    if (speed > 0.3) {
      const freq = speed * 2.2
      const t = clock.getElapsedTime() * freq
      const swing = Math.sin(t) * 0.65

      if (leftLegRef.current) leftLegRef.current.rotation.x = swing
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7
    } else {
      // Return to resting standing pose
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0
    }
  })

  return (
    <group ref={groupRef}>
      {/* ─── Controlled Player Cursor Indicator (FC27 style) ─── */}
      {isControlled && (
        <group position={[0, 2.25, 0]}>
          <mesh rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.18, 0.28, 4]} />
            <meshBasicMaterial color="#00ffcc" />
          </mesh>
          <pointLight color="#00ffcc" intensity={2.0} distance={3.0} />
        </group>
      )}

      {/* ─── Head & Hair ─── */}
      <group position={[0, 1.62, 0]}>
        {/* Head */}
        <mesh castShadow>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 0.05, -0.02]}>
          <sphereGeometry args={[0.135, 16, 16]} />
          <meshStandardMaterial color={hairColor} roughness={0.9} />
        </mesh>
      </group>

      {/* ─── Torso / Jersey ─── */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[0.42, 0.52, 0.22]} />
        <meshStandardMaterial map={jerseyTexture} roughness={0.4} />
      </mesh>

      {/* ─── Left Arm ─── */}
      <group ref={leftArmRef} position={[-0.26, 1.42, 0]}>
        {/* Sleeve */}
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.1, 0.2, 0.12]} />
          <meshStandardMaterial color={kit.colors.primary} roughness={0.4} />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -0.28, 0]} castShadow>
          <boxGeometry args={[0.08, 0.22, 0.09]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
      </group>

      {/* ─── Right Arm ─── */}
      <group ref={rightArmRef} position={[0.26, 1.42, 0]}>
        {/* Sleeve */}
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.1, 0.2, 0.12]} />
          <meshStandardMaterial color={kit.colors.primary} roughness={0.4} />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -0.28, 0]} castShadow>
          <boxGeometry args={[0.08, 0.22, 0.09]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
      </group>

      {/* ─── Shorts (Pelvis) ─── */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.4, 0.22, 0.23]} />
        <meshStandardMaterial color={kit.colors.shortsColor} roughness={0.5} />
      </mesh>

      {/* ─── Left Leg ─── */}
      <group ref={leftLegRef} position={[-0.12, 0.82, 0]}>
        {/* Thigh (shorts extension) */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.09, 0.08, 0.2, 12]} />
          <meshStandardMaterial color={kit.colors.shortsColor} roughness={0.5} />
        </mesh>
        {/* Knee & Calf (Socks) */}
        <mesh position={[0, -0.38, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.38, 12]} />
          <meshStandardMaterial color={kit.colors.socksColor} roughness={0.5} />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.58, 0.04]} castShadow>
          <boxGeometry args={[0.09, 0.07, 0.2]} />
          <meshStandardMaterial color={bootColor} roughness={0.3} metalness={0.2} />
        </mesh>
      </group>

      {/* ─── Right Leg ─── */}
      <group ref={rightLegRef} position={[0.12, 0.82, 0]}>
        {/* Thigh */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.09, 0.08, 0.2, 12]} />
          <meshStandardMaterial color={kit.colors.shortsColor} roughness={0.5} />
        </mesh>
        {/* Calf (Socks) */}
        <mesh position={[0, -0.38, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.38, 12]} />
          <meshStandardMaterial color={kit.colors.socksColor} roughness={0.5} />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.58, 0.04]} castShadow>
          <boxGeometry args={[0.09, 0.07, 0.2]} />
          <meshStandardMaterial color={bootColor} roughness={0.3} metalness={0.2} />
        </mesh>
      </group>

      {/* ─── Ground Shadow ─── */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
    </group>
  )
}
