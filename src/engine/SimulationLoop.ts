import type {
  Team,
  SimPlayer,
  SimBall,
  PlayerRole,
  Vec3,
  MatchStats,
  MatchPhase,
  MatchAnnouncement,
  SetPieceState,
  PenaltyShootoutState,
} from '../data/types'
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
import { PlayerSwitchController } from './ai/PlayerSwitchController'
import { MatchEventLog } from './events/MatchEventLog'
import { vec3, clamp } from '../utils/math'

export interface SimulationCallbacks {
  onPhaseChange?: (phase: MatchPhase) => void
  onGoal?: (scoringTeam: 0 | 1, scorer?: SimPlayer) => void
  onClockTick?: (minute: number, half: 1 | 2 | 3 | 4) => void
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
  public playerSwitchController = new PlayerSwitchController()
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

  // Teammate secondary pressure and difficulty
  public isTeammatePressureActive: boolean = false
  public currentDifficulty: string = 'medium'

  // Shot charging state
  public isChargingShot: boolean = false
  public shotChargeTime: number = 0
  public currentShotPower: number = 0

  // Offside tracking and debug
  public pendingOffsideTargetId: string | null = null
  public pendingOffsideTeam: 0 | 1 | null = null
  public isOffsideLineVisible: boolean = false

  // Rules state tracking
  private lastRestartSource: 'normal' | 'throw_in' | 'corner' | 'goal_kick' = 'normal'
  private isLastTouchSave: boolean = false
  private isLastTouchDeliberatePlay: boolean = false
  private lastDeliberateKickerId: string | null = null

  // Timers and cooldowns
  private announcementTimer: number = 0
  private setPieceCooldown: number = 0
  private goalCelebrationTimer: number = 0
  private kickOffPending: boolean = true
  public lastScoringTeam: 0 | 1 | null = null
  private aiKickOffTimer: number = 1.5

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

  constructor(
    homeTeam: Team,
    awayTeam: Team,
    matchDurationMins = 5,
    callbacks: SimulationCallbacks = {},
    difficulty: string = 'medium'
  ) {
    this.homeTeam = homeTeam
    this.awayTeam = awayTeam
    this.callbacks = callbacks
    this.currentDifficulty = difficulty
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
        yellowCards: 0,
        isRedCarded: false,
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
        yellowCards: 0,
        isRedCarded: false,
      }

