import type { SimPlayer, SimBall, Vec3, SetPieceState, PenaltyShootoutState } from '../../data/types'
import { vec3, clamp } from '../../utils/math'

export class RestartManager {
  public readonly PITCH_WIDTH = 68
  public readonly PITCH_LENGTH = 105
  public readonly HALF_WIDTH = 34
  public readonly HALF_LENGTH = 52.5
  public readonly PENALTY_SPOT_DIST = 11.0 // 11m from goal line
  public readonly WALL_DISTANCE = 9.15 // 9.15m for free kick wall and corner
  public readonly THROW_IN_DISTANCE = 2.0 // 2m for throw-in opponents

  private lastKickerId: string | null = null
  private touchesSinceRestart: number = 0
  private activeRestartType: SetPieceState['type'] | 'KICK_OFF' | null = null
  private activeIsIndirect: boolean = false

  // Penalty Shootout state
  private shootoutState: PenaltyShootoutState = {
    active: false,
    currentRound: 1,
    currentTurnTeam: 0,
    attempts: [],
    score: [0, 0],
    winner: null,
  }

  /**
   * Sets up proper IFAB positioning for a Free Kick (Direct or Indirect).
   */
  public setupFreeKick(
    awardedTeam: 0 | 1,
    offencePos: Vec3,
    isIndirect: boolean,
    players: SimPlayer[]
  ): { taker: SimPlayer; wallPositions: Vec3[]; setPiece: SetPieceState } {
    const onPitch = players.filter((p) => p.isOnPitch)
    const teamPlayers = onPitch.filter((p) => p.teamIndex === awardedTeam)
    const opponents = onPitch.filter((p) => p.teamIndex !== awardedTeam)

    // Select taker: closest outfield player (or best passer/free kick taker)
    const outfield = teamPlayers.filter((p) => p.role !== 'goalkeeper')
    const taker = (outfield.length > 0 ? outfield : teamPlayers).sort(
      (a, b) => vec3.distance(a.position, offencePos) - vec3.distance(b.position, offencePos)
    )[0] || teamPlayers[0]

    // Position taker directly behind ball facing opponent goal
    const oppGoalZ = awardedTeam === 0 ? this.HALF_LENGTH : -this.HALF_LENGTH
    const toGoal = vec3.normalize({ x: 0 - offencePos.x, y: 0, z: oppGoalZ - offencePos.z })
    const takerPos: Vec3 = {
      x: offencePos.x - toGoal.x * 0.6,
      y: 0,
      z: offencePos.z - toGoal.z * 0.6,
    }
    const takerRot = Math.atan2(toGoal.x, toGoal.z)

    taker.position = takerPos
    taker.rotation = takerRot
    taker.velocity = { x: 0, y: 0, z: 0 }
    taker.hasBall = true

    // Position defending wall 9.15m away between ball and goal
    // Wall consists of 3-4 defenders
    const distToGoal = Math.abs(oppGoalZ - offencePos.z)
    const wallPositions: Vec3[] = []

    if (distToGoal > 12.0 && distToGoal < 38.0) {
      const wallDist = Math.min(this.WALL_DISTANCE, distToGoal - 1.5)
      const wallCenter: Vec3 = {
        x: offencePos.x + toGoal.x * wallDist,
        y: 0,
        z: offencePos.z + toGoal.z * wallDist,
      }

      // Wall perpendicular vector
      const perp = { x: -toGoal.z, y: 0, z: toGoal.x }
      const wallDefenders = opponents.filter((p) => p.role !== 'goalkeeper').slice(0, 3)

      wallDefenders.forEach((def, idx) => {
        const offset = (idx - 1) * 0.75
        const defPos: Vec3 = {
          x: clamp(wallCenter.x + perp.x * offset, -this.HALF_WIDTH + 1, this.HALF_WIDTH - 1),
          y: 0,
          z: clamp(wallCenter.z + perp.z * offset, -this.HALF_LENGTH + 1, this.HALF_LENGTH - 1),
        }
        def.position = defPos
        def.rotation = Math.atan2(-toGoal.x, -toGoal.z) // Facing ball
        def.velocity = { x: 0, y: 0, z: 0 }
        wallPositions.push(defPos)
      })
    }

    // Move all other opponents outside 9.15m radius
    for (const opp of opponents) {
      if (opp.role === 'goalkeeper') continue
      const dist = vec3.distance(opp.position, offencePos)
      if (dist < this.WALL_DISTANCE) {
        const pushDir = dist > 0.1 ? vec3.normalize(vec3.sub(opp.position, offencePos)) : { x: 0, y: 0, z: awardedTeam === 0 ? 1 : -1 }
        opp.position = {
          x: clamp(offencePos.x + pushDir.x * (this.WALL_DISTANCE + 0.5), -this.HALF_WIDTH + 1, this.HALF_WIDTH - 1),
          y: 0,
          z: clamp(offencePos.z + pushDir.z * (this.WALL_DISTANCE + 0.5), -this.HALF_LENGTH + 1, this.HALF_LENGTH - 1),
        }
      }
    }

    this.lastKickerId = taker.id
    this.touchesSinceRestart = 0
    this.activeRestartType = 'FREE_KICK'
    this.activeIsIndirect = isIndirect

    const setPiece: SetPieceState = {
      type: 'FREE_KICK',
      teamIndex: awardedTeam,
      position: offencePos,
      takerId: taker.id,
      timer: 1.8,
      isIndirect,
    }

    return { taker, wallPositions, setPiece }
  }

