import type { SimBall, SimPlayer, Vec3 } from '../../data/types'
import { vec3, clamp } from '../../utils/math'

export interface GKDecision {
  targetPos: Vec3
  shouldDive: boolean
  diveDirection?: Vec3
  isRushingOut: boolean
  aiDistributionKick?: { velocity: Vec3; loft?: number }
}

export class GoalkeeperAI {
  public readonly GOAL_LINE_Z = 52.5
  public readonly GOAL_WIDTH_HALF = 3.66
  public readonly MAX_FORWARD_DIST = 7.0

  public update(
    keeper: SimPlayer,
    ball: SimBall,
    dt: number,
    teammates: SimPlayer[] = []
  ): GKDecision {
    const isTeam0 = keeper.teamIndex === 0
    const ownGoalZ = isTeam0 ? -this.GOAL_LINE_Z : this.GOAL_LINE_Z
    const forwardSign = isTeam0 ? 1 : -1

    // If keeper has ball possession, distribute to open teammate
    if (keeper.hasBall) {
      const openTeammates = teammates.filter(
        (t) => t.isOnPitch && t.id !== keeper.id && t.role !== 'goalkeeper'
      )
      if (openTeammates.length > 0) {
        // Prefer short pass to nearby full-back or centre-back
        const shortOptions = openTeammates.filter(
          (t) => Math.abs(t.position.z - ownGoalZ) < 30.0
        )
        const target = shortOptions[0] || openTeammates[0]
        const toTarget = vec3.normalize(vec3.sub(target.position, keeper.position))
        const passVel = { x: toTarget.x * 12, y: 0.1, z: toTarget.z * 12 }

        return {
          targetPos: keeper.position,
          shouldDive: false,
          isRushingOut: false,
          aiDistributionKick: { velocity: passVel, loft: 0.05 },
        }
      }
    }

    const distToBall = vec3.distance(keeper.position, ball.position)
    const ballSpeed = vec3.length(ball.velocity)

    // Check if shot is incoming toward this keeper's goal
    const isIncomingShot =
      ballSpeed > 9.0 &&
      (isTeam0 ? ball.velocity.z < -4.0 : ball.velocity.z > 4.0)

    if (isIncomingShot) {
      // Calculate intersection on goal line
      const t = (ownGoalZ - ball.position.z) / (ball.velocity.z || 0.001)
      if (t > 0 && t < 1.4) {
        const interceptX = clamp(ball.position.x + ball.velocity.x * t, -this.GOAL_WIDTH_HALF, this.GOAL_WIDTH_HALF)
        const interceptY = clamp(ball.position.y + ball.velocity.y * t, 0.2, 2.44)

        const diveTarget: Vec3 = { x: interceptX, y: interceptY, z: ownGoalZ + forwardSign * 0.8 }
        const diveDir = vec3.normalize(vec3.sub(diveTarget, keeper.position))

        return {
          targetPos: diveTarget,
          shouldDive: true,
          diveDirection: diveDir,
          isRushingOut: false,
        }
      }
    }

    // Check if loose ball is in 18-yard penalty box -> rush out and sweep
    const inBoxDepth = isTeam0
      ? ball.position.z < -this.GOAL_LINE_Z + 15
      : ball.position.z > this.GOAL_LINE_Z - 15

    if (inBoxDepth && Math.abs(ball.position.x) < 18 && distToBall < 14 && !ball.possessionPlayerId) {
      return {
        targetPos: { x: ball.position.x, y: 0, z: ball.position.z },
        shouldDive: distToBall < 2.2,
        isRushingOut: true,
      }
    }

    // Default positioning: bisect angle between ball and goal posts
    // Move laterally across goal line arc
    const lateralShift = clamp(ball.position.x * 0.38, -2.6, 2.6)
    const forwardDepth = clamp(
      Math.abs(ball.position.z - ownGoalZ) * 0.09,
      1.2,
      this.MAX_FORWARD_DIST
    )

    const targetPos: Vec3 = {
      x: lateralShift,
      y: 0,
      z: ownGoalZ + forwardSign * forwardDepth,
    }

    return {
      targetPos,
      shouldDive: false,
      isRushingOut: false,
    }
  }

  public canSave(
    keeper: SimPlayer,
    ball: SimBall
  ): boolean {
    const dist = vec3.distance(keeper.position, ball.position)
    const reach = 1.9 + (keeper.playerData.attributes.gkReflexes - 70) * 0.025
    return dist <= reach
  }
}
