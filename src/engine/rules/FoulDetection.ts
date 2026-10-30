import type { SimPlayer, Vec3, AdvantageState } from '../../data/types'
import { vec3, clamp } from '../../utils/math'

export type FoulSeverity = 'careless' | 'reckless' | 'excessive_force'

export interface FoulResult {
  isFoul: boolean
  offender?: SimPlayer
  victim?: SimPlayer
  severity?: FoulSeverity
  card?: 'yellow' | 'red'
  isPenalty: boolean
  isIndirect: boolean
  offencePosition: Vec3
  reason: string
  canPlayAdvantage: boolean
}

export class FoulDetection {
  public readonly PITCH_WIDTH = 68
  public readonly PITCH_LENGTH = 105
  public readonly HALF_WIDTH = 34
  public readonly HALF_LENGTH = 52.5
  public readonly PENALTY_BOX_Z = 16.5
  public readonly PENALTY_BOX_X = 20.16

  private activeAdvantage: AdvantageState | null = null

  public isInsidePenaltyBox(pos: Vec3, defendingTeam: 0 | 1): boolean {
    const isXInBox = Math.abs(pos.x) <= this.PENALTY_BOX_X
    if (!isXInBox) return false

    if (defendingTeam === 0) {
      // Home defending goal at z = -52.5
      return pos.z <= -this.HALF_LENGTH + this.PENALTY_BOX_Z && pos.z >= -this.HALF_LENGTH - 1
    } else {
      // Away defending goal at z = +52.5
      return pos.z >= this.HALF_LENGTH - this.PENALTY_BOX_Z && pos.z <= this.HALF_LENGTH + 1
    }
  }

  /**
   * Evaluates physical challenge / tackle between two players.
   * Considers distance to ball, approach angle, velocity, slide vs stand.
   */
  public evaluateTackle(
    tackler: SimPlayer,
    victim: SimPlayer,
    ballPos: Vec3,
    isSlideTackle: boolean = false
  ): FoulResult {
    const distToBall = vec3.distance(tackler.position, ballPos)
    const distToVictim = vec3.distance(tackler.position, victim.position)

    // Clean ball contact: close to ball and reached before/same time as victim
    if (distToBall < 0.65) {
      return { isFoul: false, isPenalty: false, isIndirect: false, offencePosition: tackler.position, reason: 'Clean challenge', canPlayAdvantage: false }
    }

    // Must be close enough to have committed a physical infraction
    if (distToVictim > 1.25) {
      return { isFoul: false, isPenalty: false, isIndirect: false, offencePosition: tackler.position, reason: 'No contact', canPlayAdvantage: false }
    }

    const defendingTeam: 0 | 1 = tackler.teamIndex
    const isPenalty = this.isInsidePenaltyBox(victim.position, defendingTeam)

    // Angle of approach: check if tackle was from behind
    // victim facing angle is victim.rotation
    const tacklerToVictim = vec3.sub(victim.position, tackler.position)
    const tacklerApproachAngle = Math.atan2(tacklerToVictim.x, tacklerToVictim.z)
    let angleDiff = Math.abs(tacklerApproachAngle - victim.rotation) % (Math.PI * 2)
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
    const isFromBehind = angleDiff < 0.6 // Directly behind victim

    const tacklerSpeed = vec3.length(tackler.velocity)
    const isHighSpeed = tacklerSpeed > 4.5

    // Classify severity according to IFAB Law 12
    let severity: FoulSeverity = 'careless'
    let card: 'yellow' | 'red' | undefined

    if (isFromBehind && isSlideTackle && isHighSpeed) {
      // Serious foul play: dangerous tackle from behind with excessive force
      severity = 'excessive_force'
      card = 'red'
    } else if (isSlideTackle || (isHighSpeed && distToBall > 1.4)) {
      // Reckless challenge: disregard to the danger or stopping promising attack
      severity = 'reckless'
      card = 'yellow'
    } else {
      severity = 'careless'
    }

    // Check Denial of an Obvious Goal-Scoring Opportunity (DOGSO)
    // If victim was through on goal and brought down
    const victimGoalZ = defendingTeam === 0 ? -52.5 : 52.5
    const distToGoal = Math.abs(victim.position.z - victimGoalZ)
    if (distToGoal < 28 && Math.abs(victim.position.x) < 18) {
      if (!isPenalty && severity !== 'careless') {
        // Outside box DOGSO is a direct red card
        severity = 'excessive_force'
        card = 'red'
      }
    }

    const offencePos: Vec3 = isPenalty
      ? { x: 0, y: 0.11, z: defendingTeam === 0 ? -this.HALF_LENGTH + 11 : this.HALF_LENGTH - 11 }
      : { ...victim.position, y: 0.11 }

    // Can advantage be played?
    // If victim's team has teammates with clear possession nearby
    const canPlayAdvantage = !isPenalty && severity !== 'excessive_force'

    return {
      isFoul: true,
      offender: tackler,
      victim,
      severity,
      card,
      isPenalty,
      isIndirect: false,
      offencePosition: offencePos,
      reason: isPenalty
        ? 'Penalty Foul in box'
        : severity === 'excessive_force'
        ? 'Serious Foul Play (Red Card)'
        : severity === 'reckless'
        ? 'Reckless Challenge (Yellow Card)'
        : 'Careless Challenge',
      canPlayAdvantage,
    }
  }