  /**
   * Sets up proper IFAB positioning for a Penalty Kick.
   */
  public setupPenalty(
    awardedTeam: 0 | 1,
    players: SimPlayer[]
  ): { taker: SimPlayer; keeper: SimPlayer; setPiece: SetPieceState } {
    const onPitch = players.filter((p) => p.isOnPitch)
    const teamPlayers = onPitch.filter((p) => p.teamIndex === awardedTeam)
    const defendingPlayers = onPitch.filter((p) => p.teamIndex !== awardedTeam)

    const penaltyZ = awardedTeam === 0 ? this.HALF_LENGTH - this.PENALTY_SPOT_DIST : -this.HALF_LENGTH + this.PENALTY_SPOT_DIST
    const penaltyPos: Vec3 = { x: 0, y: 0.11, z: penaltyZ }

    // Select taker (highest shooting/penalties)
    const taker = teamPlayers.find((p) => p.playerData.isPenaltyTaker) ||
      teamPlayers.find((p) => p.role === 'attacker') ||
      teamPlayers[0]

    // Goalkeeper on defending goal line
    const keeperGoalZ = awardedTeam === 0 ? this.HALF_LENGTH - 0.1 : -this.HALF_LENGTH + 0.1
    const keeper = defendingPlayers.find((p) => p.role === 'goalkeeper') || defendingPlayers[0]
    keeper.position = { x: 0, y: 0, z: keeperGoalZ }
    keeper.rotation = awardedTeam === 0 ? Math.PI : 0
    keeper.velocity = { x: 0, y: 0, z: 0 }

    // Position taker 2.5m behind penalty spot
    const takerZ = awardedTeam === 0 ? penaltyZ - 2.5 : penaltyZ + 2.5
    taker.position = { x: 0, y: 0, z: takerZ }
    taker.rotation = awardedTeam === 0 ? 0 : Math.PI
    taker.velocity = { x: 0, y: 0, z: 0 }
    taker.hasBall = true

    // Law 14: All other players must be:
    // 1. On the field of play
    // 2. Outside the penalty area
    // 3. Behind the penalty mark
    // 4. At least 9.15m from the penalty mark
    const safeZ = awardedTeam === 0 ? penaltyZ - 11.0 : penaltyZ + 11.0
    for (const p of onPitch) {
      if (p.id === taker.id || p.id === keeper.id) continue
      p.hasBall = false
      p.velocity = { x: 0, y: 0, z: 0 }
      const slotOffset = (p.slotIndex - 5) * 2.5
      p.position = {
        x: clamp(slotOffset, -this.HALF_WIDTH + 4, this.HALF_WIDTH - 4),
        y: 0,
        z: clamp(safeZ + (p.teamIndex === awardedTeam ? -1.0 : 1.0), -this.HALF_LENGTH + 2, this.HALF_LENGTH - 2),
      }
      p.rotation = awardedTeam === 0 ? 0 : Math.PI
    }

    this.lastKickerId = taker.id
    this.touchesSinceRestart = 0
    this.activeRestartType = 'PENALTY'
    this.activeIsIndirect = false

    const setPiece: SetPieceState = {
      type: 'PENALTY',
      teamIndex: awardedTeam,
      position: penaltyPos,
      takerId: taker.id,
      timer: 2.2,
      isIndirect: false,
    }

    return { taker, keeper, setPiece }
  }

