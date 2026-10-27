import type { SimPlayer, SimBall, Tactics, Vec3, Formation } from '../../data/types'
import { FORMATIONS } from '../../data/formations'
import { PlayerAI } from './PlayerAI'
import { GoalkeeperAI } from './GoalkeeperAI'
import { PassingSystem } from '../possession/PassingSystem'
import { ShootingSystem } from '../possession/ShootingSystem'
import { vec3, clamp } from '../../utils/math'

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
      // defaultX is [-1, 1] -> [-30m, +30m]
      // defaultZ is [-1, 1] -> [-48m, +48m]
      const scaleX = 30
      const scaleZ = 46

      if (isTeam0) {
        return {
          x: pos.defaultX * scaleX,
          y: 0,
          z: pos.defaultZ * scaleZ,
        }
      } else {
        // Mirrored for Away team
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
    isTeamPossession: boolean
  ): {
    aiKick?: { velocity: Vec3; loft?: number; isShot?: boolean }
    aiTackles: string[] // player IDs attempting tackle
  } {
    const formationAnchors = this.getFormationAnchors(tactics.formation, teamPlayers[0]?.teamIndex ?? 0)

    // Find outfield player closest to the ball
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

    const aiTackles: string[] = []
    let aiKick: { velocity: Vec3; loft?: number; isShot?: boolean } | undefined

    for (let i = 0; i < teamPlayers.length; i++) {
      const player = teamPlayers[i]
      if (!player.isOnPitch) continue

      // Controlled player movements are driven by user input, so skip AI positioning if controlled
      if (player.isControlled) continue

      const isGK = player.role === 'goalkeeper'
      const anchor = formationAnchors[i] || { x: 0, y: 0, z: 0 }

      if (isGK) {
        const gkDecision = this.gkAI.update(player, ball, 0.016)
        player.targetPosition = gkDecision.targetPos
        player.isSprinting = gkDecision.isRushingOut
        continue
      }

      // Outfield player target calculation
      const isClosest = player.id === closestPlayer?.id
      const targetPos = this.playerAI.computeTargetPosition(
        player,
        ball,
        teamPlayers,
        allOpponents,
        tactics,
        anchor,
        isTeamPossession,
        isClosest
      )

      player.targetPosition = targetPos
      player.isSprinting = this.playerAI.shouldSprint(player, targetPos, ball)

      // Outfield AI decision when carrying the ball
      if (player.hasBall && !player.isControlled) {
        const lastAction = this.lastActionTimes[player.id] || 0
        if (currentTimeMs - lastAction > 800) {
          const isTeam0 = player.teamIndex === 0
          const oppGoalCenter: Vec3 = { x: 0, y: 1.2, z: isTeam0 ? 52.5 : -52.5 }
          const distToGoal = vec3.distance(player.position, oppGoalCenter)

          // 1. In scoring range -> shoot!
          if (distToGoal < 24.0) {
            const shot = this.shootingSystem.computeShot(
              player,
              oppGoalCenter,
              80,
              player.playerData.attributes
            )
            aiKick = { velocity: shot.velocity, isShot: true }
            this.lastActionTimes[player.id] = currentTimeMs
          } else {
            // 2. Look for open pass
            const passTarget = this.passingSystem.selectTarget(
              player,
              teamPlayers,
              isTeam0 ? 0 : Math.PI,
              allOpponents
            )

            if (passTarget && Math.random() < 0.45) {
              const passVel = this.passingSystem.computeGroundPass(
                player.position,
                passTarget.position,
                1.0,
                player.playerData.attributes.shortPassing
              )
              aiKick = { velocity: passVel, isShot: false }
              this.lastActionTimes[player.id] = currentTimeMs
            }
          }
        }
      }

      // Check for defensive tackle attempt
      if (!isTeamPossession && isClosest) {
        const ballHolder = allOpponents.find((o) => o.hasBall)
        if (ballHolder && this.playerAI.shouldAttemptTackle(player, ballHolder, ball)) {
          aiTackles.push(player.id)
        }
      }
    }

    return { aiKick, aiTackles }
  }
}
