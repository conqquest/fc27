import React, { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Vec3, SimPlayer } from '../data/types'
import type { CameraConfig } from '../hooks/useCamera'

interface CameraProps {
  ballPosition: Vec3
  player?: SimPlayer | null
  config: CameraConfig
}

export const Camera: React.FC<CameraProps> = ({ ballPosition, player, config }) => {
  const { camera } = useThree()
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0))

  useFrame((_, delta) => {
    const factor = Math.min(1.0, delta * 3.2)

    // Focus target is weighted between the ball and controlled player
    const focusX = player ? ballPosition.x * 0.7 + player.position.x * 0.3 : ballPosition.x
    const focusZ = player ? ballPosition.z * 0.7 + player.position.z * 0.3 : ballPosition.z

    targetLookAt.current.x += (focusX - targetLookAt.current.x) * factor
    targetLookAt.current.z += (focusZ - targetLookAt.current.z) * factor
    targetLookAt.current.y = 0

    let desiredPos: THREE.Vector3

    if (config.mode === 'tactical') {
      desiredPos = new THREE.Vector3(0, config.height || 60, 0)
    } else if (config.mode === 'end-to-end') {
      desiredPos = new THREE.Vector3(
        targetLookAt.current.x * 0.35,
        config.height || 20,
        targetLookAt.current.z - 48
      )
    } else {
      // Default: Broadcast sideline camera with open voxel world framing
      // Placed along sideline (+X), elevated to capture match and surrounding city backdrop
      const camX = targetLookAt.current.x * 0.32 + Math.max(26, config.distance)
      const camY = Math.max(16, config.height)
      const camZ = targetLookAt.current.z * 0.72

      desiredPos = new THREE.Vector3(camX, camY, camZ)
    }

    camera.position.lerp(desiredPos, factor)
    camera.lookAt(targetLookAt.current)
  })

  return null
}