  /**
   * Sets up proper IFAB positioning for a Throw-in.
   */
  public setupThrowIn(
    awardedTeam: 0 | 1,
    touchlinePos: Vec3,
    players: SimPlayer[]
  ): { taker: SimPlayer; setPiece: SetPieceState } {
    const onPitch = players.filter((p) => p.isOnPitch)
    const teamPlayers = onPitch.filter((p) => p.teamIndex === awardedTeam)
    const opponents = onPitch.filter((p) => p.teamIndex !== awardedTeam)

    const taker = teamPlayers
      .filter((p) => p.role !== 'goalkeeper')
      .sort((a, b) => vec3.distance(a.position, touchlinePos) - vec3.distance(b.position, touchlinePos))[0] || teamPlayers[0]

    // Position taker right at the sideline facing onto the field
    const facingInwardX = touchlinePos.x > 0 ? -1 : 1
    taker.position = { x: touchlinePos.x, y: 0, z: touchlinePos.z }
    taker.rotation = Math.atan2(facingInwardX, 0)
    taker.velocity = { x: 0, y: 0, z: 0 }
    taker.hasBall = true

    // Law 15: All opponents must stand at least 2m from the point on the touchline
    for (const opp of opponents) {
      const dist = vec3.distance(opp.position, touchlinePos)
      if (dist < this.THROW_IN_DISTANCE) {
        opp.position.x += facingInwardX * (this.THROW_IN_DISTANCE + 0.5)
      }
    }

    this.lastKickerId = taker.id
    this.touchesSinceRestart = 0
    this.activeRestartType = 'THROW_IN'
    this.activeIsIndirect = true // Cannot score directly from a throw-in!

    const setPiece: SetPieceState = {
      type: 'THROW_IN',
      teamIndex: awardedTeam,
      position: touchlinePos,
      takerId: taker.id,
      timer: 1.8,
      isIndirect: true,
    }

    return { taker, setPiece }
  }

  /**
   * Sets up proper IFAB positioning for a Corner Kick.
   */
  public setupCorner(
    awardedTeam: 0 | 1,
    cornerPos: Vec3,
    players: SimPlayer[]
  ): { taker: SimPlayer; setPiece: SetPieceState } {
    const onPitch = players.filter((p) => p.isOnPitch)
    const teamPlayers = onPitch.filter((p) => p.teamIndex === awardedTeam)
    const opponents = onPitch.filter((p) => p.teamIndex !== awardedTeam)

    const taker = teamPlayers.find((p) => p.playerData.isCornerTaker) ||
      [...teamPlayers].sort((a, b) => b.playerData.attributes.crossing - a.playerData.attributes.crossing)[0] ||
      teamPlayers[0]

    taker.position = { x: cornerPos.x, y: 0, z: cornerPos.z }
    taker.velocity = { x: 0, y: 0, z: 0 }
    taker.hasBall = true

    // Opponents at least 9.15m away from corner arc
    for (const opp of opponents) {
      if (opp.role === 'goalkeeper') continue
      const dist = vec3.distance(opp.position, cornerPos)
      if (dist < this.WALL_DISTANCE) {
        const pushDir = vec3.normalize(vec3.sub(opp.position, cornerPos))
        opp.position = {
          x: clamp(cornerPos.x + pushDir.x * (this.WALL_DISTANCE + 0.5), -this.HALF_WIDTH + 1, this.HALF_WIDTH - 1),
          y: 0,
          z: clamp(cornerPos.z + pushDir.z * (this.WALL_DISTANCE + 0.5), -this.HALF_LENGTH + 1, this.HALF_LENGTH - 1),
        }
      }
    }

    this.lastKickerId = taker.id
    this.touchesSinceRestart = 0
    this.activeRestartType = 'CORNER'
    this.activeIsIndirect = false // Can score directly (Olimpico)

    const setPiece: SetPieceState = {
      type: 'CORNER',
      teamIndex: awardedTeam,
      position: cornerPos,
      takerId: taker.id,
      timer: 2.0,
      isIndirect: false,
    }

    return { taker, setPiece }
  }

