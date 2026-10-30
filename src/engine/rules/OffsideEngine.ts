import type { SimPlayer, Vec3, OffsideSnapshot } from '../../data/types'

export interface OffsideDecision {
  isOffside: boolean
  offendingPlayerId?: string
  offencePosition?: Vec3
  reason?: 'interfering_with_play' | 'gaining_advantage'
}

export class OffsideEngine {
  private activeSnapshot: OffsideSnapshot | null = null
  private nextSnapshotId: number = 1

  /**
   * Evaluates the 2nd-last defender Z position relative to the defending team's goal line.
   * Defending Team 1 (Away): defending Z = +52.5 (positive Z is deep)
   * Defending Team 0 (Home): defending Z = -52.5 (negative Z is deep)
   */
  public getSecondLastDefenderZ(defenders: SimPlayer[], attackingTeam: 0 | 1): number {
    const onPitchDefenders = defenders.filter((d) => d.isOnPitch)
    if (onPitchDefenders.length < 2) {
      return attackingTeam === 0 ? 52.5 : -52.5
    }

    const sorted = [...onPitchDefenders].sort((a, b) => {
      return attackingTeam === 0
        ? b.position.z - a.position.z // Most positive Z is deepest defender
        : a.position.z - b.position.z // Most negative Z is deepest defender
    })

    return sorted[1].position.z
  }

  /**
   * Captures the full snapshot of attackers and defenders at the exact moment of a teammate touch/pass.
   * Law 11: Hands and arms of all players (including goalkeepers) are not considered.
   * No offside directly from a throw-in, corner kick, or goal kick.
   */
  public createSnapshot(
    passer: SimPlayer,
    attackers: SimPlayer[],
    defenders: SimPlayer[],
    ballPosition: Vec3,
    timestamp: number,
    restartSource: 'normal' | 'throw_in' | 'corner' | 'goal_kick' = 'normal'
  ): OffsideSnapshot | null {
    // Law 11.3: There is no offside offence if a player receives the ball directly from:
    // - a goal kick
    // - a throw-in
    // - a corner kick
    if (restartSource !== 'normal') {
      this.activeSnapshot = null
      return null
    }

    const attackingTeam = passer.teamIndex
    const secondLastZ = this.getSecondLastDefenderZ(defenders, attackingTeam)
    const offsidePlayerIds: string[] = []

    for (const attacker of attackers) {
      if (!attacker.isOnPitch || attacker.id === passer.id) continue

      // Law 11.1: A player is NOT in an offside position if they are in their own half of the field of play
      // Halfway line itself (z = 0) does not count as opponent half
      if (attackingTeam === 0 && attacker.position.z <= 0) continue
      if (attackingTeam === 1 && attacker.position.z >= 0) continue

      // Law 11.1: Must be nearer to the opponent's goal line than the ball AND second-last opponent
      let isAheadOfBall = false
      let isAheadOfSecondLast = false

      if (attackingTeam === 0) {
        // Attacking toward positive Z
        isAheadOfBall = attacker.position.z > ballPosition.z + 0.05
        isAheadOfSecondLast = attacker.position.z > secondLastZ + 0.05
      } else {
        // Attacking toward negative Z
        isAheadOfBall = attacker.position.z < ballPosition.z - 0.05
        isAheadOfSecondLast = attacker.position.z < secondLastZ - 0.05
      }

      if (isAheadOfBall && isAheadOfSecondLast) {
        offsidePlayerIds.push(attacker.id)
      }
    }

    const snapshot: OffsideSnapshot = {
      id: `offside_snap_${this.nextSnapshotId++}`,
      timestamp,
      passerId: passer.id,
      passerTeam: attackingTeam,
      ballPosition: { ...ballPosition },
      restartSource,
      offsidePlayerIds,
      secondLastDefenderZ: secondLastZ,
      active: offsidePlayerIds.length > 0,
    }

    this.activeSnapshot = snapshot
    return snapshot
  }

  /**
   * Evaluates active involvement when a player touches or challenges for the ball.
   */
  public evaluateInvolvement(
    player: SimPlayer,
    isOpponentDeliberatePlay: boolean = false,
    isOpponentSave: boolean = false
  ): OffsideDecision {
    if (!this.activeSnapshot || !this.activeSnapshot.active) {
      return { isOffside: false }
    }

    const snapshot = this.activeSnapshot

    // If opponent made a deliberate play (excluding a deliberate save), offside is reset
    if (player.teamIndex !== snapshot.passerTeam) {
      if (isOpponentDeliberatePlay && !isOpponentSave) {
        this.clearSnapshot()
        return { isOffside: false }
      }
      // Rebound or save from opponent does not clear offside
      return { isOffside: false }
    }

    // Attacking teammate touches or challenges for the ball
    if (snapshot.offsidePlayerIds.includes(player.id)) {
      const decision: OffsideDecision = {
        isOffside: true,
        offendingPlayerId: player.id,
        offencePosition: { ...player.position, y: 0.11 },
        reason: isOpponentSave ? 'gaining_advantage' : 'interfering_with_play',
      }
      this.clearSnapshot()
      return decision
    }

    // An onside teammate touched the ball -> previous offside snapshot expires
    this.clearSnapshot()
    return { isOffside: false }
  }

  public getActiveSnapshot(): OffsideSnapshot | null {
    return this.activeSnapshot
  }

  public clearSnapshot(): void {
    if (this.activeSnapshot) {
      this.activeSnapshot.active = false
      this.activeSnapshot = null
    }
  }
}
