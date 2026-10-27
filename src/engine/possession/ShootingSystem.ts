import type { SimPlayer, PlayerAttributes, Vec3 } from '../../data/types'
import { vec3, clamp, randomRange } from '../../utils/math'

export interface ShotResult {
  velocity: Vec3
  onTarget: boolean
  power: number
  spin: number
}

export class ShootingSystem {
  public computeShot(
    shooter: SimPlayer,
    targetGoalCenter: Vec3, // (0, 1.2, +/-52.5)
    powerInput: number, // 0-100
    attributes: PlayerAttributes,
    isFirstTime: boolean = false
  ): ShotResult {
    const toGoal = vec3.sub(targetGoalCenter, shooter.position)
    const distToGoal = vec3.length(toGoal)

    // Base shot speed from power input and shotPower attribute
    const powerNorm = clamp(powerInput, 10, 100) / 100
    const powerAttrMod = (attributes.shotPower - 70) / 100
    const shotSpeed = (20.0 + powerNorm * 16.0) * (1 + powerAttrMod * 0.2) // 20 - 38 m/s

    // Calculate desired target point on the goal face
    // Finishing attribute affects error deviation
    const finishingMod = (100 - attributes.finishing) / 100 // 0.1 for 90 finishing, 0.4 for 60 finishing
    const distanceError = Math.max(0, (distToGoal - 18) * 0.05)
    const firstTimeError = isFirstTime ? 0.2 : 0

    const totalErrorScale = (finishingMod * 1.5 + distanceError + firstTimeError) * (0.8 + powerNorm * 0.4)

    // Add lateral and vertical variation
    // Goal width is 7.32m (x: -3.66 to +3.66), height is 2.44m (y: 0 to 2.44)
    // Aim towards side netting or corners
    const aimSide = Math.random() > 0.5 ? 1 : -1
    const targetX = aimSide * randomRange(1.0, 3.2) + (Math.random() - 0.5) * totalErrorScale * 2.5
    const targetY = clamp(randomRange(0.4, 2.2) + (Math.random() - 0.5) * totalErrorScale * 1.5, 0.15, 4.0)

    const finalTargetPos: Vec3 = {
      x: targetX,
      y: targetY,
      z: targetGoalCenter.z,
    }

    const shotDir = vec3.normalize(vec3.sub(finalTargetPos, shooter.position))
    const onTarget = Math.abs(targetX) <= 3.66 && targetY <= 2.44 && targetY >= 0.1

    // Spin / curl based on angle
    const lateralAngle = Math.atan2(shotDir.x, Math.abs(shotDir.z))
    const spin = lateralAngle * (attributes.vision > 80 ? 3.0 : 1.5)

    return {
      velocity: {
        x: shotDir.x * shotSpeed,
        y: Math.max(1.5, shotDir.y * shotSpeed),
        z: shotDir.z * shotSpeed,
      },
      onTarget,
      power: powerInput,
      spin,
    }
  }

  public computePenalty(
    shooter: SimPlayer,
    targetCorner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
    attributes: PlayerAttributes,
    goalZ: number
  ): ShotResult {
    let targetX = 0
    let targetY = 1.0

    switch (targetCorner) {
      case 'topLeft':
        targetX = -2.8
        targetY = 2.1
        break
      case 'topRight':
        targetX = 2.8
        targetY = 2.1
        break
      case 'bottomLeft':
        targetX = -2.9
        targetY = 0.3
        break
      case 'bottomRight':
        targetX = 2.9
        targetY = 0.3
        break
    }

    // Finishing reduces error
    const err = ((100 - attributes.finishing) / 100) * 0.4
    targetX += (Math.random() - 0.5) * err
    targetY += (Math.random() - 0.5) * err

    const targetPos: Vec3 = { x: targetX, y: targetY, z: goalZ }
    const dir = vec3.normalize(vec3.sub(targetPos, shooter.position))
    const speed = 28.0

    return {
      velocity: vec3.scale(dir, speed),
      onTarget: Math.abs(targetX) <= 3.66 && targetY <= 2.44 && targetY >= 0,
      power: 85,
      spin: 0,
    }
  }
}
