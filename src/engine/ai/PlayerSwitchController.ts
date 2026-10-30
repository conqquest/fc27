import type { SimPlayer, SimBall, Vec3 } from '../../data/types'
import { vec3 } from '../../utils/math'

export class PlayerSwitchController {
  private lastSwitchTimestamp: number = 0
  private recentSwitches: string[] = [] // Keeps track of recently controlled players to allow clean cycling

  /**
   * Intelligently selects the best defender to switch to when S is pressed.
   * Prioritizes the nearest suitable defender, with tactical weighting for goal-side positioning
   * and pass lane interception, while ensuring pressing S again cycles to another player.
   */
  public selectBestDefender(
    teamPlayers: SimPlayer[],
    ball: SimBall,
    currentControlledId: string | null,
    defendingGoalZ: number = -52.5
  ): SimPlayer | null {
    // 1. Identify eligible players: on-pitch, not red-carded, not goalkeeper
    const eligible = teamPlayers.filter(
      (p) => p.isOnPitch && !p.isRedCarded && p.role !== 'goalkeeper'
    )

    if (eligible.length === 0) {
      // Fallback to any outfield or goalkeeper on pitch
      return teamPlayers.find((p) => p.isOnPitch && !p.isRedCarded) || null
    }

    if (eligible.length === 1) {
      return eligible[0]
    }

    const ballPos = ball.position
    const ballVel = ball.velocity
    const ballSpeed = vec3.length(ballVel)

    // Projected ball position in 0.4s if moving with speed
    const projectedBallPos: Vec3 = ballSpeed > 2.0
      ? {
          x: ballPos.x + ballVel.x * 0.4,
          y: ballPos.y,
          z: ballPos.z + ballVel.z * 0.4,
        }
      : ballPos

    // 2. Score each eligible candidate
    const scoredPlayers = eligible.map((player) => {
      const distToBall = vec3.distance(player.position, ballPos)
      const distToProjected = vec3.distance(player.position, projectedBallPos)

      // Base physical distance
      let score = distToBall * 0.65 + distToProjected * 0.35

      // Tactical factor 1: Goal-side positioning bonus
      // Reward defenders who are between the ball and their own defending goal
      const isGoalSide = defendingGoalZ < 0
        ? player.position.z <= ballPos.z + 1.0 // Home goal at negative Z
        : player.position.z >= ballPos.z - 1.0 // Away goal at positive Z

      if (isGoalSide) {
        score -= 2.8 // Effectively makes them appear 2.8m closer
      }

      // Tactical factor 2: Centre-back protection in final third
      if (player.role === 'defender' && Math.abs(player.position.x) < 18) {
        score -= 1.2
      }

      // Tactical factor 3: Penalty for the currently controlled player
      // When S is pressed, the user explicitly wants to switch away to another player!
      if (player.id === currentControlledId) {
        score += 18.0
      }

      // Slight penalty for recently switched player to allow multi-player cycling
      const recentIndex = this.recentSwitches.indexOf(player.id)
      if (recentIndex !== -1 && player.id !== currentControlledId) {
        score += (recentIndex + 1) * 2.0
      }

      return { player, score }
    })

    // 3. Sort ascending: lowest score is the most suitable defender
    scoredPlayers.sort((a, b) => a.score - b.score)
    const best = scoredPlayers[0].player

    // Update recent switch history (keep last 3)
    this.recentSwitches = [best.id, ...this.recentSwitches.filter((id) => id !== best.id)].slice(0, 3)
    this.lastSwitchTimestamp = Date.now()

    return best
  }

  public reset(): void {
    this.lastSwitchTimestamp = 0
    this.recentSwitches = []
  }
}
