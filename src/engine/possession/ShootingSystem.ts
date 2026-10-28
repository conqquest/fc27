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
    isFirstTime: boolean = false,
    aimAngle?: number
  ): ShotResult {
    const toGoal = vec3.sub(targetGoalCenter, shooter.position)
    const distToGoal = vec3.length(toGoal)

    // Base shot speed from power input and shotPower attribute
    const powerNorm = clamp(powerInput, 10, 100) / 100
    const powerAttrMod = (attributes.shotPower - 70) / 100
    const shotSpeed = (18.0 + powerNorm * 18.0) * (1 + powerAttrMod * 0.2) // 18 - 38 m/s

    // Calculate desired target point on the goal face
    // Finishing attribute affects error deviation
    const finishingMod = (100 - attributes.finishing) / 100
    const distanceError = Math.max(0, (distToGoal - 18) * 0.04)
    const firstTimeError = isFirstTime ? 0.2 : 0

    const totalErrorScale = (finishingMod * 1.3 + distanceError + firstTimeError) * (0.7 + powerNorm * 0.5)

    // Lateral aim: user aim angle steer if provided
    let aimSide = Math.random() > 0.5 ? 1 : -1
    let userAimX = 0
    if (aimAngle !== undefined) {
      // Camera view: X is lateral on pitch (-34 to +34)
      const aimSin = Math.sin(aimAngle)
      if (Math.abs(aimSin) > 0.15) {
        aimSide = aimSin > 0 ? 1 : -1
        userAimX = aimSide * clamp(Math.abs(aimSin) * 2.8, 1.2, 3.2)
      }
    }

    const targetX = (userAimX !== 0 ? userAimX : aimSide * randomRange(1.2, 3.1)) +
      (Math.random() - 0.5) * totalErrorScale * 1.8

    // Height based on power: low driven (<55), placed (55-82), high rocket (>82)
    let desiredHeight = 1.0
    if (powerInput < 52) {
      desiredHeight = randomRange(0.2, 0.6) // low driven shot
    } else if (powerInput <= 82) {
      desiredHeight = randomRange(0.8, 1.8) // mid-height placed shot
    } else {
      desiredHeight = randomRange(1.8, 2.3) // top corner rocket
      if (powerInput > 94 && Math.random() < finishingMod * 0.6) {
        desiredHeight += randomRange(0.3, 0.9) // over-hit over crossbar
      }
    }

    const targetY = clamp(desiredHeight + (Math.random() - 0.5) * totalErrorScale * 0.8, 0.12, 3.8)

    const finalTargetPos: Vec3 = {
      x: clamp(targetX, -4.5, 4.5),
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
        y: Math.max(0.5, shotDir.y * shotSpeed),
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
