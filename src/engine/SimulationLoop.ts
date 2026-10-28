import type { Team, SimPlayer, SimBall, PlayerRole, Vec3, MatchStats, MatchPhase, MatchAnnouncement, SetPieceState } from '../data/types'
import { BallPhysics } from './physics/BallPhysics'
import { PlayerPhysics } from './physics/PlayerPhysics'
import { MatchStateMachine } from './MatchStateMachine'
import { MatchClock } from './rules/MatchClock'
import { GoalDetector } from './rules/GoalDetector'
import { Referee } from './rules/Referee'
import { PassingSystem } from './possession/PassingSystem'
import { ShootingSystem } from './possession/ShootingSystem'
import { PossessionTracker } from './possession/PossessionTracker'
import { TeamAI } from './ai/TeamAI'
import { MatchEventLog } from './events/MatchEventLog'
import { vec3, clamp } from '../utils/math'

export interface SimulationCallbacks {
  onPhaseChange?: (phase: MatchPhase) => void
  onGoal?: (scoringTeam: 0 | 1, scorer?: SimPlayer) => void
  onClockTick?: (minute: number, half: 1 | 2) => void
  onStatsUpdate?: (stats: Partial<MatchStats>) => void
  onEvent?: (desc: string, type: string) => void
  onAnnouncement?: (announcement: MatchAnnouncement | null) => void
  onShotCharge?: (powerRatio: number) => void
}

export class SimulationLoop {
  public ballPhysics = new BallPhysics()
  public stateMachine = new MatchStateMachine()
  public matchClock: MatchClock
  public goalDetector = new GoalDetector()
  public referee = new Referee()
  public passingSystem = new PassingSystem()
  public shootingSystem = new ShootingSystem()
  public possessionTracker = new PossessionTracker()
  public teamAI = new TeamAI()
  public eventLog = new MatchEventLog()

  public homeTeam: Team
  public awayTeam: Team
  public simPlayers: SimPlayer[] = []
  private playerPhysicsMap: Map<string, PlayerPhysics> = new Map()

  public controlledPlayerId: string | null = null
  public lastTouchedTeam: 0 | 1 | null = null
  public lastTouchedPlayerId: string | null = null

  public intendedPassTargetId: string | null = null
  public currentSetPiece: SetPieceState | null = null
  public currentAnnouncement: MatchAnnouncement | null = null

  // Shot charging state
  public isChargingShot: boolean = false
  public shotChargeTime: number = 0
  public currentShotPower: number = 0

  // Offside tracking
  private pendingOffsideTargetId: string | null = null
  private pendingOffsideTeam: 0 | 1 | null = null

  // Timers and cooldowns
  private announcementTimer: number = 0
  private setPieceCooldown: number = 0
  private goalCelebrationTimer: number = 0
  private kickOffPending: boolean = true

  public score: [number, number] = [0, 0]
  public stats: MatchStats = {
    possession: [50, 50],
    shots: [0, 0],
    shotsOnTarget: [0, 0],
    corners: [0, 0],
    fouls: [0, 0],
    yellowCards: [0, 0],
    redCards: [0, 0],
    offsides: [0, 0],
    saves: [0, 0],
    passAccuracy: [85, 83],
    distanceCovered: [0, 0],
  }

  private callbacks: SimulationCallbacks = {}

  constructor(homeTeam: Team, awayTeam: Team, matchDurationMins = 5, callbacks: SimulationCallbacks = {}) {
    this.homeTeam = homeTeam
    this.awayTeam = awayTeam
    this.callbacks = callbacks
    this.matchClock = new MatchClock(matchDurationMins)

    this.initPlayers()
    this.setupKickOff(0)
  }

  private mapRole(pos: string): PlayerRole {
    if (pos === 'GK') return 'goalkeeper'
    if (['CB', 'LB', 'RB'].includes(pos)) return 'defender'
    if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'midfielder'
    return 'attacker'
  }

