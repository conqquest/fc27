import type { SimPlayer, SimBall, Vec3, Tactics } from '../../data/types'
import { vec3, clamp } from '../../utils/math'

export class PlayerAI {
  public computeTargetPosition(
    player: SimPlayer,
    ball: SimBall,
    teammates: SimPlayer[],
    opponents: SimPlayer[],
    tactics: Tactics,
    formationAnchor: Vec3,
    isTeamPossession: boolean,
    isClosestToBall: boolean
  ): Vec3 {
    const isTeam0 = player.teamIndex === 0
    const forwardSign = isTeam0 ? 1 : -1
    const role = player.role

    // 1. If this player is closest to a loose ball, sprint to claim it
    if (isClosestToBall && !ball.possessionPlayerId) {
      return { x: ball.position.x, y: 0, z: ball.position.z }
    }

    // 2. If opponent has the ball
    if (!isTeamPossession) {
      // If closest player to ball holder -> active pressing
      if (isClosestToBall) {
        return { x: ball.position.x, y: 0, z: ball.position.z }
      }

      // Zonal defense / marking:
      // Drop back based on defensive line height (tactics: 1-10)
      const lineDrop = (10 - tactics.defensiveLineHeight) * 2.0 * -forwardSign
      const ballTrackingZ = (ball.position.z - formationAnchor.z) * 0.35

      const targetX = formationAnchor.x + (ball.position.x - formationAnchor.x) * 0.25
      const targetZ = formationAnchor.z + lineDrop + ballTrackingZ

      return {
        x: clamp(targetX, -32, 32),
        y: 0,
        z: clamp(targetZ, -50, 50),
      }
    }

    // 3. Team is in possession (Attacking phase)
    if (player.hasBall) {
      // Dribble towards opponent goal
      const opponentGoalZ = isTeam0 ? 52.5 : -52.5
      return {
        x: clamp(player.position.x * 0.85, -28, 28),
        y: 0,
        z: player.position.z + forwardSign * 8.0,
      }
    }

    // Off-ball support and attacking runs:
    const attackingWidthScale = 0.8 + (tactics.attackingWidth / 10) * 0.4
    const pushUp = forwardSign * (10 + (tactics.buildUpSpeed / 10) * 8)

    let targetX = formationAnchor.x * attackingWidthScale
    let targetZ = formationAnchor.z + pushUp

    if (role === 'attacker') {
      // Strikers / wingers make runs behind defensive line
      targetZ += forwardSign * 12.0
      targetX += (ball.position.x - player.position.x) * 0.15
    } else if (role === 'midfielder') {
      // Support triangle around ball
      const toBall = vec3.sub(ball.position, player.position)
      if (vec3.length(toBall) > 22.0) {
        targetZ = formationAnchor.z + (ball.position.z - formationAnchor.z) * 0.45
      }
    }

    return {
      x: clamp(targetX, -32, 32),
      y: 0,
      z: clamp(targetZ, -50, 50),
    }
  }

  public shouldSprint(
    player: SimPlayer,
    targetPos: Vec3,
    ball: SimBall
  ): boolean {
    if (player.stamina < 15) return false
    const distToTarget = vec3.distance(player.position, targetPos)
    const distToBall = vec3.distance(player.position, ball.position)

    // Sprint when chasing ball or making through-runs
    return distToBall < 8.0 || distToTarget > 12.0
  }

  public shouldAttemptTackle(
    player: SimPlayer,
    ballHolder: SimPlayer | null,
    ball: SimBall
  ): boolean {
    if (!ballHolder || ballHolder.teamIndex === player.teamIndex) return false
    const distToBall = vec3.distance(player.position, ball.position)
    return distToBall <= 1.2
  }
}