  /**
   * Sets up proper IFAB positioning for a Goal Kick.
   */
  public setupGoalKick(
    defendingTeam: 0 | 1,
    players: SimPlayer[]
  ): { taker: SimPlayer; setPiece: SetPieceState } {
    const onPitch = players.filter((p) => p.isOnPitch)
    const teamPlayers = onPitch.filter((p) => p.teamIndex === defendingTeam)
    const opponents = onPitch.filter((p) => p.teamIndex !== defendingTeam)

    // Ball placed in 6-yard box (5.5m from goal line)
    const goalKickZ = defendingTeam === 0 ? -this.HALF_LENGTH + 5.5 : this.HALF_LENGTH - 5.5
    const goalKickPos: Vec3 = { x: 0, y: 0.11, z: goalKickZ }

    const gk = teamPlayers.find((p) => p.role === 'goalkeeper') || teamPlayers[0]
    gk.position = { x: 0, y: 0, z: goalKickZ + (defendingTeam === 0 ? -1.0 : 1.0) }
    gk.rotation = defendingTeam === 0 ? 0 : Math.PI
    gk.velocity = { x: 0, y: 0, z: 0 }
    gk.hasBall = true

    // Opponents must remain outside the penalty area until ball is kicked
    for (const opp of opponents) {
      if (Math.abs(opp.position.x) < 20.16) {
        if (defendingTeam === 0 && opp.position.z < -this.HALF_LENGTH + 16.5) {
          opp.position.z = -this.HALF_LENGTH + 17.5
        } else if (defendingTeam === 1 && opp.position.z > this.HALF_LENGTH - 16.5) {
          opp.position.z = this.HALF_LENGTH - 17.5
        }
      }
    }

    this.lastKickerId = gk.id
    this.touchesSinceRestart = 0
    this.activeRestartType = 'GOAL_KICK'
    this.activeIsIndirect = false // Can score directly against opponent

    const setPiece: SetPieceState = {
      type: 'GOAL_KICK',
      teamIndex: defendingTeam,
      position: goalKickPos,
      takerId: gk.id,
      timer: 1.8,
      isIndirect: false,
    }

    return { taker: gk, setPiece }
  }

  /**
   * Sets up a Dropped Ball.
   * Law 8.2: Dropped for the defending team goalkeeper if inside penalty area,
   * or for one player of the team that last touched the ball at the stop position.
   * All other players at least 4m away.
   */
  public setupDroppedBall(
    lastTeam: 0 | 1,
    stopPos: Vec3,
    players: SimPlayer[]
  ): { receiver: SimPlayer; setPiece: SetPieceState } {
    const onPitch = players.filter((p) => p.isOnPitch)
    const isInsideHomeBox = Math.abs(stopPos.x) <= 20.16 && stopPos.z < -this.HALF_LENGTH + 16.5
    const isInsideAwayBox = Math.abs(stopPos.x) <= 20.16 && stopPos.z > this.HALF_LENGTH - 16.5

    let receiverTeam: 0 | 1 = lastTeam
    let receiverRole: 'goalkeeper' | 'any' = 'any'

    if (isInsideHomeBox) {
      receiverTeam = 0
      receiverRole = 'goalkeeper'
    } else if (isInsideAwayBox) {
      receiverTeam = 1
      receiverRole = 'goalkeeper'
    }

    const teamPlayers = onPitch.filter((p) => p.teamIndex === receiverTeam)
    const receiver = receiverRole === 'goalkeeper'
      ? teamPlayers.find((p) => p.role === 'goalkeeper') || teamPlayers[0]
      : teamPlayers.sort((a, b) => vec3.distance(a.position, stopPos) - vec3.distance(b.position, stopPos))[0] || teamPlayers[0]

    receiver.position = { ...stopPos, y: 0 }
    receiver.velocity = { x: 0, y: 0, z: 0 }
    receiver.hasBall = true

    // All other players at least 4m away
    for (const p of onPitch) {
      if (p.id === receiver.id) continue
      const dist = vec3.distance(p.position, stopPos)
      if (dist < 4.0) {
        const push = vec3.normalize(vec3.sub(p.position, stopPos))
        p.position = {
          x: clamp(stopPos.x + push.x * 4.5, -this.HALF_WIDTH + 1, this.HALF_WIDTH - 1),
          y: 0,
          z: clamp(stopPos.z + push.z * 4.5, -this.HALF_LENGTH + 1, this.HALF_LENGTH - 1),
        }
      }
    }

    this.lastKickerId = receiver.id
    this.touchesSinceRestart = 0
    this.activeRestartType = 'DROPPED_BALL'
    this.activeIsIndirect = false

    const setPiece: SetPieceState = {
      type: 'DROPPED_BALL',
      teamIndex: receiverTeam,
      position: stopPos,
      takerId: receiver.id,
      timer: 1.5,
      isIndirect: false,
    }

    return { receiver, setPiece }
  }