  /**
   * Evaluates handball infractions according to IFAB Law 12.
   */
  public evaluateHandball(
    player: SimPlayer,
    ball: { position: Vec3; velocity: Vec3 },
    isDeliberateBlock: boolean = false
  ): FoulResult | null {
    const isGK = player.role === 'goalkeeper'
    const inOwnBox = this.isInsidePenaltyBox(player.position, player.teamIndex)

    // Goalkeeper inside own penalty area is permitted to handle the ball
    if (isGK && inOwnBox) {
      return null
    }

    // Goalkeeper outside own penalty area
    if (isGK && !inOwnBox) {
      const dist = vec3.distance(player.position, ball.position)
      if (dist < 1.0) {
        return {
          isFoul: true,
          offender: player,
          severity: 'reckless',
          card: 'yellow',
          isPenalty: false,
          isIndirect: false,
          offencePosition: { ...player.position, y: 0.11 },
          reason: 'Goalkeeper handling outside penalty area',
          canPlayAdvantage: false,
        }
      }
      return null
    }

    // Outfield player handball
    // Happens when player blocks shot/cross with unnatural silhouette
    if (isDeliberateBlock && ball.position.y >= 0.3 && ball.position.y <= 2.2) {
      const horizontalDist = Math.hypot(player.position.x - ball.position.x, player.position.z - ball.position.z)
      if (horizontalDist < 1.35) {
        const isPenalty = this.isInsidePenaltyBox(player.position, player.teamIndex)
        return {
          isFoul: true,
          offender: player,
          severity: isPenalty ? 'reckless' : 'careless',
          card: isPenalty ? 'yellow' : undefined,
          isPenalty,
          isIndirect: false,
          offencePosition: isPenalty
            ? { x: 0, y: 0.11, z: player.teamIndex === 0 ? -this.HALF_LENGTH + 11 : this.HALF_LENGTH - 11 }
            : { ...player.position, y: 0.11 },
          reason: isPenalty ? 'Handball inside penalty area (Penalty awarded)' : 'Handball offence',
          canPlayAdvantage: false,
        }
      }
    }

    return null
  }

  /**
   * Back-pass rule (IFAB Law 12.2):
   * An indirect free kick is awarded if a goalkeeper inside their penalty area
   * touches the ball with hands/arms after it has been deliberately kicked to the goalkeeper by a teammate.
   */
  public evaluateBackPass(
    gk: SimPlayer,
    lastKicker: SimPlayer | null,
    wasDeliberateKick: boolean
  ): FoulResult | null {
    if (gk.role !== 'goalkeeper') return null
    if (!lastKicker || lastKicker.id === gk.id) return null
    if (lastKicker.teamIndex !== gk.teamIndex) return null

    if (wasDeliberateKick && this.isInsidePenaltyBox(gk.position, gk.teamIndex)) {
      // Award indirect free kick to opponent where the GK touched it
      // (or 5.5m line if inside goal area)
      const clampedZ = gk.teamIndex === 0
        ? Math.max(gk.position.z, -this.HALF_LENGTH + 5.5)
        : Math.min(gk.position.z, this.HALF_LENGTH - 5.5)

      return {
        isFoul: true,
        offender: gk,
        severity: 'careless',
        isPenalty: false,
        isIndirect: true, // Law 12: Indirect free kick!
        offencePosition: { x: clamp(gk.position.x, -18, 18), y: 0.11, z: clampedZ },
        reason: 'Illegal handling of deliberate back-pass by goalkeeper',
        canPlayAdvantage: false,
      }
    }

    return null
  }

  /**
   * Starts a referee advantage sequence.
   */
  public startAdvantage(foul: FoulResult, timestamp: number): AdvantageState {
    const adv: AdvantageState = {
      foulType: foul.reason,
      foulTeam: foul.offender?.teamIndex ?? 0,
      offencePosition: { ...foul.offencePosition },
      offenderId: foul.offender?.id ?? '',
      victimId: foul.victim?.id ?? '',
      isPenalty: foul.isPenalty,
      card: foul.card,
      startTime: timestamp,
      duration: 2.8,
      active: true,
    }
    this.activeAdvantage = adv
    return adv
  }

  public getActiveAdvantage(): AdvantageState | null {
    return this.activeAdvantage
  }

  public clearAdvantage(): void {
    if (this.activeAdvantage) {
      this.activeAdvantage.active = false
      this.activeAdvantage = null
    }
  }
}
