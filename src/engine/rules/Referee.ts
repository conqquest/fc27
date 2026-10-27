import type { SimBall, SimPlayer, Vec3 } from '../../data/types'
import { clamp } from '../../utils/math'

export interface RefereeDecision {
  type: 'foul' | 'offside' | 'goal_kick' | 'corner' | 'throw_in' | 'penalty' | 'free_kick' | null
  teamIndex: 0 | 1 | null
  position: Vec3 | null
  card?: 'yellow' | 'red'
  message?: string
}

export class Referee {
  public readonly PITCH_WIDTH = 68
  public readonly PITCH_LENGTH = 105
  public readonly HALF_WIDTH = 34
  public readonly HALF_LENGTH = 52.5
  public readonly PENALTY_BOX_Z = 16.5
  public readonly PENALTY_BOX_X = 20.16

  public checkBallOut(
    ball: SimBall,
    prevPos: Vec3,
    lastTouchedTeam: 0 | 1 | null
  ): RefereeDecision {
    const { x, z } = ball.position
    const lastTeam = lastTouchedTeam ?? 0
    const opponentTeam: 0 | 1 = lastTeam === 0 ? 1 : 0

    // Touchline out (throw-in)
    if (Math.abs(x) > this.HALF_WIDTH) {
      const clampZ = clamp(z, -this.HALF_LENGTH + 2, this.HALF_LENGTH - 2)
      return {
        type: 'throw_in',
        teamIndex: opponentTeam,
        position: { x: x > 0 ? this.HALF_WIDTH : -this.HALF_WIDTH, y: 0.11, z: clampZ },
        message: `Throw-in for ${opponentTeam === 0 ? 'Home' : 'Away'}`,
      }
    }

    // Goal line out (Corner or Goal Kick)
    if (Math.abs(z) > this.HALF_LENGTH) {
      // Over Home goal line (z < -52.5)
      if (z < -this.HALF_LENGTH) {
        if (lastTeam === 0) {
          // Home touched last -> Corner for Away
          return {
            type: 'corner',
            teamIndex: 1,
            position: { x: x > 0 ? this.HALF_WIDTH - 0.5 : -this.HALF_WIDTH + 0.5, y: 0.11, z: -this.HALF_LENGTH + 0.5 },
            message: 'Corner kick for Away',
          }
        } else {
          // Away touched last -> Goal Kick for Home
          return {
            type: 'goal_kick',
            teamIndex: 0,
            position: { x: 0, y: 0.11, z: -this.HALF_LENGTH + 5.5 },
            message: 'Goal kick for Home',
          }
        }
      }

      // Over Away goal line (z > 52.5)
      if (z > this.HALF_LENGTH) {
        if (lastTeam === 1) {
          // Away touched last -> Corner for Home
          return {
            type: 'corner',
            teamIndex: 0,
            position: { x: x > 0 ? this.HALF_WIDTH - 0.5 : -this.HALF_WIDTH + 0.5, y: 0.11, z: this.HALF_LENGTH - 0.5 },
            message: 'Corner kick for Home',
          }
        } else {
          // Home touched last -> Goal Kick for Away
          return {
            type: 'goal_kick',
            teamIndex: 1,
            position: { x: 0, y: 0.11, z: this.HALF_LENGTH - 5.5 },
            message: 'Goal kick for Away',
          }
        }
      }
    }

    return { type: null, teamIndex: null, position: null }
  }

  public checkOffside(
    passer: SimPlayer,
    target: SimPlayer,
    defenders: SimPlayer[],
    teamIndex: 0 | 1
  ): boolean {
    // Cannot be offside in own half
    if (teamIndex === 0 && target.position.z <= 0) return false
    if (teamIndex === 1 && target.position.z >= 0) return false

    // Sort defenders by depth towards their own goal
    const sorted = [...defenders].sort((a, b) => {
      return teamIndex === 0
        ? b.position.z - a.position.z // defending Away team (positive Z is back)
        : a.position.z - b.position.z // defending Home team (negative Z is back)
    })

    // Second-last defender (usually last outfield player before GK)
    const secondLast = sorted[1] || sorted[0]
    if (!secondLast) return false

    if (teamIndex === 0) {
      return target.position.z > secondLast.position.z && target.position.z > passer.position.z
    } else {
      return target.position.z < secondLast.position.z && target.position.z < passer.position.z
    }
  }

  public checkTackle(
    tackler: SimPlayer,
    victim: SimPlayer,
    distToBall: number
  ): RefereeDecision {
    // If tackler is close to ball, clean tackle
    if (distToBall < 0.6) {
      return { type: null, teamIndex: null, position: null }
    }

    const distToVictim = Math.hypot(
      tackler.position.x - victim.position.x,
      tackler.position.z - victim.position.z
    )

    // Foul if collision without touching ball
    if (distToVictim < 0.65) {
      const awardedTeam: 0 | 1 = tackler.teamIndex === 0 ? 1 : 0
      const isInsideBox =
        Math.abs(victim.position.x) <= this.PENALTY_BOX_X &&
        ((awardedTeam === 0 && victim.position.z > this.HALF_LENGTH - this.PENALTY_BOX_Z) ||
         (awardedTeam === 1 && victim.position.z < -this.HALF_LENGTH + this.PENALTY_BOX_Z))

      const isSevere = Math.random() < 0.25

      return {
        type: isInsideBox ? 'penalty' : 'free_kick',
        teamIndex: awardedTeam,
        position: isInsideBox
          ? { x: 0, y: 0.11, z: awardedTeam === 0 ? this.HALF_LENGTH - 11 : -this.HALF_LENGTH + 11 }
          : { ...victim.position, y: 0.11 },
        card: isSevere ? 'yellow' : undefined,
        message: isInsideBox ? 'Penalty awarded!' : isSevere ? 'Yellow card & Free kick' : 'Foul & Free kick',
      }
    }

    return { type: null, teamIndex: null, position: null }
  }
}
