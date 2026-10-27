import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Vec3 } from '../data/types'

interface BallMeshProps {
  position: Vec3
  velocity: Vec3
}

export const BallMesh: React.FC<BallMeshProps> = ({ position, velocity }) => {
  const meshRef = useRef<THREE.Mesh>(null)

  // Procedural classic soccer ball texture
  const ballTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 512, 256)

      ctx.fillStyle = '#111827'
      // Draw pentagon patterns across the surface
      const spots = [
        [64, 64], [192, 64], [320, 64], [448, 64],
        [128, 192], [256, 192], [384, 192],
      ]
      for (const [x, y] of spots) {
        ctx.beginPath()
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
          const px = x + Math.cos(angle) * 26
          const py = y + Math.sin(angle) * 26
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
      }
    }
    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }, [])

  useFrame((_, delta) => {
    if (meshRef.current) {
      // Rotate ball along movement direction
      const speed = Math.hypot(velocity.x, velocity.z)
      if (speed > 0.1) {
        const rotAxis = new THREE.Vector3(velocity.z, 0, -velocity.x).normalize()
        const rotAngle = (speed / 0.11) * delta
        meshRef.current.rotateOnAxis(rotAxis, rotAngle)
      }
    }
  })

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* 3D Ball Sphere */}
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.11, 32, 32]} />
        <meshStandardMaterial
          map={ballTexture}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>

      {/* Dynamic Ground Shadow */}
      <mesh position={[0, -position.y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.max(0.04, 0.13 * (1 - position.y * 0.15)), 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={Math.max(0.1, 0.45 - position.y * 0.1)} />
      </mesh>
    </group>
  )
}
