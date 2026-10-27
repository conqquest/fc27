import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SimPlayer, Kit } from '../data/types'
import { KitGenerator } from './KitGenerator'

interface PlayerMeshProps {
  player: SimPlayer
  kit: Kit
  isPassTarget?: boolean
  onSelect?: (playerId: string) => void
}

export const PlayerMesh: React.FC<PlayerMeshProps> = ({ player, kit, isPassTarget = false, onSelect }) => {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const leftCalfRef = useRef<THREE.Group>(null)
  const rightCalfRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  const isControlled = player.isControlled
  const { shirtNumber, shortName, position } = player.playerData

  // Generate procedural jersey texture with stripes/number/name
  const jerseyTexture = useMemo(() => {
    return KitGenerator.createJerseyTexture(kit, shirtNumber, shortName)
  }, [kit, shirtNumber, shortName])

  // Skin tones and accents
  const skinColor = '#d6a374'
  const hairColor = '#1f1610'
  const bootColor = player.teamIndex === 0 ? '#111827' : '#e11d48'
  const studColor = '#ffffff'

  // Canvas texture for player name badge above head
  const nameBadgeTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'rgba(10, 15, 25, 0.85)'
      ctx.beginPath()
      ctx.roundRect(8, 8, 240, 48, 12)
      ctx.fill()
      ctx.strokeStyle = '#00ffcc'
      ctx.lineWidth = 3
      ctx.stroke()

      // Position badge
      ctx.fillStyle = '#00ffcc'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(position, 22, 38)

      // Name & Number
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`${shortName.toUpperCase()} ${shirtNumber}`, 234, 38)
    }
    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }, [shortName, shirtNumber, position])

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    // Position and rotation
    groupRef.current.position.set(player.position.x, player.position.y, player.position.z)
    groupRef.current.rotation.y = player.rotation

    // Pulsing circle ring effect around controlled player
    if (isControlled && ringRef.current) {
      const pulse = 1.0 + Math.sin(clock.getElapsedTime() * 6.0) * 0.08
      ringRef.current.scale.set(pulse, pulse, pulse)
    }

    // Realistic running animations
    const speed = Math.hypot(player.velocity.x, player.velocity.z)
    if (speed > 0.2) {
      const strideFreq = Math.min(18.0, 6.0 + speed * 1.6)
      const t = clock.getElapsedTime() * strideFreq
      const swing = Math.sin(t) * 0.75

      // Torso leans forward into the sprint
      if (bodyRef.current) {
        bodyRef.current.rotation.x = Math.min(0.28, 0.08 + speed * 0.02)
      }

      // Upper leg (hip joint)
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing

      // Lower leg (knee bend)
      if (leftCalfRef.current) {
        leftCalfRef.current.rotation.x = swing > 0 ? 0.35 + swing * 0.5 : 0.05
      }
      if (rightCalfRef.current) {
        rightCalfRef.current.rotation.x = -swing > 0 ? 0.35 - swing * 0.5 : 0.05
      }

      // Arms swing counter to legs
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -swing * 0.65
        leftArmRef.current.rotation.z = 0.15
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = swing * 0.65
        rightArmRef.current.rotation.z = -0.15
      }
    } else {
      // Natural standing breathing pose
      const breathe = Math.sin(clock.getElapsedTime() * 2.5) * 0.02
      if (bodyRef.current) bodyRef.current.rotation.x = breathe
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0
      if (leftCalfRef.current) leftCalfRef.current.rotation.x = 0
      if (rightCalfRef.current) rightCalfRef.current.rotation.x = 0
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 0.05
        leftArmRef.current.rotation.z = 0.1
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = 0.05
        rightArmRef.current.rotation.z = -0.1
      }
    }
  })

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(player.id)
      }}
    >
      {/* ─── Pass Target Indicator on Teammate ─── */}
      {!isControlled && isPassTarget && (
        <group position={[0, 0.025, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.65, 0.8, 32]} />
            <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} transparent opacity={0.85} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.65, 32]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.15} />
          </mesh>
          {/* Small floating marker */}
          <group position={[0, 2.2, 0]}>
            <mesh rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.12, 0.22, 4]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
          </group>
        </group>
      )}

      {/* ─── Controlled Player Surrounding Circle Indicator on the Grass ─── */}
      {isControlled && (
        <group position={[0, 0.03, 0]}>
          {/* Outer glowing pulsing ring */}
          <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.82, 0.96, 48]} />
            <meshBasicMaterial color="#00ffcc" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>

          {/* Inner accent ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.74, 0.78, 48]} />
            <meshBasicMaterial color="#00d4ff" side={THREE.DoubleSide} transparent opacity={0.6} />
          </mesh>

          {/* Translucent floor disc */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.74, 32]} />
            <meshBasicMaterial color="#00ffcc" transparent opacity={0.16} />
          </mesh>

          {/* Directional Arrow / Chevron pointing forward */}
          <group position={[0, 0.01, 0.88]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <coneGeometry args={[0.18, 0.32, 3]} />
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

      {/* ─── Realistic 3D Player Body Hierarchy ─── */}
      <group ref={bodyRef}>
        {/* Head & Facial Profile */}
        <group position={[0, 1.68, 0]}>
          {/* Head sphere */}
          <mesh castShadow>
            <sphereGeometry args={[0.13, 20, 20]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
          {/* Hair */}
          <mesh position={[0, 0.04, -0.02]}>
            <sphereGeometry args={[0.135, 16, 16]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          {/* Nose */}
          <mesh position={[0, -0.01, 0.13]}>
            <coneGeometry args={[0.025, 0.05, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
        </group>

        {/* Neck */}
        <mesh position={[0, 1.54, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.075, 0.12, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.5} />
        </mesh>

        {/* Torso & Athletic Chest with Procedural Jersey */}
        <group position={[0, 1.28, 0]}>
          {/* Chest & Upper Back */}
          <mesh castShadow>
            <boxGeometry args={[0.46, 0.42, 0.24]} />
            <meshStandardMaterial map={jerseyTexture} roughness={0.45} metalness={0.05} />
          </mesh>
          {/* Tapered Waist */}
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.4, 0.18, 0.21]} />
            <meshStandardMaterial map={jerseyTexture} roughness={0.45} />
          </mesh>
        </group>

        {/* Left Shoulder & Arm */}
        <group ref={leftArmRef} position={[-0.28, 1.44, 0]}>
          {/* Shoulder Cap */}
          <mesh castShadow>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color={kit.colors.primary} roughness={0.45} />
          </mesh>
          {/* Jersey Sleeve */}
          <mesh position={[0, -0.1, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.065, 0.18, 12]} />
            <meshStandardMaterial color={kit.colors.primary} roughness={0.45} />
          </mesh>
          {/* Forearm */}
          <mesh position={[0, -0.26, 0.02]} castShadow>
            <cylinderGeometry args={[0.055, 0.048, 0.2, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.38, 0.03]} castShadow>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
        </group>

        {/* Right Shoulder & Arm */}
        <group ref={rightArmRef} position={[0.28, 1.44, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color={kit.colors.primary} roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.1, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.065, 0.18, 12]} />
            <meshStandardMaterial color={kit.colors.primary} roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.26, 0.02]} castShadow>
            <cylinderGeometry args={[0.055, 0.048, 0.2, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.38, 0.03]} castShadow>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
        </group>

        {/* Shorts / Pelvis */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[0.42, 0.2, 0.23]} />
          <meshStandardMaterial color={kit.colors.shortsColor} roughness={0.5} />
        </mesh>
      </group>

      {/* ─── Left Leg (Hip -> Knee -> Ankle -> Cleat) ─── */}
      <group ref={leftLegRef} position={[-0.13, 0.86, 0]}>
        {/* Thigh */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.075, 0.3, 14]} />
          <meshStandardMaterial color={kit.colors.shortsColor} roughness={0.5} />
        </mesh>
        {/* Knee Joint */}
        <mesh position={[0, -0.31, 0]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color={skinColor} roughness={0.5} />
        </mesh>

        {/* Calf & Sock */}
        <group ref={leftCalfRef} position={[0, -0.31, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <cylinderGeometry args={[0.072, 0.058, 0.34, 14]} />
            <meshStandardMaterial color={kit.colors.socksColor} roughness={0.6} />
          </mesh>
          {/* Modern Football Boot */}
          <group position={[0, -0.37, 0.05]}>
            <mesh castShadow>
              <boxGeometry args={[0.09, 0.07, 0.24]} />
              <meshStandardMaterial color={bootColor} roughness={0.25} metalness={0.2} />
            </mesh>
            {/* Studs */}
            <mesh position={[0, -0.04, 0]}>
              <boxGeometry args={[0.07, 0.015, 0.2]} />
              <meshStandardMaterial color={studColor} roughness={0.4} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ─── Right Leg (Hip -> Knee -> Ankle -> Cleat) ─── */}
      <group ref={rightLegRef} position={[0.13, 0.86, 0]}>
        {/* Thigh */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.075, 0.3, 14]} />
          <meshStandardMaterial color={kit.colors.shortsColor} roughness={0.5} />
        </mesh>
        {/* Knee Joint */}
        <mesh position={[0, -0.31, 0]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color={skinColor} roughness={0.5} />
        </mesh>

        {/* Calf & Sock */}
        <group ref={rightCalfRef} position={[0, -0.31, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <cylinderGeometry args={[0.072, 0.058, 0.34, 14]} />
            <meshStandardMaterial color={kit.colors.socksColor} roughness={0.6} />
          </mesh>
          {/* Football Boot */}
          <group position={[0, -0.37, 0.05]}>
            <mesh castShadow>
              <boxGeometry args={[0.09, 0.07, 0.24]} />
              <meshStandardMaterial color={bootColor} roughness={0.25} metalness={0.2} />
            </mesh>
            <mesh position={[0, -0.04, 0]}>
              <boxGeometry args={[0.07, 0.015, 0.2]} />
              <meshStandardMaterial color={studColor} roughness={0.4} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Ground Contact Shadow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.45, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
