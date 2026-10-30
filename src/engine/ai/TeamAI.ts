import type { SimPlayer, SimBall, Tactics, Vec3 } from '../../data/types'
import { FORMATIONS } from '../../data/formations'
import { PlayerAI } from './PlayerAI'
import { GoalkeeperAI } from './GoalkeeperAI'
import { PassingSystem } from '../possession/PassingSystem'
import { ShootingSystem } from '../possession/ShootingSystem'
import { resolveDifficulty, type AIDifficultyConfig, type AIDifficultyLevel } from './AIDifficulty'
import { vec3, clamp } from '../../utils/math'

export interface TeamAIResult {
  aiKick?: {
    velocity: Vec3
    loft?: number
    isShot?: boolean
    isCross?: boolean
    isThrough?: boolean
  }
  aiTackles: string[] // Player IDs attempting tackle
}

export class TeamAI {
  private playerAI = new PlayerAI()
  private gkAI = new GoalkeeperAI()
  private passingSystem = new PassingSystem()
  private shootingSystem = new ShootingSystem()

  private lastActionTimes: Record<string, number> = {}

  public getFormationAnchors(formationName: string, teamIndex: 0 | 1): Vec3[] {
    const formation = FORMATIONS[formationName as keyof typeof FORMATIONS] || FORMATIONS['4-3-3']
    const isTeam0 = teamIndex === 0

    return formation.positions.map((pos) => {
      const scaleX = 30
      const scaleZ = 46

      if (isTeam0) {
        return {
          x: pos.defaultX * scaleX,
          y: 0,
          z: pos.defaultZ * scaleZ,
        }
      } else {
        return {
          x: -pos.defaultX * scaleX,
          y: 0,
          z: -pos.defaultZ * scaleZ,
        }
      }
    })
  }