  public initPlayers(): void {
    this.simPlayers = []
    this.playerPhysicsMap.clear()

    // 11 Home players
    for (let slot = 0; slot < 11; slot++) {
      const pId = this.homeTeam.startingXI[slot]
      const playerData = this.homeTeam.squad.find((p) => p.id === pId) || this.homeTeam.squad[slot]
      const phys = new PlayerPhysics()

      const simP: SimPlayer = {
        id: playerData.id,
        teamIndex: 0,
        playerData,
        position: { x: 0, y: 0, z: -20 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: 0,
        stamina: 100,
        hasBall: false,
        isControlled: slot === 9, // default to striker
        targetPosition: { x: 0, y: 0, z: -20 },
        role: this.mapRole(playerData.position),
        slotIndex: slot,
        isOnPitch: true,
        isSprinting: false,
      }

      this.simPlayers.push(simP)
      this.playerPhysicsMap.set(simP.id, phys)
      if (simP.isControlled) {
        this.controlledPlayerId = simP.id
      }
    }

    // 11 Away players
    for (let slot = 0; slot < 11; slot++) {
      const pId = this.awayTeam.startingXI[slot]
      const playerData = this.awayTeam.squad.find((p) => p.id === pId) || this.awayTeam.squad[slot]
      const phys = new PlayerPhysics()

      const simP: SimPlayer = {
        id: playerData.id,
        teamIndex: 1,
        playerData,
        position: { x: 0, y: 0, z: 20 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: Math.PI,
        stamina: 100,
        hasBall: false,
        isControlled: false,
        targetPosition: { x: 0, y: 0, z: 20 },
        role: this.mapRole(playerData.position),
        slotIndex: slot,
        isOnPitch: true,
        isSprinting: false,
      }

      this.simPlayers.push(simP)
      this.playerPhysicsMap.set(simP.id, phys)
    }
  }

  public showAnnouncement(
    title: string,
    subtitle?: string,
    type: MatchAnnouncement['type'] = 'info',
    durationMs: number = 2400
  ): void {
    const ann: MatchAnnouncement = { title, subtitle, type, durationMs }
    this.currentAnnouncement = ann
    this.announcementTimer = durationMs / 1000
    this.callbacks.onAnnouncement?.(ann)
  }

  public setupKickOff(kickingTeam: 0 | 1): void {
    const homeAnchors = this.teamAI.getFormationAnchors(this.homeTeam.tactics.formation, 0)
    const awayAnchors = this.teamAI.getFormationAnchors(this.awayTeam.tactics.formation, 1)

    // Reset ball to center spot
    this.ballPhysics.setPosition({ x: 0, y: 0.11, z: 0 })
    this.ballPhysics.velocity = { x: 0, y: 0, z: 0 }
    this.currentSetPiece = null
    this.pendingOffsideTargetId = null

    // Position Home players
    for (let i = 0; i < 11; i++) {
      const p = this.simPlayers[i]
      const phys = this.playerPhysicsMap.get(p.id)
      const anchor = homeAnchors[i] || { x: 0, y: 0, z: -20 }
      const pos = { x: anchor.x, y: 0, z: Math.min(-1.0, anchor.z) }
      if (kickingTeam === 0 && i === 9) {
        pos.x = 0
        pos.z = -0.5
      }
      p.position = pos
      p.velocity = { x: 0, y: 0, z: 0 }
      p.rotation = 0
      p.hasBall = kickingTeam === 0 && i === 9
      phys?.teleport(pos, 0)
    }

    // Position Away players
    for (let i = 0; i < 11; i++) {
      const p = this.simPlayers[11 + i]
      const phys = this.playerPhysicsMap.get(p.id)
      const anchor = awayAnchors[i] || { x: 0, y: 0, z: 20 }
      const pos = { x: anchor.x, y: 0, z: Math.max(1.0, anchor.z) }
      if (kickingTeam === 1 && i === 9) {
        pos.x = 0
        pos.z = 0.5
      }
      p.position = pos
      p.velocity = { x: 0, y: 0, z: 0 }
      p.rotation = Math.PI
      p.hasBall = kickingTeam === 1 && i === 9
      phys?.teleport(pos, Math.PI)
    }

    this.kickOffPending = true
  }

  public setupSetPiece(
    type: 'THROW_IN' | 'CORNER' | 'GOAL_KICK' | 'FREE_KICK' | 'PENALTY',
    teamIndex: 0 | 1,
    position: Vec3
  ): void {
    this.setPieceCooldown = 2.0
    this.pendingOffsideTargetId = null

    // Stop ball at position
    this.ballPhysics.setPosition({ x: position.x, y: 0.11, z: position.z })
    this.ballPhysics.velocity = { x: 0, y: 0, z: 0 }

    const teamPlayers = this.simPlayers.filter((p) => p.teamIndex === teamIndex && p.isOnPitch)
    const opponents = this.simPlayers.filter((p) => p.teamIndex !== teamIndex && p.isOnPitch)

    // Select suitable taker
    let taker: SimPlayer | undefined

    if (type === 'GOAL_KICK') {
      taker = teamPlayers.find((p) => p.role === 'goalkeeper') || teamPlayers[0]
    } else if (type === 'PENALTY') {
      taker = teamPlayers.find((p) => p.role === 'attacker') || teamPlayers[teamPlayers.length - 1]
    } else if (type === 'CORNER') {
      taker = [...teamPlayers].sort(
        (a, b) => b.playerData.attributes.crossing - a.playerData.attributes.crossing
      )[0]
    } else {
      // Throw in or Free kick: closest outfield player
      taker = [...teamPlayers]
        .filter((p) => p.role !== 'goalkeeper')
        .sort((a, b) => vec3.distance(a.position, position) - vec3.distance(b.position, position))[0]
    }

    if (!taker) taker = teamPlayers[0]

    // Clear everyone else's ball
    for (const p of this.simPlayers) p.hasBall = false

    // Position taker behind the ball
    const targetZ = teamIndex === 0 ? 52.5 : -52.5
    const dirToGoal = vec3.normalize({ x: 0 - position.x, y: 0, z: targetZ - position.z })
    const takerPos: Vec3 = {
      x: position.x - dirToGoal.x * 0.6,
      y: 0,
      z: position.z - dirToGoal.z * 0.6,
    }
    const takerRot = Math.atan2(dirToGoal.x, dirToGoal.z)

    taker.position = takerPos
    taker.rotation = takerRot
    taker.velocity = { x: 0, y: 0, z: 0 }
    taker.hasBall = true

    const takerPhys = this.playerPhysicsMap.get(taker.id)
    takerPhys?.teleport(takerPos, takerRot)

    this.lastTouchedTeam = teamIndex
    this.lastTouchedPlayerId = taker.id
    this.possessionTracker.setPossession(teamIndex)

    if (teamIndex === 0) {
      this.switchControlledPlayer(taker.id)
    }

    // Move opponents back to legal distance (9.15m)
    const requiredDistance = type === 'PENALTY' ? 9.5 : 9.15
    for (const opp of opponents) {
      if (type === 'PENALTY' && opp.role === 'goalkeeper') {
        const oppGoalZ = teamIndex === 0 ? 52.4 : -52.4
        opp.position = { x: 0, y: 0, z: oppGoalZ }
        opp.rotation = teamIndex === 0 ? Math.PI : 0
        const oppPhys = this.playerPhysicsMap.get(opp.id)
        oppPhys?.teleport(opp.position, opp.rotation)
        continue
      }

      const dist = vec3.distance(opp.position, position)
      if (dist < requiredDistance) {
        const pushDir = dist > 0.01 ? vec3.normalize(vec3.sub(opp.position, position)) : { x: 0, y: 0, z: teamIndex === 0 ? -1 : 1 }
        opp.position = {
          x: clamp(position.x + pushDir.x * (requiredDistance + 1), -33, 33),
          y: 0,
          z: clamp(position.z + pushDir.z * (requiredDistance + 1), -51, 51),
        }
        const oppPhys = this.playerPhysicsMap.get(opp.id)
        oppPhys?.teleport(opp.position, opp.rotation)
      }
    }

    const teamName = teamIndex === 0 ? this.homeTeam.name : this.awayTeam.name

    if (type === 'CORNER') {
      this.stats.corners[teamIndex]++
      this.showAnnouncement('CORNER KICK', teamName, 'corner')
      this.eventLog.addEvent('CORNER', this.matchClock.getMinute(), teamIndex === 0 ? this.homeTeam.id : this.awayTeam.id, `Corner for ${teamName}`)
    } else if (type === 'THROW_IN') {
      this.showAnnouncement('THROW-IN', teamName, 'throw_in')
    } else if (type === 'GOAL_KICK') {
      this.showAnnouncement('GOAL KICK', teamName, 'goal_kick')
    } else if (type === 'FREE_KICK') {
      this.showAnnouncement('FREE KICK', teamName, 'foul')
    } else if (type === 'PENALTY') {
      this.showAnnouncement('PENALTY KICK!', teamName, 'penalty')
      this.eventLog.addEvent('PENALTY', this.matchClock.getMinute(), teamIndex === 0 ? this.homeTeam.id : this.awayTeam.id, `Penalty awarded to ${teamName}`)
    }

    this.currentSetPiece = {
      type,
      teamIndex,
      position,
      takerId: taker.id,
      timer: 1.6,
    }

    this.stateMachine.transition('SET_PIECE')
    this.callbacks.onPhaseChange?.('SET_PIECE')
    this.callbacks.onStatsUpdate?.(this.stats)
  }

  public executeSetPiece(kickType: 'pass' | 'cross' | 'shot'): void {
    if (!this.currentSetPiece) return
    const teamIndex = this.currentSetPiece.teamIndex

    this.currentSetPiece = null
    this.stateMachine.transition('PLAYING')
    this.callbacks.onPhaseChange?.('PLAYING')

    if (kickType === 'shot') {
      this.performShot(85, teamIndex === 0 ? 0 : Math.PI)
    } else if (kickType === 'cross') {
      this.performPass(false, true, teamIndex === 0 ? 0 : Math.PI)
    } else {
      this.performPass(false, false, teamIndex === 0 ? 0 : Math.PI)
    }
  }

  public switchControlledPlayer(manualTargetId?: string): void {
    const homePlayers = this.simPlayers.filter((p) => p.teamIndex === 0 && p.isOnPitch)

    if (manualTargetId) {
      const target = homePlayers.find((p) => p.id === manualTargetId)
      if (target) {
        for (const p of this.simPlayers) p.isControlled = false
        target.isControlled = true
        this.controlledPlayerId = target.id
        return
      }
    }

    // Auto-switch to outfield player closest to the ball
    let bestPlayer: SimPlayer | null = null
    let minDist = Infinity

    for (const p of homePlayers) {
      if (p.role === 'goalkeeper') continue
      const dist = vec3.distance(p.position, this.ballPhysics.getPosition())
      if (dist < minDist) {
        minDist = dist
        bestPlayer = p
      }
    }

    if (bestPlayer) {
      for (const p of this.simPlayers) p.isControlled = false
      bestPlayer.isControlled = true
      this.controlledPlayerId = bestPlayer.id
    }
  }

  public getBall(): SimBall {
    const ballPos = this.ballPhysics.getPosition()
    const ballVel = this.ballPhysics.getVelocity()
    const holder = this.simPlayers.find((p) => p.hasBall)

    return {
      position: ballPos,
      velocity: ballVel,
      spin: this.ballPhysics.spin,
      possessionPlayerId: holder ? holder.id : null,
      lastTouchedTeam: this.lastTouchedTeam,
      lastTouchedPlayerId: this.lastTouchedPlayerId,
      isInPlay: true,
    }
  }

  public startChargingShot(): void {
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId)
    if (!controlled) return

    const distToBall = vec3.distance(controlled.position, this.ballPhysics.getPosition())
    if (!controlled.hasBall && distToBall > 2.4) return

    this.isChargingShot = true
    this.shotChargeTime = 0
    this.currentShotPower = 20
    this.callbacks.onShotCharge?.(0.2)
  }

  public updateShotCharge(dt: number): void {
    if (!this.isChargingShot) return
    this.shotChargeTime += dt
    // 0.6s to reach 100%
    this.currentShotPower = clamp(Math.round(20 + (this.shotChargeTime / 0.55) * 80), 20, 100)
    this.callbacks.onShotCharge?.(this.currentShotPower / 100)
  }

  public releaseShot(aimAngle?: number): void {
    if (!this.isChargingShot) {
      this.performShot(75, aimAngle)
      return
    }

    const power = this.currentShotPower
    this.isChargingShot = false
    this.shotChargeTime = 0
    this.currentShotPower = 0
    this.callbacks.onShotCharge?.(0)

    this.performShot(power, aimAngle)
  }

  public performPass(isThrough: boolean = false, isLofted: boolean = false, aimAngle?: number): void {
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId)
    if (!controlled) return

    const distToBall = vec3.distance(controlled.position, this.ballPhysics.getPosition())
    // Allow pass if player has ball OR is within 2.2m of ball (First-time pass)
    if (!controlled.hasBall && distToBall > 2.2) return

    const teammates = this.simPlayers.filter((p) => p.teamIndex === 0)
    const opponents = this.simPlayers.filter((p) => p.teamIndex === 1)

    const effectiveAngle = aimAngle !== undefined ? aimAngle : controlled.rotation

    const target = this.passingSystem.selectTarget(
      controlled,
      teammates,
      effectiveAngle,
      opponents
    )

    // Clear possession
    for (const p of this.simPlayers) p.hasBall = false
    this.lastTouchedTeam = 0
    this.lastTouchedPlayerId = controlled.id

    if (this.currentSetPiece) {
      this.currentSetPiece = null
      this.stateMachine.transition('PLAYING')
      this.callbacks.onPhaseChange?.('PLAYING')
    }

    if (target) {
      // Check offside position at moment of pass
      const isOffside = this.referee.checkOffside(controlled, target, opponents, 0)
      if (isOffside) {
        this.pendingOffsideTargetId = target.id
        this.pendingOffsideTeam = 0
      } else {
        this.pendingOffsideTargetId = null
      }

      if (isLofted) {
        const { velocity, loft } = this.passingSystem.computeLoftedPass(
          controlled.position,
          target.position,
          controlled.playerData.attributes.crossing
        )
        this.ballPhysics.kick(velocity, 75, loft)
      } else if (isThrough) {
        const velocity = this.passingSystem.computeThroughBall(
          controlled.position,
          target,
          controlled.playerData.attributes.vision
        )
        this.ballPhysics.kick(velocity, 82, 0.05)
      } else {
        const velocity = this.passingSystem.computeGroundPass(
          controlled.position,
          target.position,
          1.0,
          controlled.playerData.attributes.shortPassing
        )
        this.ballPhysics.kick(velocity, 78, 0.02)
      }

      this.switchControlledPlayer(target.id)
    } else {
      // Direct kick in aim direction if no teammate is found
      const kickDir = { x: Math.sin(effectiveAngle), y: 0.05, z: Math.cos(effectiveAngle) }
      this.ballPhysics.kick(kickDir, 75, 0.05)
    }
  }

