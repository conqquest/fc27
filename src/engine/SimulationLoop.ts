import type { Team, SimPlayer, SimBall, PlayerRole, Vec3, MatchStats, MatchPhase } from '../data/types'
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
  private kickOffPending: boolean = true
  private goalCelebrationTimer: number = 0

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

  public setupKickOff(kickingTeam: 0 | 1): void {
    const homeAnchors = this.teamAI.getFormationAnchors(this.homeTeam.tactics.formation, 0)
    const awayAnchors = this.teamAI.getFormationAnchors(this.awayTeam.tactics.formation, 1)

    // Reset ball to center spot
    this.ballPhysics.setPosition({ x: 0, y: 0.11, z: 0 })

    // Position Home players
    for (let i = 0; i < 11; i++) {
      const p = this.simPlayers[i]
      const phys = this.playerPhysicsMap.get(p.id)
      const anchor = homeAnchors[i] || { x: 0, y: 0, z: -20 }
      // Clamp to own half for kick-off
      const pos = { x: anchor.x, y: 0, z: Math.min(-1.0, anchor.z) }
      if (kickingTeam === 0 && i === 9) {
        // Striker at ball
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
      // Clamp to own half for kick-off
      const pos = { x: anchor.x, y: 0, z: Math.max(1.0, anchor.z) }
      if (kickingTeam === 1 && i === 9) {
        // Striker at ball
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
      // Don't switch to goalkeeper automatically
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

  public performPass(isThrough: boolean = false, isLofted: boolean = false): void {
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId)
    if (!controlled || !controlled.hasBall) return

    const teammates = this.simPlayers.filter((p) => p.teamIndex === 0)
    const opponents = this.simPlayers.filter((p) => p.teamIndex === 1)

    const target = this.passingSystem.selectTarget(
      controlled,
      teammates,
      controlled.rotation,
      opponents
    )

    if (!target) return

    controlled.hasBall = false
    this.lastTouchedTeam = 0
    this.lastTouchedPlayerId = controlled.id

    if (isLofted) {
      const { velocity, loft } = this.passingSystem.computeLoftedPass(
        controlled.position,
        target.position,
        controlled.playerData.attributes.crossing
      )
      this.ballPhysics.kick(velocity, 70, loft)
    } else if (isThrough) {
      const velocity = this.passingSystem.computeThroughBall(
        controlled.position,
        target,
        controlled.playerData.attributes.vision
      )
      this.ballPhysics.kick(velocity, 80, 0.05)
    } else {
      const velocity = this.passingSystem.computeGroundPass(
        controlled.position,
        target.position,
        1.0,
        controlled.playerData.attributes.shortPassing
      )
      this.ballPhysics.kick(velocity, 75, 0.02)
    }

    // Automatically prepare switch to pass receiver
    this.switchControlledPlayer(target.id)
  }

  public performShot(power: number = 75): void {
    const controlled = this.simPlayers.find((p) => p.id === this.controlledPlayerId)
    if (!controlled || !controlled.hasBall) return

    controlled.hasBall = false
    this.lastTouchedTeam = 0
    this.lastTouchedPlayerId = controlled.id

    const oppGoalCenter: Vec3 = { x: 0, y: 1.2, z: 52.5 }
    const shot = this.shootingSystem.computeShot(
      controlled,
      oppGoalCenter,
      power,
      controlled.playerData.attributes
    )

    this.ballPhysics.kick(shot.velocity, shot.power, 0.25, shot.spin)

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

    if (distToBall < 1.3) {
      // Dispossess current holder
      const currentHolder = this.simPlayers.find((p) => p.hasBall)
      if (currentHolder) {
        currentHolder.hasBall = false
      }

      // Claim ball
      controlled.hasBall = true
      this.lastTouchedTeam = 0
      this.lastTouchedPlayerId = controlled.id
      this.possessionTracker.setPossession(0)
    }
  }

  public update(dt: number, inputMove: Vec3, isSprinting: boolean): void {
    const clampedDt = Math.min(dt, 0.05)
    const currentPhase = this.stateMachine.getPhase()

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

    // Update ball physics
    const prevBallPos = this.ballPhysics.getPosition()
    this.ballPhysics.update(clampedDt)
    const currentBallPos = this.ballPhysics.getPosition()

    // Check goal detection
    const scoringTeam = this.goalDetector.check(this.getBall(), prevBallPos, Date.now())
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

      this.goalCelebrationTimer = 3.5
      this.stateMachine.transition('GOAL_CELEBRATION')
      this.callbacks.onGoal?.(scoringTeam, scorer)
      this.callbacks.onPhaseChange?.('GOAL_CELEBRATION')
      return
    }

    // Possession & Outfield player updates
    const homePlayers = this.simPlayers.filter((p) => p.teamIndex === 0)
    const awayPlayers = this.simPlayers.filter((p) => p.teamIndex === 1)
    const simBall = this.getBall()

    const homeHasPossession = homePlayers.some((p) => p.hasBall)
    const awayHasPossession = awayPlayers.some((p) => p.hasBall)

    if (homeHasPossession) this.possessionTracker.setPossession(0)
    else if (awayHasPossession) this.possessionTracker.setPossession(1)
    this.possessionTracker.update(clampedDt * 1000)
    this.stats.possession = this.possessionTracker.getPossession()

    // AI Team updates
    const homeAIResult = this.teamAI.updateTeam(
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

    // Update each player physics and ball-player interactions
    let currentHolder = this.simPlayers.find((p) => p.hasBall)

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

      // Ball possession acquisition if ball is loose
      if (!currentHolder && this.ballPhysics.isGrounded()) {
        const distToBall = vec3.distance(player.position, this.ballPhysics.getPosition())
        if (distToBall < 0.7) {
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
      const dribbleDist = 0.45
      const ballTargetX = currentHolder.position.x + Math.sin(facingAngle) * dribbleDist
      const ballTargetZ = currentHolder.position.z + Math.cos(facingAngle) * dribbleDist

      this.ballPhysics.setPosition({ x: ballTargetX, y: 0.11, z: ballTargetZ })
      this.ballPhysics.velocity = { ...currentHolder.velocity }
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
    this.matchClock.reset()
    this.stateMachine.reset()
    this.initPlayers()
    this.setupKickOff(0)
  }
}