  /**
   * Evaluates if a player touch violates the double-touch rule on a restart.
   * If taker touches ball a second time before another player touches it,
   * award an indirect free kick to the opposing team.
   */
  public checkDoubleTouch(player: SimPlayer): boolean {
    if (!this.lastKickerId) return false

    if (this.touchesSinceRestart === 0) {
      if (player.id === this.lastKickerId) {
        this.touchesSinceRestart = 1
        return false // First touch is legal kick
      }
    } else if (this.touchesSinceRestart === 1) {
      if (player.id === this.lastKickerId) {
        // Illegal second touch by restart taker!
        return true
      }
      // Touched by another player: restart phase complete
      this.touchesSinceRestart = 2
      this.lastKickerId = null
      this.activeRestartType = null
    }

    return false
  }

  public registerBallTouch(playerId: string): void {
    if (this.lastKickerId) {
      if (playerId !== this.lastKickerId) {
        this.touchesSinceRestart = 2
        this.lastKickerId = null
        this.activeRestartType = null
      }
    }
  }

  public isIndirectActive(): boolean {
    return this.activeIsIndirect && this.touchesSinceRestart < 2
  }

  public getActiveRestartType(): SetPieceState['type'] | 'KICK_OFF' | null {
    return this.activeRestartType
  }

  // ─── Penalty Shootout Engine ───

  public startShootout(): PenaltyShootoutState {
    this.shootoutState = {
      active: true,
      currentRound: 1,
      currentTurnTeam: 0,
      attempts: [],
      score: [0, 0],
      winner: null,
    }
    return this.shootoutState
  }

  public recordShootoutKick(scored: boolean, takerId: string): PenaltyShootoutState {
    if (!this.shootoutState.active) return this.shootoutState

    const team = this.shootoutState.currentTurnTeam
    if (scored) {
      this.shootoutState.score[team] += 1
    }

    this.shootoutState.attempts.push({
      teamIndex: team,
      takerId,
      scored,
      round: this.shootoutState.currentRound,
    })

    // Advance turn
    if (team === 0) {
      this.shootoutState.currentTurnTeam = 1
    } else {
      this.shootoutState.currentTurnTeam = 0
      this.shootoutState.currentRound += 1
    }

    // Check winner
    this.evaluateShootoutWinner()
    return this.shootoutState
  }

  private evaluateShootoutWinner(): void {
    const s = this.shootoutState
    const team0Kicks = s.attempts.filter((a) => a.teamIndex === 0).length
    const team1Kicks = s.attempts.filter((a) => a.teamIndex === 1).length

    // First 5 rounds logic: check if impossible to catch up
    if (team0Kicks <= 5 && team1Kicks <= 5) {
      const team0Remaining = 5 - team0Kicks
      const team1Remaining = 5 - team1Kicks

      if (s.score[0] > s.score[1] + team1Remaining) {
        s.winner = 0
        s.active = false
        return
      }
      if (s.score[1] > s.score[0] + team0Remaining) {
        s.winner = 1
        s.active = false
        return
      }
    }

    // After 5 complete rounds: Sudden Death
    if (team0Kicks >= 5 && team1Kicks >= 5 && team0Kicks === team1Kicks) {
      if (s.score[0] !== s.score[1]) {
        s.winner = s.score[0] > s.score[1] ? 0 : 1
        s.active = false
      }
    }
  }

  public getShootoutState(): PenaltyShootoutState {
    return this.shootoutState
  }

  public reset(): void {
    this.lastKickerId = null
    this.touchesSinceRestart = 0
    this.activeRestartType = null
    this.activeIsIndirect = false
    this.shootoutState = {
      active: false,
      currentRound: 1,
      currentTurnTeam: 0,
      attempts: [],
      score: [0, 0],
      winner: null,
    }
  }
}