  public performPassToTeammate(targetPlayerId: string): void {
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId)
    if (!controlled) return

    const distToBall = vec3.distance(controlled.position, this.ballPhysics.getPosition())
    if (!controlled.hasBall && distToBall > 2.4) {
      // Simply switch control to that teammate if ball is not in range
      this.switchControlledPlayer(targetPlayerId)
      return
    }

    const target = this.simPlayers.find((p) => p.id === targetPlayerId && p.teamIndex === 0)
    if (!target) return

    for (const p of this.simPlayers) p.hasBall = false
    this.lastTouchedTeam = 0
    this.lastTouchedPlayerId = controlled.id

    const opponents = this.simPlayers.filter((p) => p.teamIndex === 1)
    const isOffside = this.referee.checkOffside(controlled, target, opponents, 0)
    if (isOffside) {
      this.pendingOffsideTargetId = target.id
      this.pendingOffsideTeam = 0
    } else {
      this.pendingOffsideTargetId = null
    }

    const velocity = this.passingSystem.computeGroundPass(
      controlled.position,
      target.position,
      1.0,
      controlled.playerData.attributes.shortPassing
    )
    this.ballPhysics.kick(velocity, 80, 0.04)
    this.switchControlledPlayer(target.id)
  }

  public performShot(power: number = 80, aimAngle?: number): void {
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId)
    if (!controlled) return

    const distToBall = vec3.distance(controlled.position, this.ballPhysics.getPosition())
    // Allow first-time shots if close to ball (< 2.4m)
    if (!controlled.hasBall && distToBall > 2.4) return

    for (const p of this.simPlayers) p.hasBall = false
    this.lastTouchedTeam = 0
    this.lastTouchedPlayerId = controlled.id
    this.pendingOffsideTargetId = null

    if (this.currentSetPiece) {
      this.currentSetPiece = null
      this.stateMachine.transition('PLAYING')
      this.callbacks.onPhaseChange?.('PLAYING')
    }

    const oppGoalCenter: Vec3 = { x: 0, y: 1.2, z: 52.5 }
    const shot = this.shootingSystem.computeShot(
      controlled,
      oppGoalCenter,
      power,
      controlled.playerData.attributes,
      false,
      aimAngle
    )

    // Dynamic loft according to power
    const loft = power < 52 ? 0.04 : power > 82 ? 0.28 : 0.18
    this.ballPhysics.kick(shot.velocity, shot.power, loft, shot.spin)

    this.stats.shots[0] += 1
    if (shot.onTarget) {
      this.stats.shotsOnTarget[0] += 1
    }
    this.callbacks.onStatsUpdate?.(this.stats)
  }

  public performTackle(): void {
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId)
    if (!controlled) return

    const ballPos = this.ballPhysics.getPosition()
    const distToBall = vec3.distance(controlled.position, ballPos)

    // Lunge towards ball
    const toBall = vec3.sub(ballPos, controlled.position)
    if (vec3.length(toBall) > 0.1) {
      const lungeDir = vec3.normalize(toBall)
      controlled.position.x += lungeDir.x * 0.42
      controlled.position.z += lungeDir.z * 0.42
    }

    // Check victim for potential foul
    const opponents = this.simPlayers.filter((p) => p.teamIndex === 1)
    const opponentHolder = opponents.find((p) => p.hasBall)
    const nearestOpp = [...opponents].sort(
      (a, b) => vec3.distance(controlled.position, a.position) - vec3.distance(controlled.position, b.position)
    )[0]
    const victim = opponentHolder || nearestOpp

    if (victim) {
      const foulDecision = this.referee.checkTackle(controlled, victim, distToBall)
      if (foulDecision.type) {
        this.stats.fouls[0] += 1
        if (foulDecision.card === 'yellow') {
          this.stats.yellowCards[0] += 1
          this.eventLog.addEvent('YELLOW_CARD', this.matchClock.getMinute(), this.homeTeam.id, `Yellow card: ${controlled.playerData.name}`)
        }
        this.callbacks.onStatsUpdate?.(this.stats)

        if (foulDecision.type === 'penalty') {
          this.setupSetPiece('PENALTY', 1, foulDecision.position || { x: 0, y: 0.11, z: -41.5 })
        } else {
          this.setupSetPiece('FREE_KICK', 1, foulDecision.position || victim.position)
        }
        return
      }
    }

    // Clean tackle
    if (distToBall < 2.5) {
      for (const p of this.simPlayers) p.hasBall = false
      controlled.hasBall = true
      this.lastTouchedTeam = 0
      this.lastTouchedPlayerId = controlled.id
      this.possessionTracker.setPossession(0)
    }
  }

  public update(dt: number, inputMove: Vec3, isSprinting: boolean): void {
    const clampedDt = Math.min(dt, 0.05)
    const currentPhase = this.stateMachine.getPhase()

    // Countdown announcement timer
    if (this.announcementTimer > 0) {
      this.announcementTimer -= clampedDt
      if (this.announcementTimer <= 0) {
        this.currentAnnouncement = null
        this.callbacks.onAnnouncement?.(null)
      }
    }

    // Countdown set-piece cooldown
    if (this.setPieceCooldown > 0) {
      this.setPieceCooldown -= clampedDt
    }

    // Handle Goal Celebration timer
    if (currentPhase === 'GOAL_CELEBRATION') {
      this.goalCelebrationTimer -= clampedDt
      if (this.goalCelebrationTimer <= 0) {
        this.setupKickOff(this.lastTouchedTeam === 0 ? 1 : 0)
        this.stateMachine.transition('KICK_OFF')
        this.callbacks.onPhaseChange?.('KICK_OFF')
      }
      return
    }

    if (currentPhase === 'PAUSED' || currentPhase === 'HALF_TIME' || currentPhase === 'FULL_TIME') {
      return
    }

    // Handle Set-Piece Phase
    if (currentPhase === 'SET_PIECE' && this.currentSetPiece) {
      this.currentSetPiece.timer -= clampedDt
      // If AI team set piece and timer expired, AI automatically takes it
      if (this.currentSetPiece.teamIndex === 1 && this.currentSetPiece.timer <= 0) {
        if (this.currentSetPiece.type === 'PENALTY') {
          this.executeSetPiece('shot')
        } else if (this.currentSetPiece.type === 'CORNER') {
          this.executeSetPiece('cross')
        } else {
          this.executeSetPiece('pass')
        }
      }
      return
    }

    // Match clock tick
    const prevMinute = this.matchClock.getMinute()
    this.matchClock.tick(clampedDt * 1000)
    const currentMinute = this.matchClock.getMinute()
    if (currentMinute !== prevMinute) {
      this.callbacks.onClockTick?.(currentMinute, this.matchClock.getHalf())
    }

    // Check half-time / full-time
    if (this.matchClock.isHalfOver() && this.matchClock.getHalf() === 1 && currentPhase === 'PLAYING') {
      this.stateMachine.transition('HALF_TIME')
      this.callbacks.onPhaseChange?.('HALF_TIME')
      this.eventLog.addEvent('HALF_TIME', 45, this.homeTeam.id, 'Half Time')
      return
    }

    if (this.matchClock.isMatchOver() && currentPhase === 'PLAYING') {
      this.stateMachine.transition('FULL_TIME')
      this.callbacks.onPhaseChange?.('FULL_TIME')
      this.eventLog.addEvent('FULL_TIME', 90, this.homeTeam.id, 'Full Time')
      return
    }

    // Update shot charging
    if (this.isChargingShot) {
      this.updateShotCharge(clampedDt)
    }

    // Update ball physics
    const prevBallPos = { ...this.ballPhysics.getPosition() }
    this.ballPhysics.update(clampedDt)
    const simBall = this.getBall()

    // 1. Goal detection
    const scoringTeam = this.goalDetector.check(simBall, prevBallPos, Date.now())
    if (scoringTeam !== null) {
      this.score[scoringTeam] += 1
      const scorer = this.simPlayers.find((p) => p.id === this.lastTouchedPlayerId)
      const scoringTeamObj = scoringTeam === 0 ? this.homeTeam : this.awayTeam

      this.eventLog.addEvent(
        'GOAL',
        this.matchClock.getMinute(),
        scoringTeamObj.id,
        `GOAL! ${scorer ? scorer.playerData.name : scoringTeamObj.name} scores!`,
        scorer?.id
      )

      this.showAnnouncement('GOAL!', `${scorer ? scorer.playerData.name : scoringTeamObj.name} scores!`, 'goal', 3500)
      this.goalCelebrationTimer = 3.5
      this.stateMachine.transition('GOAL_CELEBRATION')
      this.callbacks.onGoal?.(scoringTeam, scorer)
      this.callbacks.onPhaseChange?.('GOAL_CELEBRATION')
      return
    }

    // 2. Ball out-of-bounds detection (Throw-in, Corner, Goal Kick)
    if (currentPhase === 'PLAYING' && this.setPieceCooldown <= 0) {
      const outDecision = this.referee.checkBallOut(simBall, prevBallPos, this.lastTouchedTeam)
      if (outDecision.type && outDecision.teamIndex !== null && outDecision.position) {
        if (outDecision.type === 'throw_in') {
          this.setupSetPiece('THROW_IN', outDecision.teamIndex, outDecision.position)
          return
        } else if (outDecision.type === 'corner') {
          this.setupSetPiece('CORNER', outDecision.teamIndex, outDecision.position)
          return
        } else if (outDecision.type === 'goal_kick') {
          this.setupSetPiece('GOAL_KICK', outDecision.teamIndex, outDecision.position)
          return
        }
      }
    }

    // 3. Defender Shot Blocking & Goalkeeper Saves
    const ballSpeed = vec3.length(this.ballPhysics.velocity)
    if (ballSpeed > 13.0) {
      const isTowardAwayGoal = this.ballPhysics.velocity.z > 8.0
      const isTowardHomeGoal = this.ballPhysics.velocity.z < -8.0

      if (isTowardAwayGoal || isTowardHomeGoal) {
        const defendingTeamIndex: 0 | 1 = isTowardAwayGoal ? 1 : 0
        const defenders = this.simPlayers.filter((p) => p.teamIndex === defendingTeamIndex && p.role !== 'goalkeeper')
        const gk = this.simPlayers.find((p) => p.teamIndex === defendingTeamIndex && p.role === 'goalkeeper')
        const currentBallPos = this.ballPhysics.getPosition()

        // Defender block check
        if (currentBallPos.y < 1.6) {
          for (const def of defenders) {
            const dist = vec3.distance(def.position, currentBallPos)
            if (dist < 1.1) {
              const blockChance = def.playerData.attributes.defending / 120
              if (Math.random() < blockChance) {
                this.ballPhysics.velocity.x = (Math.random() - 0.5) * 8
                this.ballPhysics.velocity.y = 2.5 + Math.random() * 2.5
                this.ballPhysics.velocity.z = -this.ballPhysics.velocity.z * 0.35
                this.lastTouchedTeam = defendingTeamIndex
                this.lastTouchedPlayerId = def.id
                this.showAnnouncement('SHOT BLOCKED!', `${def.playerData.name} blocks!`, 'info', 1800)
                break
              }
            }
          }
        }

        // Goalkeeper save check
        if (gk && Math.abs(currentBallPos.z - (defendingTeamIndex === 0 ? -52.5 : 52.5)) < 5.0) {
          const distToGk = vec3.distance(gk.position, currentBallPos)
          const saveReach = 1.9 + (gk.playerData.attributes.gkReflexes - 70) * 0.02
          if (distToGk < saveReach && this.ballPhysics.velocity.y < 2.6) {
            this.stats.saves[defendingTeamIndex] += 1
            this.callbacks.onStatsUpdate?.(this.stats)

            const canCatch = ballSpeed < 20.0 && gk.playerData.attributes.gkHandling > 80
            if (canCatch) {
              for (const p of this.simPlayers) p.hasBall = false
              gk.hasBall = true
              this.ballPhysics.velocity = { x: 0, y: 0, z: 0 }
              this.lastTouchedTeam = defendingTeamIndex
              this.lastTouchedPlayerId = gk.id
              this.possessionTracker.setPossession(defendingTeamIndex)
              this.showAnnouncement('GREAT CATCH!', `${gk.playerData.name} holds on!`, 'save', 2000)
            } else {
              this.ballPhysics.velocity.x = (currentBallPos.x > 0 ? 1 : -1) * (6 + Math.random() * 4)
              this.ballPhysics.velocity.y = 1.8 + Math.random() * 2.0
              this.ballPhysics.velocity.z = (defendingTeamIndex === 0 ? 1 : -1) * (4 + Math.random() * 4)
              this.lastTouchedTeam = defendingTeamIndex
              this.lastTouchedPlayerId = gk.id
              this.showAnnouncement('WHAT A SAVE!', `${gk.playerData.name} tips it wide!`, 'save', 2000)
            }
          }
        }
      }
    }

    // Possession & Outfield player updates
    const homePlayers = this.simPlayers.filter((p) => p.teamIndex === 0)
    const awayPlayers = this.simPlayers.filter((p) => p.teamIndex === 1)

    const homeHasPossession = homePlayers.some((p) => p.hasBall)
    const awayHasPossession = awayPlayers.some((p) => p.hasBall)

    if (homeHasPossession) this.possessionTracker.setPossession(0)
    else if (awayHasPossession) this.possessionTracker.setPossession(1)
    this.possessionTracker.update(clampedDt * 1000)
    this.stats.possession = this.possessionTracker.getPossession()

    // AI Team updates
    this.teamAI.updateTeam(
      homePlayers,
      awayPlayers,
      simBall,
      this.homeTeam.tactics,
      Date.now(),
      homeHasPossession
    )

    const awayAIResult = this.teamAI.updateTeam(
      awayPlayers,
      homePlayers,
      simBall,
      this.awayTeam.tactics,
      Date.now(),
      awayHasPossession
    )

    // Execute Away AI kicks (passes / shots)
    if (awayAIResult.aiKick) {
      const ballHolder = awayPlayers.find((p) => p.hasBall)
      if (ballHolder) {
        ballHolder.hasBall = false
        this.lastTouchedTeam = 1
        this.lastTouchedPlayerId = ballHolder.id
        this.ballPhysics.kick(awayAIResult.aiKick.velocity, 78, awayAIResult.aiKick.loft ?? 0.1)
        if (awayAIResult.aiKick.isShot) {
          this.stats.shots[1] += 1
          this.callbacks.onStatsUpdate?.(this.stats)
        }
      }
    }

    // Execute Away AI tackles
    if (awayAIResult.aiTackles && awayAIResult.aiTackles.length > 0) {
      const userControlled = this.simPlayers.find((p) => p.isControlled)
      if (userControlled && userControlled.hasBall) {
        const tackler = awayPlayers.find((p) => awayAIResult.aiTackles.includes(p.id))
        if (tackler) {
          const distToBall = vec3.distance(tackler.position, this.ballPhysics.getPosition())
          const foulDecision = this.referee.checkTackle(tackler, userControlled, distToBall)
          if (foulDecision.type) {
            this.stats.fouls[1] += 1
            if (foulDecision.card === 'yellow') this.stats.yellowCards[1] += 1
            this.callbacks.onStatsUpdate?.(this.stats)
            if (foulDecision.type === 'penalty') {
              this.setupSetPiece('PENALTY', 0, foulDecision.position || { x: 0, y: 0.11, z: 41.5 })
            } else {
              this.setupSetPiece('FREE_KICK', 0, foulDecision.position || userControlled.position)
            }
            return
          } else if (distToBall < 1.6) {
            // Dispossess user cleanly
            userControlled.hasBall = false
            tackler.hasBall = true
            this.lastTouchedTeam = 1
            this.lastTouchedPlayerId = tackler.id
            this.possessionTracker.setPossession(1)
          }
        }
      }
    }

    // Update each player physics and ball-player interactions
    let currentHolder = this.simPlayers.find((p) => p.hasBall)
    const currentBallPos = this.ballPhysics.getPosition()

    for (const player of this.simPlayers) {
      const phys = this.playerPhysicsMap.get(player.id)
      if (!phys) continue

      if (player.isControlled) {
        // Controlled by user input
        phys.update(clampedDt, inputMove, isSprinting, player.playerData.attributes)
        if (vec3.length(inputMove) > 0.05 && this.kickOffPending) {
          this.kickOffPending = false
          if (this.stateMachine.getPhase() === 'KICK_OFF' || this.stateMachine.getPhase() === 'PRE_MATCH') {
            this.stateMachine.transition('PLAYING')
            this.callbacks.onPhaseChange?.('PLAYING')
          }
        }
      } else {
        // Driven by AI target position
        const toTarget = vec3.sub(player.targetPosition, player.position)
        const moveDir = vec3.length(toTarget) > 0.4 ? vec3.normalize(toTarget) : { x: 0, y: 0, z: 0 }
        phys.update(clampedDt, moveDir, player.isSprinting, player.playerData.attributes)
      }

      // Sync sim state from physics
      player.position = phys.getPosition()
      player.velocity = phys.getVelocity()
      player.rotation = phys.getRotation()
      player.stamina = phys.getStamina()

      // Smooth ball possession acquisition
      if (!currentHolder && currentBallPos.y < 1.6) {
        const distToBall = vec3.distance(player.position, currentBallPos)
        const pickupRadius = player.isControlled ? 1.7 : 1.3
        if (distToBall < pickupRadius) {
          // Offside check upon touching the ball!
          if (this.pendingOffsideTargetId && player.id === this.pendingOffsideTargetId) {
            this.pendingOffsideTargetId = null
            const defendingTeam: 0 | 1 = player.teamIndex === 0 ? 1 : 0
            this.stats.offsides[player.teamIndex] += 1
            this.callbacks.onStatsUpdate?.(this.stats)
            this.showAnnouncement('OFFSIDE!', `${player.playerData.name} was offside`, 'offside', 2200)
            this.eventLog.addEvent('OFFSIDE', this.matchClock.getMinute(), player.teamIndex === 0 ? this.homeTeam.id : this.awayTeam.id, `${player.playerData.name} caught offside`)
            this.setupSetPiece('FREE_KICK', defendingTeam, player.position)
            return
          }

          if (this.pendingOffsideTeam !== null && player.teamIndex !== this.pendingOffsideTeam) {
            // Defending player touched ball -> offside play ends
            this.pendingOffsideTargetId = null
          }

          player.hasBall = true
          currentHolder = player
          this.lastTouchedTeam = player.teamIndex
          this.lastTouchedPlayerId = player.id
          this.possessionTracker.setPossession(player.teamIndex)
        }
      }
    }

    // If a player has ball possession, lock ball right at player's feet
    if (currentHolder) {
      const facingAngle = currentHolder.rotation
      const dribbleDist = 0.52
      const ballTargetX = currentHolder.position.x + Math.sin(facingAngle) * dribbleDist
      const ballTargetZ = currentHolder.position.z + Math.cos(facingAngle) * dribbleDist

      this.ballPhysics.setPosition({ x: ballTargetX, y: 0.11, z: ballTargetZ })
      this.ballPhysics.velocity = { ...currentHolder.velocity }
    }

    // Calculate intended pass target for visual feedback
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId)
    if (controlled && (controlled.hasBall || vec3.distance(controlled.position, currentBallPos) < 2.5)) {
      const teammates = this.simPlayers.filter((p) => p.teamIndex === 0)
      const opponents = this.simPlayers.filter((p) => p.teamIndex === 1)
      const bestTarget = this.passingSystem.selectTarget(controlled, teammates, controlled.rotation, opponents)
      this.intendedPassTargetId = bestTarget ? bestTarget.id : null
    } else {
      this.intendedPassTargetId = null
    }
  }

  public resumeSecondHalf(): void {
    this.matchClock.startSecondHalf()
    this.setupKickOff(1)
    this.stateMachine.transition('KICK_OFF')
    this.callbacks.onPhaseChange?.('KICK_OFF')
  }

  public reset(): void {
    this.score = [0, 0]
    this.currentSetPiece = null
    this.currentAnnouncement = null
    this.pendingOffsideTargetId = null
    this.isChargingShot = false
    this.shotChargeTime = 0
    this.currentShotPower = 0
    this.matchClock.reset()
    this.stateMachine.reset()
    this.initPlayers()
    this.setupKickOff(0)
  }
}
