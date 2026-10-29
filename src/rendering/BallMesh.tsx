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

  // Voxel / Pixelated classic black-and-white soccer ball texture
  const ballTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.imageSmoothingEnabled = false
      // Pure white leather base
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 128, 64)

      // Black voxel pentagons
      ctx.fillStyle = '#111827'
      const spots = [
        [16, 16], [48, 16], [80, 16], [112, 16],
        [32, 48], [64, 48], [96, 48],
      ]
      for (const [x, y] of spots) {
        ctx.fillRect(x - 6, y - 6, 12, 12)
        // Stepped pixel corners to resemble pentagons
        ctx.fillRect(x - 4, y - 8, 8, 2)
        ctx.fillRect(x - 4, y + 6, 8, 2)
        ctx.fillRect(x - 8, y - 4, 2, 8)
        ctx.fillRect(x + 6, y - 4, 2, 8)
      }

      // Seam stitch lines
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      for (let i = 0; i < 128; i += 16) {
        ctx.fillRect(i, 0, 1, 64)
      }
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    return texture
  }, [])

  useFrame((_, delta) => {
    if (meshRef.current) {
      // Rotate ball along movement direction
      const speed = Math.hypot(velocity.x, velocity.z)
      if (speed > 0.08) {
        const rotAxis = new THREE.Vector3(velocity.z, 0, -velocity.x).normalize()
        const rotAngle = (speed / 0.11) * delta
        meshRef.current.rotateOnAxis(rotAxis, rotAngle)
      }
    }
  })

  const heightAboveGrass = Math.max(0, position.y - 0.11)
  const shadowScale = Math.max(0.04, 0.13 * (1 - heightAboveGrass * 0.25))
  const shadowOpacity = Math.max(0.08, 0.5 - heightAboveGrass * 0.18)

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* 3D Ball Sphere with Voxel Texture */}
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.11, 24, 24]} />
        <meshStandardMaterial
          map={ballTexture}
          roughness={0.4}
          metalness={0.05}
        />
      </mesh>

      {/* Dynamic Voxel Octagonal Ground Shadow */}
      <mesh position={[0, -position.y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[shadowScale, 8]} />
        <meshBasicMaterial color="#000000" transparent opacity={shadowOpacity} />
      </mesh>
    </group>
  )
}
