import type { SimBall, SimPlayer, Vec3 } from '../../data/types'
import { clamp } from '../../utils/math'
import { OffsideEngine } from './OffsideEngine'
import { FoulDetection, type FoulResult } from './FoulDetection'
import { DisciplinarySystem, type CardResult } from './DisciplinarySystem'
import { RestartManager } from './RestartManager'

export interface RefereeDecision {
  type: 'foul' | 'offside' | 'goal_kick' | 'corner' | 'throw_in' | 'penalty' | 'free_kick' | 'dropped_ball' | null
  teamIndex: 0 | 1 | null
  position: Vec3 | null
  card?: 'yellow' | 'red'
  isIndirect?: boolean
  message?: string
  offendingPlayerId?: string
  victimPlayerId?: string
}

export class Referee {
  public readonly PITCH_WIDTH = 68
  public readonly PITCH_LENGTH = 105
  public readonly HALF_WIDTH = 34
  public readonly HALF_LENGTH = 52.5
  public readonly PENALTY_BOX_Z = 16.5
  public readonly PENALTY_BOX_X = 20.16

  public offsideEngine = new OffsideEngine()
  public foulDetection = new FoulDetection()
  public disciplinarySystem = new DisciplinarySystem()
  public restartManager = new RestartManager()

  // Match event lock to avoid multiple calls across physics frames
  private lastEventLockId: string | null = null
  private eventLockTimestamp: number = 0
  private readonly EVENT_LOCK_COOLDOWN_MS = 1500

  /**
   * Check boundary out-of-bounds:
   * Law 9: The ball is out of play when it has wholly passed over the goal line or touchline on the ground or in the air.
   */
  public checkBallOut(
    ball: SimBall,
    _prevPos: Vec3,
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
        isIndirect: true,
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
            isIndirect: false,
            message: 'Corner kick for Away',
          }
        } else {
          // Away touched last -> Goal Kick for Home
          return {
            type: 'goal_kick',
            teamIndex: 0,
            position: { x: 0, y: 0.11, z: -this.HALF_LENGTH + 5.5 },
            isIndirect: false,
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
            isIndirect: false,
            message: 'Corner kick for Home',
          }
        } else {
          // Home touched last -> Goal Kick for Away
          return {
            type: 'goal_kick',
            teamIndex: 1,
            position: { x: 0, y: 0.11, z: this.HALF_LENGTH - 5.5 },
            isIndirect: false,
            message: 'Goal kick for Away',
          }
        }
      }
    }

    return { type: null, teamIndex: null, position: null }
  }

  /**
   * Backward-compatible checkOffside method, also delegating to OffsideEngine
   */
  public checkOffside(
    passer: SimPlayer,
    target: SimPlayer,
    defenders: SimPlayer[],
    teamIndex: 0 | 1
  ): boolean {
    if (teamIndex === 0 && target.position.z <= 0) return false
    if (teamIndex === 1 && target.position.z >= 0) return false

    const secondLastZ = this.offsideEngine.getSecondLastDefenderZ(defenders, teamIndex)

    if (teamIndex === 0) {
      return target.position.z > secondLastZ && target.position.z > passer.position.z
    } else {
      return target.position.z < secondLastZ && target.position.z < passer.position.z
    }
  }

  /**
   * Evaluates tackle and returns a RefereeDecision with IFAB severity classification.
   */
  public checkTackle(
    tackler: SimPlayer,
    victim: SimPlayer,
    distToBall: number,
    isSlideTackle: boolean = false
  ): RefereeDecision {
    const foul = this.foulDetection.evaluateTackle(
      tackler,
      victim,
      tackler.position,
      isSlideTackle
    )

    // Fallback for distance to ball parameter passed directly in existing code
    if (distToBall < 0.6) {
      return { type: null, teamIndex: null, position: null }
    }

    if (!foul.isFoul) {
      const distToVictim = Math.hypot(
        tackler.position.x - victim.position.x,
        tackler.position.z - victim.position.z
      )
      if (distToVictim >= 0.65) {
        return { type: null, teamIndex: null, position: null }
      }
    }

    const awardedTeam: 0 | 1 = tackler.teamIndex === 0 ? 1 : 0
    const isInsideBox = this.foulDetection.isInsidePenaltyBox(victim.position, tackler.teamIndex)

    return {
      type: isInsideBox ? 'penalty' : 'free_kick',
      teamIndex: awardedTeam,
      position: isInsideBox
        ? { x: 0, y: 0.11, z: awardedTeam === 0 ? this.HALF_LENGTH - 11 : -this.HALF_LENGTH + 11 }
        : { ...victim.position, y: 0.11 },
      card: foul.card,
      isIndirect: false,
      offendingPlayerId: tackler.id,
      victimPlayerId: victim.id,
      message: isInsideBox
        ? 'Penalty awarded!'
        : foul.card === 'red'
        ? 'Red card & Free kick'
        : foul.card === 'yellow'
        ? 'Yellow card & Free kick'
        : 'Foul & Free kick',
    }
  }

  /**
   * Issues disciplinary card to player.
   */
  public issueCard(
    player: SimPlayer,
    card: 'yellow' | 'red',
    reason: string,
    minute: number
  ): CardResult {
    return this.disciplinarySystem.issueCard(player, card, reason, minute)
  }

  /**
   * Event locking helper to prevent multi-frame duplicate trigger.
   */
  public acquireEventLock(eventId: string, nowMs: number): boolean {
    if (this.lastEventLockId === eventId && nowMs - this.eventLockTimestamp < this.EVENT_LOCK_COOLDOWN_MS) {
      return false
    }
    this.lastEventLockId = eventId
    this.eventLockTimestamp = nowMs
    return true
  }

  public reset(): void {
    this.offsideEngine.clearSnapshot()
    this.foulDetection.clearAdvantage()
    this.disciplinarySystem.reset()
    this.restartManager.reset()
    this.lastEventLockId = null
    this.eventLockTimestamp = 0
  }
}
