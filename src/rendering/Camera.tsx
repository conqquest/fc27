import React, { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Vec3 } from '../data/types'
import type { CameraConfig } from '../hooks/useCamera'

interface CameraProps {
  ballPosition: Vec3
  config: CameraConfig
}

export const Camera: React.FC<CameraProps> = ({ ballPosition, config }) => {
  const { camera } = useThree()
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0))

  useFrame((_, delta) => {
    const factor = Math.min(1.0, delta * 3.5)

    // Smoothly interpolate the look-at point towards ball
    targetLookAt.current.x += (ballPosition.x - targetLookAt.current.x) * factor
    targetLookAt.current.z += (ballPosition.z - targetLookAt.current.z) * factor
    targetLookAt.current.y = 0

    let desiredPos: THREE.Vector3

    if (config.mode === 'tactical') {
      desiredPos = new THREE.Vector3(0, config.height || 60, 0)
    } else if (config.mode === 'end-to-end') {
      desiredPos = new THREE.Vector3(
        targetLookAt.current.x * 0.4,
        config.height || 18,
        targetLookAt.current.z - 45
      )
    } else {
      // Default: Broadcast sideline camera
      // Camera is placed along the sideline (+X or -X), looking across the pitch
      const camX = targetLookAt.current.x * 0.35 + config.distance
      const camY = config.height
      const camZ = targetLookAt.current.z * 0.75

      desiredPos = new THREE.Vector3(camX, camY, camZ)
    }

    camera.position.lerp(desiredPos, factor)
    camera.lookAt(targetLookAt.current)
  })

  return null
}