      this.simPlayers.push(simP)
      this.playerPhysicsMap.set(simP.id, phys)
    }
  }

  public showAnnouncement(
    title: string,
    subtitle?: string,
    type: MatchAnnouncement['type'] = 'info',
    durationMs: number = 2400,
    card?: 'yellow' | 'red',
    playerName?: string
  ): void {
    const ann: MatchAnnouncement = { title, subtitle, type, durationMs, card, playerName }
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
    this.referee.reset()
    this.lastRestartSource = 'normal'

    // Position Home players
    for (let i = 0; i < 11; i++) {
      const p = this.simPlayers[i]
      if (!p.isOnPitch) continue
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
      if (!p.isOnPitch) continue
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
    type: 'THROW_IN' | 'CORNER' | 'GOAL_KICK' | 'FREE_KICK' | 'PENALTY' | 'DROPPED_BALL',
    teamIndex: 0 | 1,
    position: Vec3,
    isIndirect: boolean = false
  ): void {
    this.setPieceCooldown = 2.0
    this.pendingOffsideTargetId = null
    this.lastRestartSource = type === 'CORNER' ? 'corner' : type === 'THROW_IN' ? 'throw_in' : type === 'GOAL_KICK' ? 'goal_kick' : 'normal'

    // Stop ball at position
    this.ballPhysics.setPosition({ x: position.x, y: 0.11, z: position.z })
    this.ballPhysics.velocity = { x: 0, y: 0, z: 0 }

    // Clear everyone's ball
    for (const p of this.simPlayers) p.hasBall = false

    let taker: SimPlayer
    let setPieceResult: SetPieceState

    if (type === 'FREE_KICK') {
      const res = this.referee.restartManager.setupFreeKick(teamIndex, position, isIndirect, this.simPlayers)
      taker = res.taker
      setPieceResult = res.setPiece
    } else if (type === 'PENALTY') {
      const res = this.referee.restartManager.setupPenalty(teamIndex, this.simPlayers)
      taker = res.taker
      setPieceResult = res.setPiece
    } else if (type === 'THROW_IN') {
      const res = this.referee.restartManager.setupThrowIn(teamIndex, position, this.simPlayers)
      taker = res.taker
      setPieceResult = res.setPiece
    } else if (type === 'CORNER') {
      const res = this.referee.restartManager.setupCorner(teamIndex, position, this.simPlayers)
      taker = res.taker
      setPieceResult = res.setPiece
    } else if (type === 'GOAL_KICK') {
      const res = this.referee.restartManager.setupGoalKick(teamIndex, this.simPlayers)
      taker = res.taker
      setPieceResult = res.setPiece
    } else {
      const res = this.referee.restartManager.setupDroppedBall(teamIndex, position, this.simPlayers)
      taker = res.receiver
      setPieceResult = res.setPiece
    }

    // Teleport all physics bodies to their new positions
    for (const p of this.simPlayers) {
      if (!p.isOnPitch) continue
      const phys = this.playerPhysicsMap.get(p.id)
      phys?.teleport(p.position, p.rotation)
    }

    this.lastTouchedTeam = teamIndex
    this.lastTouchedPlayerId = taker.id
    this.possessionTracker.setPossession(teamIndex)

    if (teamIndex === 0) {
      this.switchControlledPlayer(taker.id)
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
      this.showAnnouncement(isIndirect ? 'INDIRECT FREE KICK' : 'DIRECT FREE KICK', teamName, 'foul')
    } else if (type === 'PENALTY') {
      this.showAnnouncement('PENALTY KICK!', teamName, 'penalty')
      this.eventLog.addEvent('PENALTY', this.matchClock.getMinute(), teamIndex === 0 ? this.homeTeam.id : this.awayTeam.id, `Penalty awarded to ${teamName}`)
    } else if (type === 'DROPPED_BALL') {
      this.showAnnouncement('DROPPED BALL', 'Play restarted by referee', 'info')
    }

    this.currentSetPiece = setPieceResult
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

  public handleCard(player: SimPlayer, card: 'yellow' | 'red', reason: string): void {
    const cardResult = this.referee.issueCard(player, card, reason, this.matchClock.getMinute())
    const teamObj = player.teamIndex === 0 ? this.homeTeam : this.awayTeam

    if (cardResult.cardType === 'yellow') {
      this.stats.yellowCards[player.teamIndex]++
      this.eventLog.addEvent('YELLOW_CARD', this.matchClock.getMinute(), teamObj.id, `Yellow card: ${player.playerData.name} (${reason})`, player.id)
      this.showAnnouncement('YELLOW CARD', `${player.playerData.name} (${teamObj.shortName})`, 'card', 2600, 'yellow', player.playerData.name)
    } else if (cardResult.cardType === 'second_yellow_red') {
      this.stats.yellowCards[player.teamIndex]++
      this.stats.redCards[player.teamIndex]++
      this.eventLog.addEvent('YELLOW_CARD', this.matchClock.getMinute(), teamObj.id, `Second yellow: ${player.playerData.name}`, player.id)
      this.eventLog.addEvent('RED_CARD', this.matchClock.getMinute(), teamObj.id, `Red card: ${player.playerData.name} sent off`, player.id)
      this.showAnnouncement('SECOND YELLOW & RED!', `${player.playerData.name} sent off!`, 'card', 3200, 'red', player.playerData.name)
    } else {
      this.stats.redCards[player.teamIndex]++
      this.eventLog.addEvent('RED_CARD', this.matchClock.getMinute(), teamObj.id, `Red card: ${player.playerData.name} (${reason})`, player.id)
      this.showAnnouncement('RED CARD!', `${player.playerData.name} sent off!`, 'card', 3200, 'red', player.playerData.name)
    }

    if (cardResult.isExpelled) {
      if (player.id === this.controlledPlayerId) {
        this.switchControlledPlayer()
      }
    }
    this.callbacks.onStatsUpdate?.(this.stats)
  }

  public setTeammatePressure(active: boolean): void {
    this.isTeammatePressureActive = active
  }

  public setDifficulty(difficulty: string): void {
    this.currentDifficulty = difficulty
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

    // Intelligent tactical defender selection
    const simBall = this.getBall()
    const bestPlayer = this.playerSwitchController.selectBestDefender(
      homePlayers,
      simBall,
      this.controlledPlayerId,
      -52.5
    )

    if (bestPlayer) {
      for (const p of this.simPlayers) p.isControlled = false
      bestPlayer.isControlled = true
      this.controlledPlayerId = bestPlayer.id
    }
  }

  public getBall(): SimBall {
    const ballPos = this.ballPhysics.getPosition()
    const ballVel = this.ballPhysics.getVelocity()
    const holder = this.simPlayers.find((p) => p.hasBall && p.isOnPitch)

    return {
      position: ballPos,
      velocity: ballVel,
      spin: this.ballPhysics.spin,
      possessionPlayerId: holder ? holder.id : null,
      lastTouchedTeam: this.lastTouchedTeam,
      lastTouchedPlayerId: this.lastTouchedPlayerId,
      isInPlay: true,
      lastKickType: this.referee.restartManager.isIndirectActive() ? 'indirect_free_kick' : 'normal',
    }
  }

  public startChargingShot(): void {
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId && p.isOnPitch)
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
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId && p.isOnPitch)
    if (!controlled) return

    const distToBall = vec3.distance(controlled.position, this.ballPhysics.getPosition())
    if (!controlled.hasBall && distToBall > 2.2) return

    // Double touch check on restart
    if (this.referee.restartManager.checkDoubleTouch(controlled)) {
      this.showAnnouncement('DOUBLE TOUCH!', 'Indirect free kick awarded', 'foul', 2200)
      this.setupSetPiece('FREE_KICK', 1, controlled.position, true)
      return
    }

    const teammates = this.simPlayers.filter((p) => p.teamIndex === 0 && p.isOnPitch)
    const opponents = this.simPlayers.filter((p) => p.teamIndex === 1 && p.isOnPitch)
    const effectiveAngle = aimAngle !== undefined ? aimAngle : controlled.rotation

    const target = this.passingSystem.selectTarget(controlled, teammates, effectiveAngle, opponents)

    // Clear possession
    for (const p of this.simPlayers) p.hasBall = false
    this.lastTouchedTeam = 0
    this.lastTouchedPlayerId = controlled.id
    this.lastDeliberateKickerId = controlled.id
    this.isLastTouchDeliberatePlay = true
    this.isLastTouchSave = false

    if (this.currentSetPiece) {
      this.currentSetPiece = null
      this.stateMachine.transition('PLAYING')
      this.callbacks.onPhaseChange?.('PLAYING')
    }

    if (this.stateMachine.getPhase() === 'KICK_OFF' || this.kickOffPending) {
      this.kickOffPending = false
      if (this.stateMachine.canTransitionTo('PLAYING')) {
        this.stateMachine.transition('PLAYING')
        this.callbacks.onPhaseChange?.('PLAYING')
      }
    }

    // IFAB Law 11: Snapshot taken at exact pass moment
    this.referee.offsideEngine.createSnapshot(
      controlled,
      teammates,
      opponents,
      this.ballPhysics.getPosition(),
      Date.now(),
      this.lastRestartSource
    )
    this.lastRestartSource = 'normal'

    if (target) {
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
      const kickDir = { x: Math.sin(effectiveAngle), y: 0.05, z: Math.cos(effectiveAngle) }
      this.ballPhysics.kick(kickDir, 75, 0.05)
    }
  }

  public performPassToTeammate(targetPlayerId: string): void {
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId && p.isOnPitch)
    if (!controlled) return

    const distToBall = vec3.distance(controlled.position, this.ballPhysics.getPosition())
    if (!controlled.hasBall && distToBall > 2.4) {
      this.switchControlledPlayer(targetPlayerId)
      return
    }

    const target = this.simPlayers.find((p) => p.id === targetPlayerId && p.teamIndex === 0 && p.isOnPitch)
    if (!target) return

    if (this.referee.restartManager.checkDoubleTouch(controlled)) {
      this.showAnnouncement('DOUBLE TOUCH!', 'Indirect free kick awarded', 'foul', 2200)
      this.setupSetPiece('FREE_KICK', 1, controlled.position, true)
      return
    }

    for (const p of this.simPlayers) p.hasBall = false
    this.lastTouchedTeam = 0
    this.lastTouchedPlayerId = controlled.id
    this.lastDeliberateKickerId = controlled.id
    this.isLastTouchDeliberatePlay = true
    this.isLastTouchSave = false

    const teammates = this.simPlayers.filter((p) => p.teamIndex === 0 && p.isOnPitch)
    const opponents = this.simPlayers.filter((p) => p.teamIndex === 1 && p.isOnPitch)

    this.referee.offsideEngine.createSnapshot(
      controlled,
      teammates,
      opponents,
      this.ballPhysics.getPosition(),
      Date.now(),
      this.lastRestartSource
    )
    this.lastRestartSource = 'normal'

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
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId && p.isOnPitch)
    if (!controlled) return

    const distToBall = vec3.distance(controlled.position, this.ballPhysics.getPosition())
    if (!controlled.hasBall && distToBall > 2.4) return

    if (this.referee.restartManager.checkDoubleTouch(controlled)) {
      this.showAnnouncement('DOUBLE TOUCH!', 'Indirect free kick awarded', 'foul', 2200)
      this.setupSetPiece('FREE_KICK', 1, controlled.position, true)
      return
    }

    for (const p of this.simPlayers) p.hasBall = false
    this.lastTouchedTeam = 0
    this.lastTouchedPlayerId = controlled.id
    this.lastDeliberateKickerId = controlled.id
    this.isLastTouchDeliberatePlay = true
    this.isLastTouchSave = false

    if (this.currentSetPiece) {
      this.currentSetPiece = null
      this.stateMachine.transition('PLAYING')
      this.callbacks.onPhaseChange?.('PLAYING')
    }

    if (this.stateMachine.getPhase() === 'KICK_OFF' || this.kickOffPending) {
      this.kickOffPending = false
      if (this.stateMachine.canTransitionTo('PLAYING')) {
        this.stateMachine.transition('PLAYING')
        this.callbacks.onPhaseChange?.('PLAYING')
      }
    }

    const teammates = this.simPlayers.filter((p) => p.teamIndex === 0 && p.isOnPitch)
    const opponents = this.simPlayers.filter((p) => p.teamIndex === 1 && p.isOnPitch)
    this.referee.offsideEngine.createSnapshot(
      controlled,
      teammates,
      opponents,
      this.ballPhysics.getPosition(),
      Date.now(),
      this.lastRestartSource
    )
    this.lastRestartSource = 'normal'

    const oppGoalCenter: Vec3 = { x: 0, y: 1.2, z: 52.5 }
    const shot = this.shootingSystem.computeShot(
      controlled,
      oppGoalCenter,
      power,
      controlled.playerData.attributes,
      false,
      aimAngle
    )

    const loft = power < 52 ? 0.04 : power > 82 ? 0.28 : 0.18
    this.ballPhysics.kick(shot.velocity, shot.power, loft, shot.spin)

    this.stats.shots[0] += 1
    if (shot.onTarget) {
      this.stats.shotsOnTarget[0] += 1
    }
    this.callbacks.onStatsUpdate?.(this.stats)
  }

  public performTackle(isSlide: boolean = false): void {
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId && p.isOnPitch)
    if (!controlled) return

    const ballPos = this.ballPhysics.getPosition()
    const distToBall = vec3.distance(controlled.position, ballPos)

    const toBall = vec3.sub(ballPos, controlled.position)
    if (vec3.length(toBall) > 0.1) {
      const lungeDir = vec3.normalize(toBall)
      const lungeDist = isSlide ? 0.75 : 0.38
      controlled.position.x += lungeDir.x * lungeDist
      controlled.position.z += lungeDir.z * lungeDist
    }

    const opponents = this.simPlayers.filter((p) => p.teamIndex === 1 && p.isOnPitch)
    const opponentHolder = opponents.find((p) => p.hasBall)
    const nearestOpp = [...opponents].sort(
      (a, b) => vec3.distance(controlled.position, a.position) - vec3.distance(controlled.position, b.position)
    )[0]
    const victim = opponentHolder || nearestOpp

    if (victim) {
      const foulDecision = this.referee.checkTackle(controlled, victim, distToBall, isSlide)
      if (foulDecision.type) {
        this.stats.fouls[0] += 1

        if (foulDecision.card) {
          this.handleCard(controlled, foulDecision.card, foulDecision.message || 'Tackle infraction')
        }

        if (foulDecision.type === 'penalty') {
          this.setupSetPiece('PENALTY', 1, foulDecision.position || { x: 0, y: 0.11, z: -41.5 })
        } else {
          this.setupSetPiece('FREE_KICK', 1, foulDecision.position || victim.position, foulDecision.isIndirect)
        }
        return
      }
    }

    // Clean tackle
    const reachRadius = isSlide ? 2.8 : 2.2
    if (distToBall < reachRadius) {
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
        this.resumeFromGoal()
      }
      return
    }

    if (currentPhase === 'PAUSED' || currentPhase === 'HALF_TIME' || currentPhase === 'FULL_TIME') {
      return
    }

    // Handle referee advantage window
    const activeAdv = this.referee.foulDetection.getActiveAdvantage()
    if (activeAdv && activeAdv.active) {
      activeAdv.duration -= clampedDt
      const victimTeamHasBall = this.simPlayers.some((p) => p.teamIndex !== activeAdv.foulTeam && p.hasBall && p.isOnPitch)

      if (activeAdv.duration <= 0) {
        // Advantage materialized!
        if (activeAdv.card) {
          const offender = this.simPlayers.find((p) => p.id === activeAdv.offenderId)
          if (offender) this.handleCard(offender, activeAdv.card, activeAdv.foulType)
        }
        this.referee.foulDetection.clearAdvantage()
        if (this.stateMachine.getPhase() === 'ADVANTAGE') {
          this.stateMachine.transition('PLAYING')
          this.callbacks.onPhaseChange?.('PLAYING')
        }
      } else if (!victimTeamHasBall && this.simPlayers.some((p) => p.teamIndex === activeAdv.foulTeam && p.hasBall && p.isOnPitch)) {
        // Advantage failed: call back foul
        this.referee.foulDetection.clearAdvantage()
        const victimTeam: 0 | 1 = activeAdv.foulTeam === 0 ? 1 : 0
        if (activeAdv.card) {
          const offender = this.simPlayers.find((p) => p.id === activeAdv.offenderId)
          if (offender) this.handleCard(offender, activeAdv.card, activeAdv.foulType)
        }
        this.showAnnouncement('FOUL CALLED BACK', 'Advantage did not materialize', 'foul', 2200)
        if (activeAdv.isPenalty) {
          this.setupSetPiece('PENALTY', victimTeam, activeAdv.offencePosition)
        } else {
          this.setupSetPiece('FREE_KICK', victimTeam, activeAdv.offencePosition)
        }
        return
      }
    }

    // Auto-progress kick-off for AI
    if (currentPhase === 'KICK_OFF') {
      const kicker = this.simPlayers.find((p) => p.hasBall && p.isOnPitch)
      if (kicker && kicker.teamIndex === 1) {
        this.aiKickOffTimer -= clampedDt
        if (this.aiKickOffTimer <= 0) {
          this.resumeFromGoal()
        }
      }
    }

    // Handle Set-Piece Phase
    if (currentPhase === 'SET_PIECE' && this.currentSetPiece) {
      this.currentSetPiece.timer -= clampedDt
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
    if (this.matchClock.isHalfOver() && this.matchClock.getHalf() === 1 && (currentPhase === 'PLAYING' || currentPhase === 'ADVANTAGE')) {
      this.stateMachine.transition('HALF_TIME')
      this.callbacks.onPhaseChange?.('HALF_TIME')
      this.eventLog.addEvent('HALF_TIME', 45, this.homeTeam.id, 'Half Time')
      return
    }

    if (this.matchClock.isMatchOver() && (currentPhase === 'PLAYING' || currentPhase === 'ADVANTAGE')) {
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

    // 1. Goal detection with IFAB Law 10 & Law 13/15 rules
    const isIndirectPlay = this.referee.restartManager.isIndirectActive()
    const isThrowInDirect = this.lastRestartSource === 'throw_in' && !this.simPlayers.some((p) => p.hasBall)
    const scoringTeam = this.goalDetector.check(simBall, prevBallPos, Date.now(), isIndirectPlay, isThrowInDirect)

    if (scoringTeam !== null) {
      this.score[scoringTeam] += 1
      this.lastScoringTeam = scoringTeam
      const scorer = this.simPlayers.find((p) => p.id === this.lastTouchedPlayerId && p.isOnPitch)
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

    // 3. Defender Shot Blocking, Handballs & Goalkeeper Saves
    const ballSpeed = vec3.length(this.ballPhysics.velocity)
    if (ballSpeed > 13.0) {
      const isTowardAwayGoal = this.ballPhysics.velocity.z > 8.0
      const isTowardHomeGoal = this.ballPhysics.velocity.z < -8.0

      if (isTowardAwayGoal || isTowardHomeGoal) {
        const defendingTeamIndex: 0 | 1 = isTowardAwayGoal ? 1 : 0
        const defenders = this.simPlayers.filter((p) => p.teamIndex === defendingTeamIndex && p.role !== 'goalkeeper' && p.isOnPitch)
        const gk = this.simPlayers.find((p) => p.teamIndex === defendingTeamIndex && p.role === 'goalkeeper' && p.isOnPitch)
        const currentBallPos = this.ballPhysics.getPosition()

        // Defender block & Handball check
        if (currentBallPos.y < 1.6) {
          for (const def of defenders) {
            const dist = vec3.distance(def.position, currentBallPos)
            if (dist < 1.1) {
              // Check handball rule (unnatural arm block)
              const handball = this.referee.foulDetection.evaluateHandball(def, simBall, Math.random() < 0.12)
              if (handball && handball.isFoul) {
                this.stats.fouls[def.teamIndex]++
                if (handball.card) this.handleCard(def, handball.card, handball.reason)
                this.showAnnouncement('HANDBALL!', handball.reason, 'foul', 2400)
                if (handball.isPenalty) {
                  this.setupSetPiece('PENALTY', defendingTeamIndex === 0 ? 1 : 0, handball.offencePosition)
                } else {
                  this.setupSetPiece('FREE_KICK', defendingTeamIndex === 0 ? 1 : 0, handball.offencePosition)
                }
                return
              }

              // Normal legal block
              const blockChance = def.playerData.attributes.defending / 120
              if (Math.random() < blockChance) {
                this.ballPhysics.velocity.x = (Math.random() - 0.5) * 8
                this.ballPhysics.velocity.y = 2.5 + Math.random() * 2.5
                this.ballPhysics.velocity.z = -this.ballPhysics.velocity.z * 0.35
                this.lastTouchedTeam = defendingTeamIndex
                this.lastTouchedPlayerId = def.id
                this.isLastTouchSave = true
                this.isLastTouchDeliberatePlay = false
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
            this.isLastTouchSave = true
            this.isLastTouchDeliberatePlay = false

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
    const homePlayers = this.simPlayers.filter((p) => p.teamIndex === 0 && p.isOnPitch)
    const awayPlayers = this.simPlayers.filter((p) => p.teamIndex === 1 && p.isOnPitch)

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
      homeHasPossession,
      this.currentDifficulty,
      this.isTeammatePressureActive
    )

    const awayAIResult = this.teamAI.updateTeam(
      awayPlayers,
      homePlayers,
      simBall,
      this.awayTeam.tactics,
      Date.now(),
      awayHasPossession,
      this.currentDifficulty,
      false
    )

    // Execute Away AI kicks (passes / shots)
    if (awayAIResult.aiKick) {
      const ballHolder = awayPlayers.find((p) => p.hasBall)
      if (ballHolder) {
        ballHolder.hasBall = false
        this.lastTouchedTeam = 1
        this.lastTouchedPlayerId = ballHolder.id
        this.lastDeliberateKickerId = ballHolder.id
        this.isLastTouchDeliberatePlay = true
        this.isLastTouchSave = false

        this.referee.offsideEngine.createSnapshot(
          ballHolder,
          awayPlayers,
          homePlayers,
          this.ballPhysics.getPosition(),
          Date.now(),
          this.lastRestartSource
        )
        this.lastRestartSource = 'normal'

        const loft = awayAIResult.aiKick.loft ?? (awayAIResult.aiKick.isShot ? 0.18 : 0.04)
        this.ballPhysics.kick(awayAIResult.aiKick.velocity, 80, loft)
        if (awayAIResult.aiKick.isShot) {
          this.stats.shots[1] += 1
          this.callbacks.onStatsUpdate?.(this.stats)
        }
      }
    }

    // Execute Away AI tackles with full Law 12 evaluation
    if (awayAIResult.aiTackles && awayAIResult.aiTackles.length > 0) {
      const userControlled = this.simPlayers.find((p) => p.isControlled && p.isOnPitch)
      if (userControlled && userControlled.hasBall) {
        const tackler = awayPlayers.find((p) => awayAIResult.aiTackles.includes(p.id))
        if (tackler) {
          const distToBall = vec3.distance(tackler.position, this.ballPhysics.getPosition())
          const foulDecision = this.referee.checkTackle(tackler, userControlled, distToBall, true)
          if (foulDecision.type) {
            this.stats.fouls[1] += 1
            if (foulDecision.card) {
              this.handleCard(tackler, foulDecision.card, foulDecision.message || 'Tackle offence')
            }
            this.callbacks.onStatsUpdate?.(this.stats)
            if (foulDecision.type === 'penalty') {
              this.setupSetPiece('PENALTY', 0, foulDecision.position || { x: 0, y: 0.11, z: 41.5 })
            } else {
              this.setupSetPiece('FREE_KICK', 0, foulDecision.position || userControlled.position)
            }
            return
          } else if (distToBall < 1.6) {
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
    let currentHolder = this.simPlayers.find((p) => p.hasBall && p.isOnPitch)
    const currentBallPos = this.ballPhysics.getPosition()

    for (const player of this.simPlayers) {
      if (!player.isOnPitch) continue

      const phys = this.playerPhysicsMap.get(player.id)
      if (!phys) continue

      if (player.isControlled) {
        phys.update(clampedDt, inputMove, isSprinting, player.playerData.attributes)
        if (vec3.length(inputMove) > 0.05 && this.kickOffPending) {
          this.kickOffPending = false
          if (this.stateMachine.getPhase() === 'KICK_OFF' || this.stateMachine.getPhase() === 'PRE_MATCH') {
            this.stateMachine.transition('PLAYING')
            this.callbacks.onPhaseChange?.('PLAYING')
          }
        }
      } else {
        const toTarget = vec3.sub(player.targetPosition, player.position)
        const moveDir = vec3.length(toTarget) > 0.4 ? vec3.normalize(toTarget) : { x: 0, y: 0, z: 0 }
        phys.update(clampedDt, moveDir, player.isSprinting, player.playerData.attributes)
      }

      player.position = phys.getPosition()
      player.velocity = phys.getVelocity()
      player.rotation = phys.getRotation()
      player.stamina = phys.getStamina()

      // Ball possession acquisition & Rules evaluation
      if (!currentHolder && currentBallPos.y < 1.6) {
        const distToBall = vec3.distance(player.position, currentBallPos)
        const pickupRadius = player.isControlled ? 1.7 : 1.3
        if (distToBall < pickupRadius) {
          // Double-touch restart check
          if (this.referee.restartManager.checkDoubleTouch(player)) {
            const oppTeam: 0 | 1 = player.teamIndex === 0 ? 1 : 0
            this.showAnnouncement('DOUBLE TOUCH!', 'Indirect free kick awarded', 'foul', 2200)
            this.setupSetPiece('FREE_KICK', oppTeam, player.position, true)
            return
          }

          // Offside active involvement check (IFAB Law 11)
          const offsideDecision = this.referee.offsideEngine.evaluateInvolvement(
            player,
            this.isLastTouchDeliberatePlay,
            this.isLastTouchSave
          )
          if (offsideDecision.isOffside) {
            const defendingTeam: 0 | 1 = player.teamIndex === 0 ? 1 : 0
            this.stats.offsides[player.teamIndex] += 1
            this.callbacks.onStatsUpdate?.(this.stats)
            this.showAnnouncement('OFFSIDE!', `${player.playerData.name} was offside`, 'offside', 2200)
            this.eventLog.addEvent('OFFSIDE', this.matchClock.getMinute(), player.teamIndex === 0 ? this.homeTeam.id : this.awayTeam.id, `${player.playerData.name} caught offside`, player.id)
            this.setupSetPiece('FREE_KICK', defendingTeam, offsideDecision.offencePosition || player.position, true)
            return
          }

          // Goalkeeper handling of back-pass check (IFAB Law 12.2)
          if (player.role === 'goalkeeper' && this.lastDeliberateKickerId) {
            const lastKicker = this.simPlayers.find((p) => p.id === this.lastDeliberateKickerId) || null
            const backPassFoul = this.referee.foulDetection.evaluateBackPass(player, lastKicker, true)
            if (backPassFoul && backPassFoul.isFoul) {
              const oppTeam: 0 | 1 = player.teamIndex === 0 ? 1 : 0
              this.stats.fouls[player.teamIndex]++
              this.callbacks.onStatsUpdate?.(this.stats)
              this.showAnnouncement('BACK-PASS INFRACTION!', 'Indirect free kick in box', 'foul', 2400)
              this.setupSetPiece('FREE_KICK', oppTeam, backPassFoul.offencePosition, true)
              return
            }
          }

          // Goalkeeper handling outside box check
          if (player.role === 'goalkeeper') {
            const gkHandlingFoul = this.referee.foulDetection.evaluateHandball(player, simBall, false)
            if (gkHandlingFoul && gkHandlingFoul.isFoul) {
              const oppTeam: 0 | 1 = player.teamIndex === 0 ? 1 : 0
              this.stats.fouls[player.teamIndex]++
              if (gkHandlingFoul.card) this.handleCard(player, gkHandlingFoul.card, gkHandlingFoul.reason)
              this.showAnnouncement('HANDBALL BY KEEPER!', 'Direct free kick outside box', 'foul', 2400)
              this.setupSetPiece('FREE_KICK', oppTeam, gkHandlingFoul.offencePosition, false)
              return
            }
          }

          this.referee.restartManager.registerBallTouch(player.id)
          player.hasBall = true
          currentHolder = player
          this.lastTouchedTeam = player.teamIndex
          this.lastTouchedPlayerId = player.id
          this.possessionTracker.setPossession(player.teamIndex)
        }
      }
    }

    // Lock ball at player's feet
    if (currentHolder) {
      const facingAngle = currentHolder.rotation
      const dribbleDist = 0.52
      const ballTargetX = currentHolder.position.x + Math.sin(facingAngle) * dribbleDist
      const ballTargetZ = currentHolder.position.z + Math.cos(facingAngle) * dribbleDist

      this.ballPhysics.setPosition({ x: ballTargetX, y: 0.11, z: ballTargetZ })
      this.ballPhysics.velocity = { ...currentHolder.velocity }
    }

    // Calculate intended pass target for visual feedback
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId && p.isOnPitch)
    if (controlled && (controlled.hasBall || vec3.distance(controlled.position, currentBallPos) < 2.5)) {
      const teammates = this.simPlayers.filter((p) => p.teamIndex === 0 && p.isOnPitch)
      const opponents = this.simPlayers.filter((p) => p.teamIndex === 1 && p.isOnPitch)
      const bestTarget = this.passingSystem.selectTarget(controlled, teammates, controlled.rotation, opponents)
      this.intendedPassTargetId = bestTarget ? bestTarget.id : null
    } else {
      this.intendedPassTargetId = null
    }
  }

  public resumeFromGoal(): void {
    const curPhase = this.stateMachine.getPhase()
    if (curPhase === 'GOAL_CELEBRATION' || curPhase === 'KICK_OFF' || this.kickOffPending) {
      this.goalCelebrationTimer = 0
      this.currentAnnouncement = null
      this.announcementTimer = 0
      this.callbacks.onAnnouncement?.(null)

      if (curPhase === 'GOAL_CELEBRATION') {
        const kickingTeam: 0 | 1 = this.lastScoringTeam === 0 ? 1 : 0
        this.setupKickOff(kickingTeam)
      }

      this.kickOffPending = false
      if (this.stateMachine.canTransitionTo('PLAYING')) {
        this.stateMachine.transition('PLAYING')
        this.callbacks.onPhaseChange?.('PLAYING')
      }

      const kicker = this.simPlayers.find((p) => p.hasBall && p.isOnPitch)
      if (kicker && kicker.teamIndex === 1) {
        kicker.hasBall = false
        const teammates = this.simPlayers.filter((p) => p.teamIndex === 1 && p.id !== kicker.id && p.position.z > 5 && p.isOnPitch)
        const target = teammates[0] || this.simPlayers[15]
        const toTarget = vec3.sub(target.position, kicker.position)
        const dir = vec3.normalize(toTarget)
        this.ballPhysics.velocity = { x: dir.x * 11, y: 0.1, z: dir.z * 11 }
        this.lastTouchedTeam = 1
        this.lastTouchedPlayerId = kicker.id
        this.possessionTracker.setPossession(1)
      }
    }
  }

  public resumeSecondHalf(): void {
    this.matchClock.startSecondHalf()
    this.setupKickOff(1)
    this.stateMachine.transition('KICK_OFF')
    this.callbacks.onPhaseChange?.('KICK_OFF')
  }

  public startPenaltyShootout(): PenaltyShootoutState {
    const shootout = this.referee.restartManager.startShootout()
    this.stateMachine.transition('PENALTY_SHOOTOUT')
    this.callbacks.onPhaseChange?.('PENALTY_SHOOTOUT')
    this.showAnnouncement('PENALTY SHOOTOUT', 'Match will be decided on penalties', 'penalty', 3000)
    return shootout
  }

  public getOffsideLineZ(): number | null {
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId && p.isOnPitch)
    const attackingTeam: 0 | 1 = controlled?.teamIndex ?? 0
    const defendingTeam: 0 | 1 = attackingTeam === 0 ? 1 : 0
    const defenders = this.simPlayers.filter((p) => p.teamIndex === defendingTeam && p.isOnPitch)
    if (defenders.length < 2) return null
    return this.referee.offsideEngine.getSecondLastDefenderZ(defenders, attackingTeam)
  }

  public reset(): void {
    this.score = [0, 0]
    this.currentSetPiece = null
    this.currentAnnouncement = null
    this.pendingOffsideTargetId = null
    this.isChargingShot = false
    this.shotChargeTime = 0
    this.currentShotPower = 0
    this.lastRestartSource = 'normal'
    this.isLastTouchSave = false
    this.isLastTouchDeliberatePlay = false
    this.lastDeliberateKickerId = null
    this.matchClock.reset()
    this.stateMachine.reset()
    this.referee.reset()
    this.playerSwitchController.reset()
    this.isTeammatePressureActive = false
    this.initPlayers()
    this.setupKickOff(0)
  }
}
