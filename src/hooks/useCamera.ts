import { useState, useCallback } from 'react'

export interface CameraConfig {
  mode: 'broadcast' | 'end-to-end' | 'tactical'
  distance: number
  height: number
  fov: number
  followBall: boolean
}

const DEFAULT_CONFIG: CameraConfig = {
  mode: 'broadcast',
  distance: 28,
  height: 15,
  fov: 38,
  followBall: true,
}

export function useCamera(initial?: Partial<CameraConfig>) {
  const [config, setConfig] = useState<CameraConfig>({
    ...DEFAULT_CONFIG,
    ...initial,
  })

  const setMode = useCallback((mode: CameraConfig['mode']) => {
    setConfig((prev) => {
      switch (mode) {
        case 'broadcast':
          return { ...prev, mode, distance: 28, height: 15, fov: 38 }
        case 'end-to-end':
          return { ...prev, mode, distance: 42, height: 14, fov: 45 }
        case 'tactical':
          return { ...prev, mode, distance: 8, height: 48, fov: 42 }
      }
    })
  }, [])

  const setHeight = useCallback((height: number) => {
    setConfig((prev) => ({ ...prev, height }))
  }, [])

  const setDistance = useCallback((distance: number) => {
    setConfig((prev) => ({ ...prev, distance }))
  }, [])

  const toggleFollowBall = useCallback(() => {
    setConfig((prev) => ({ ...prev, followBall: !prev.followBall }))
  }, [])

  return {
    config,
    setMode,
    setHeight,
    setDistance,
    toggleFollowBall,
  }
}
