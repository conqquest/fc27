import type { SimPlayer, Vec3 } from '../../data/types'
import { vec3, clamp } from '../../utils/math'

export class PassingSystem {
  public selectTarget(
    passer: SimPlayer,
    teammates: SimPlayer[],
    aimAngle: number,
    opponents: SimPlayer[]
  ): SimPlayer | null {
    const candidates = teammates.filter((p) => p.id !== passer.id && p.isOnPitch)
    if (candidates.length === 0) return null

    const aimDir = { x: Math.sin(aimAngle), y: 0, z: Math.cos(aimAngle) }
    let bestScore = -Infinity
    let bestTarget: SimPlayer | null = null

    for (const mate of candidates) {
      const toMate = vec3.sub(mate.position, passer.position)
      const dist = vec3.length(toMate)

      // Skip players too close (< 2m) or too far (> 45m)
      if (dist < 2.0 || dist > 48.0) continue

      const toMateDir = vec3.normalize(toMate)
      const angleDot = vec3.dot(aimDir, toMateDir) // -1 to +1

      // Don't pass backwards if aiming forward
      if (angleDot < 0.2) continue

      // Distance score: ideal range is 8m - 25m
      const distScore = 1.0 - Math.abs(dist - 16) / 32

      // Check passing lane clearance
      const laneClear = this.isLaneOpen(passer.position, mate.position, opponents, 1.8)
      const laneScore = laneClear ? 1.0 : 0.25

      // Forward progression bonus
      const isTeam0 = passer.teamIndex === 0
      const forwardProgress = isTeam0
        ? (mate.position.z - passer.position.z) / 20
        : (passer.position.z - mate.position.z) / 20

      const totalScore = angleDot * 0.5 + distScore * 0.25 + laneScore * 0.25 + forwardProgress * 0.15

      if (totalScore > bestScore) {
        bestScore = totalScore
        bestTarget = mate
      }
    }

    // Fallback: pick closest in general aim direction
    if (!bestTarget) {
      let minDist = Infinity
      for (const mate of candidates) {
        const toMate = vec3.sub(mate.position, passer.position)
        const dist = vec3.length(toMate)
        const toMateDir = vec3.normalize(toMate)
        if (vec3.dot(aimDir, toMateDir) > 0 && dist < minDist) {
          minDist = dist
          bestTarget = mate
        }
      }
    }

    return bestTarget || candidates[0]
  }

  public computeGroundPass(
    from: Vec3,
    to: Vec3,
    powerFactor: number = 1.0,
    shortPassingAttr: number = 80
  ): Vec3 {
    const delta = vec3.sub(to, from)
    const dist = vec3.length(delta)
    const dir = vec3.normalize(delta)

    // Accurate speed based on distance and player attribute
    const attrBonus = (shortPassingAttr - 70) / 100
    const idealSpeed = Math.min(26.0, Math.max(9.0, Math.sqrt(dist * 13.5))) * (1 + attrBonus * 0.15) * powerFactor

    return {
      x: dir.x * idealSpeed,
      y: 0.1,
      z: dir.z * idealSpeed,
    }
  }

  public computeThroughBall(
    from: Vec3,
    receiver: SimPlayer,
    visionAttr: number = 80
  ): Vec3 {
    const isTeam0 = receiver.teamIndex === 0
    const forwardDir = isTeam0 ? 1 : -1

    // Lead receiver into space forward
    const leadDistance = clamp(6.0 + (visionAttr - 75) * 0.08, 4.0, 12.0)
    const leadTarget: Vec3 = {
      x: receiver.position.x + receiver.velocity.x * 0.6,
      y: 0.11,
      z: receiver.position.z + forwardDir * leadDistance,
    }

    const delta = vec3.sub(leadTarget, from)
    const dist = vec3.length(delta)
    const dir = vec3.normalize(delta)
    const speed = Math.min(28.0, Math.max(12.0, Math.sqrt(dist * 15.0)))

    return {
      x: dir.x * speed,
      y: 0.15,
      z: dir.z * speed,
    }
  }

  public computeLoftedPass(
    from: Vec3,
    to: Vec3,
    crossingAttr: number = 80
  ): { velocity: Vec3; loft: number } {
    const delta = vec3.sub(to, from)
    const dist = vec3.length(delta)
    const dir = vec3.normalize(delta)

    const speed = Math.min(30.0, Math.max(14.0, Math.sqrt(dist * 18.0)))
    const loft = clamp(0.35 + (dist / 60) * 0.35, 0.3, 0.7)

    return {
      velocity: {
        x: dir.x * speed,
        y: speed * Math.sin(loft * 0.8),
        z: dir.z * speed,
      },
      loft,
    }
  }

  public isLaneOpen(
    from: Vec3,
    to: Vec3,
    opponents: SimPlayer[],
    clearanceRadius: number = 1.8
  ): boolean {
    const segment = vec3.sub(to, from)
    const segLen = vec3.length(segment)
    if (segLen < 0.1) return true
    const segDir = vec3.normalize(segment)

    for (const opp of opponents) {
      if (!opp.isOnPitch) continue
      const toOpp = vec3.sub(opp.position, from)
      const proj = vec3.dot(toOpp, segDir)

      if (proj > 0.5 && proj < segLen - 0.5) {
        const perpDist = Math.sqrt(Math.max(0, vec3.lengthSq(toOpp) - proj * proj))
        if (perpDist < clearanceRadius) {
          return false
        }
      }
    }
    return true
  }
}