  public updateTeam(
    teamPlayers: SimPlayer[],
    allOpponents: SimPlayer[],
    ball: SimBall,
    tactics: Tactics,
    currentTimeMs: number,
    isTeamPossession: boolean,
    difficultyParam: string | AIDifficultyConfig = 'medium',
    isTeammatePressureActive: boolean = false
  ): TeamAIResult {
    const difficulty: AIDifficultyConfig =
      typeof difficultyParam === 'string'
        ? resolveDifficulty(difficultyParam)
        : difficultyParam

    const teamIndex = teamPlayers[0]?.teamIndex ?? 0
    const formationAnchors = this.getFormationAnchors(tactics.formation, teamIndex)
    const isTeam0 = teamIndex === 0
    const oppGoalZ = isTeam0 ? 52.5 : -52.5

    // 1. Find the closest outfield player to the ball
    let closestPlayer: SimPlayer | null = null
    let minBallDist = Infinity

    for (const p of teamPlayers) {
      if (!p.isOnPitch || p.role === 'goalkeeper') continue
      const d = vec3.distance(p.position, ball.position)
      if (d < minBallDist) {
        minBallDist = d
        closestPlayer = p
      }
    }

    // 2. Identify pressing teammate if user requested teammate secondary pressure (Q key)
    let pressingTeammateId: string | null = null
    if (isTeammatePressureActive && !isTeamPossession) {
      // Find closest non-controlled teammate to press
      let minPressDist = Infinity
      for (const p of teamPlayers) {
        if (!p.isOnPitch || p.role === 'goalkeeper' || p.isControlled) continue
        const d = vec3.distance(p.position, ball.position)
        if (d < minPressDist) {
          minPressDist = d
          pressingTeammateId = p.id
        }
      }
    }

    const aiTackles: string[] = []
    let aiKick: TeamAIResult['aiKick']

    for (let i = 0; i < teamPlayers.length; i++) {
      const player = teamPlayers[i]
      if (!player.isOnPitch) continue

      // Controlled player movements are driven by user input
      if (player.isControlled) continue

      const isGK = player.role === 'goalkeeper'
      const anchor = formationAnchors[i] || { x: 0, y: 0, z: 0 }

      if (isGK) {
        player.aiState = 'GOALKEEPER'
        const gkDecision = this.gkAI.update(player, ball, 0.016, teamPlayers)
        player.targetPosition = gkDecision.targetPos
        player.isSprinting = gkDecision.isRushingOut
        if (gkDecision.aiDistributionKick) {
          aiKick = {
            velocity: gkDecision.aiDistributionKick.velocity,
            loft: gkDecision.aiDistributionKick.loft,
            isShot: false,
          }
        }
        continue
      }

      // Outfield player target and behavior update
      const isClosest = player.id === closestPlayer?.id
      const isTeammatePressureTarget = player.id === pressingTeammateId
      player.isPressingTeammate = isTeammatePressureTarget

      const aiDecision = this.playerAI.computeTarget(
        player,
        ball,
        teamPlayers,
        allOpponents,
        tactics,
        anchor,
        isTeamPossession,
        isClosest,
        isTeammatePressureTarget,
        difficulty
      )

      player.targetPosition = aiDecision.targetPosition
      player.isSprinting = aiDecision.isSprinting
      player.aiState = aiDecision.aiState
      player.markedOpponentId = aiDecision.markedOpponentId || null

      // ─── 3. Outfield AI Decisions When Carrying the Ball ───
      if (player.hasBall && !player.isControlled) {
        const lastAction = this.lastActionTimes[player.id] || 0
        const reactionDelay = difficulty.reactionDelayMs

        if (currentTimeMs - lastAction > reactionDelay) {
          const oppGoalCenter: Vec3 = { x: 0, y: 1.2, z: oppGoalZ }
          const distToGoal = Math.abs(player.position.z - oppGoalZ)
          const angleToGoal = Math.atan2(Math.abs(player.position.x), distToGoal)

          // Count immediate pressure around the ball carrier
          const nearbyDefenders = allOpponents.filter(
            (o) => o.isOnPitch && o.role !== 'goalkeeper' && vec3.distance(player.position, o.position) < 3.2
          )

          // Option A: Shoot if in prime scoring position
          const inShootingRange = distToGoal < (player.role === 'attacker' ? 26.0 : 22.0)
          const hasShootingAngle = angleToGoal < 0.85

          if (inShootingRange && hasShootingAngle) {
            // Pick a corner based on player position and goalkeeper position
            const targetX = player.position.x > 0 ? -2.2 : 2.2
            const targetCorner: Vec3 = { x: targetX, y: 1.4, z: oppGoalZ }
            const shot = this.shootingSystem.computeShot(
              player,
              targetCorner,
              Math.min(95, 75 + Math.round(difficulty.shotPrecision * 20)),
              player.playerData.attributes
            )

            player.aiState = 'SHOOTING'
            aiKick = { velocity: shot.velocity, isShot: true }
            this.lastActionTimes[player.id] = currentTimeMs
          }
          // Option B: Cross from wide areas in final third
          else if (Math.abs(player.position.x) > 17.5 && distToGoal < 28.0) {
            const centralRunners = teamPlayers.filter(
              (t) => t.isOnPitch && t.id !== player.id && Math.abs(t.position.x) < 14 && Math.abs(t.position.z - oppGoalZ) < 18
            )

            if (centralRunners.length > 0) {
              const targetRunner = centralRunners[0]
              const crossResult = this.passingSystem.computeLoftedPass(
                player.position,
                targetRunner.position,
                player.playerData.attributes.crossing
              )

              player.aiState = 'CROSSING'
              aiKick = { velocity: crossResult.velocity, loft: 0.28, isCross: true }
              this.lastActionTimes[player.id] = currentTimeMs
            }
          }
          // Option C: Through-ball to running striker
          else {
            const forwardRunners = teamPlayers.filter(
              (t) => t.isOnPitch && t.id !== player.id && t.aiState === 'MAKING_FORWARD_RUN'
            )

            if (
              forwardRunners.length > 0 &&
              Math.random() < difficulty.throughBallLikelihood
            ) {
              const runner = forwardRunners[0]
              const throughVel = this.passingSystem.computeThroughBall(
                player.position,
                runner,
                player.playerData.attributes.vision
              )

              player.aiState = 'THROUGH_BALL'
              aiKick = { velocity: throughVel, loft: 0.04, isThrough: true }
              this.lastActionTimes[player.id] = currentTimeMs
            }
            // Option D: Under heavy pressure -> pass backward or sideways to reset
            else if (nearbyDefenders.length >= 2) {
              const safeBackOptions = teamPlayers.filter(
                (t) => t.isOnPitch && t.id !== player.id && (isTeam0 ? t.position.z < player.position.z : t.position.z > player.position.z)
              )

              if (safeBackOptions.length > 0) {
                const backTarget = safeBackOptions[0]
                const passVel = this.passingSystem.computeGroundPass(
                  player.position,
                  backTarget.position,
                  1.0,
                  player.playerData.attributes.shortPassing
                )

                player.aiState = 'PASSING'
                aiKick = { velocity: passVel, isShot: false }
                this.lastActionTimes[player.id] = currentTimeMs
              }
            }
            // Option E: Standard ground pass to open teammate
            else {
              const passTarget = this.passingSystem.selectTarget(
                player,
                teamPlayers,
                isTeam0 ? 0 : Math.PI,
                allOpponents
              )

              if (passTarget && Math.random() < difficulty.passAccuracy) {
                const passVel = this.passingSystem.computeGroundPass(
                  player.position,
                  passTarget.position,
                  1.0,
                  player.playerData.attributes.shortPassing
                )

                player.aiState = 'PASSING'
                aiKick = { velocity: passVel, isShot: false }
                this.lastActionTimes[player.id] = currentTimeMs
              }
            }
          }
        }
      }

      // ─── 4. Defensive Tackle Attempts ───
      if (!isTeamPossession && (isClosest || isTeammatePressureTarget)) {
        const ballHolder = allOpponents.find((o) => o.hasBall && o.isOnPitch)
        if (ballHolder && this.playerAI.shouldAttemptTackle(player, ballHolder, ball, difficulty)) {
          player.aiState = 'TACKLING'
          aiTackles.push(player.id)
        }
      }
    }

    return { aiKick, aiTackles }
  }
}
