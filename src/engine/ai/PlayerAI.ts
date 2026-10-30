import type { SimPlayer, SimBall, Vec3, Tactics, AIPlayerState } from '../../data/types'
import type { AIDifficultyConfig } from './AIDifficulty'
import { vec3, clamp } from '../../utils/math'

export interface PlayerAIDecision {
  targetPosition: Vec3
  isSprinting: boolean
  aiState: AIPlayerState
  markedOpponentId?: string | null
}

export class PlayerAI {
  /**
   * Computes state-based target position and behaviors for outfield players.
   */
  public computeTarget(
    player: SimPlayer,
    ball: SimBall,
    teammates: SimPlayer[],
    opponents: SimPlayer[],
    tactics: Tactics,
    formationAnchor: Vec3,
    isTeamPossession: boolean,
    isClosestToBall: boolean,
    isTeammatePressureTarget: boolean,
    difficulty: AIDifficultyConfig
  ): PlayerAIDecision {
    const isTeam0 = player.teamIndex === 0
    const forwardSign = isTeam0 ? 1 : -1
    const ownGoalZ = isTeam0 ? -52.5 : 52.5
    const oppGoalZ = isTeam0 ? 52.5 : -52.5
    const role = player.role

    // ─── 1. Loose ball / Closest to ball ───
    if (!ball.possessionPlayerId && isClosestToBall) {
      return {
        targetPosition: { x: ball.position.x, y: 0, z: ball.position.z },
        isSprinting: true,
        aiState: 'INTERCEPTING',
      }
    }

    // ─── 2. DEFENDING PHASE (Opponent has the ball or loose ball in our half) ───
    if (!isTeamPossession) {
      const ballHolder = opponents.find((o) => o.hasBall && o.isOnPitch) || null

      // A. Active Pressing Defender (Closest to ball OR designated Teammate Pressure)
      if (isClosestToBall || isTeammatePressureTarget) {
        const pressTarget = ballHolder ? ballHolder.position : ball.position
        const distToPress = vec3.distance(player.position, pressTarget)
        const isSprinting = distToPress > 2.0 && player.stamina > 20

        return {
          targetPosition: { x: pressTarget.x, y: 0, z: pressTarget.z },
          isSprinting,
          aiState: 'PRESSING',
        }
      }

      // B. Marking & Blocking passing lanes
      // Find nearest dangerous opponent in this player's defensive sector
      let closestOpp: SimPlayer | null = null
      let minOppDist = Infinity

      for (const opp of opponents) {
        if (!opp.isOnPitch || opp.role === 'goalkeeper' || opp.id === ballHolder?.id) continue
        const distToAnchor = vec3.distance(opp.position, formationAnchor)
        if (distToAnchor < minOppDist && distToAnchor < 18.0) {
          minOppDist = distToAnchor
          closestOpp = opp
        }
      }

      if (closestOpp) {
        // Position GOAL-SIDE of the opponent (between the opponent and own goal)
        // Distance based on difficulty
        const markingOffset = difficulty.markingDistance
        const toGoal = vec3.normalize({ x: 0 - closestOpp.position.x, y: 0, z: ownGoalZ - closestOpp.position.z })
        const markedPos: Vec3 = {
          x: clamp(closestOpp.position.x + toGoal.x * markingOffset, -32, 32),
          y: 0,
          z: clamp(closestOpp.position.z + toGoal.z * markingOffset, -50, 50),
        }

        const distToMark = vec3.distance(player.position, markedPos)
        return {
          targetPosition: markedPos,
          isSprinting: distToMark > 6.0 && player.stamina > 30,
          aiState: 'MARKING',
          markedOpponentId: closestOpp.id,
        }
      }

      // C. Midfielder Blocking Passing Lane
      if (role === 'midfielder' && ballHolder) {
        // Find best passing option for ballHolder
        const openOpponents = opponents.filter((o) => o.isOnPitch && o.id !== ballHolder.id && o.role !== 'goalkeeper')
        if (openOpponents.length > 0) {
          const passReceiver = openOpponents[0]
          // Midpoint between ball holder and pass receiver
          const laneInterception: Vec3 = {
            x: (ballHolder.position.x + passReceiver.position.x) * 0.5,
            y: 0,
            z: (ballHolder.position.z + passReceiver.position.z) * 0.5,
          }
          return {
            targetPosition: {
              x: clamp(laneInterception.x, -30, 30),
              y: 0,
              z: clamp(laneInterception.z, -48, 48),
            },
            isSprinting: false,
            aiState: 'BLOCKING_PASSING_LANE',
          }
        }
      }

      // D. Tactical Zonal Shape
      const lineDrop = (10 - tactics.defensiveLineHeight) * 2.2 * -forwardSign
      const ballTrackingZ = (ball.position.z - formationAnchor.z) * 0.35
      const targetX = formationAnchor.x + (ball.position.x - formationAnchor.x) * 0.22
      const targetZ = formationAnchor.z + lineDrop + ballTrackingZ

      return {
        targetPosition: {
          x: clamp(targetX, -32, 32),
          y: 0,
          z: clamp(targetZ, -50, 50),
        },
        isSprinting: false,
        aiState: 'RECOVERING_POSITION',
      }
    }

    // ─── 3. ATTACKING PHASE (Team has possession) ───

    // A. Player has the ball: Intelligent Dribble into space
    if (player.hasBall) {
      // Check nearest defending opponent
      let nearestDefDist = Infinity
      let nearestDefDir = { x: 0, y: 0, z: 0 }

      for (const def of opponents) {
        if (!def.isOnPitch || def.role === 'goalkeeper') continue
        const dist = vec3.distance(player.position, def.position)
        if (dist < nearestDefDist) {
          nearestDefDist = dist
          nearestDefDir = vec3.normalize(vec3.sub(def.position, player.position))
        }
      }

      // If defender is close in front: steer away or toward wing space
      let dribbleDirX = (oppGoalZ > 0 ? 0 : 0) - player.position.x * 0.05
      let dribbleDirZ = forwardSign * 8.0

      if (nearestDefDist < 3.5) {
        // Evade sideways into open green turf
        const evadeSide = player.position.x >= 0 ? 1 : -1
        dribbleDirX += evadeSide * 6.0
        dribbleDirZ = forwardSign * 4.0
      }

      return {
        targetPosition: {
          x: clamp(player.position.x + dribbleDirX, -31, 31),
          y: 0,
          z: clamp(player.position.z + dribbleDirZ, -50, 50),
        },
        isSprinting: nearestDefDist > 4.5 && player.stamina > 30,
        aiState: 'DRIBBLING',
      }
    }

    // B. Off-ball Attacking Movement
    const attackingWidth = 0.9 + (tactics.attackingWidth / 10) * 0.5
    const pushUpDist = forwardSign * (8 + (tactics.buildUpSpeed / 10) * 10)

    let targetX = formationAnchor.x * attackingWidth
    let targetZ = formationAnchor.z + pushUpDist

    // Wingers stretch touchline for crossing opportunities
    if (Math.abs(formationAnchor.x) > 18) {
      targetX = (formationAnchor.x > 0 ? 1 : -1) * 26.5
    }

    // Strikers make penetrating forward runs behind defensive line
    if (role === 'attacker') {
      const oppDeepestDefenderZ = Math.min(
        ...opponents.filter((o) => o.isOnPitch && o.role !== 'goalkeeper').map((o) => o.position.z)
      )
      // Run just onside of the defensive line
      const runZ = isTeam0
        ? Math.min(oppGoalZ - 6, player.position.z + 12)
        : Math.max(oppGoalZ + 6, player.position.z - 12)

      targetZ = runZ
      targetX += (ball.position.x - player.position.x) * 0.2

      return {
        targetPosition: {
          x: clamp(targetX, -31, 31),
          y: 0,
          z: clamp(targetZ, -50, 50),
        },
        isSprinting: true,
        aiState: 'MAKING_FORWARD_RUN',
      }
    }

    // Midfielders provide passing triangle support behind the ball
    if (role === 'midfielder') {
      const toBall = vec3.sub(ball.position, player.position)
      if (vec3.length(toBall) > 18.0) {
        targetZ = formationAnchor.z + (ball.position.z - formationAnchor.z) * 0.5
      }
    }

    return {
      targetPosition: {
        x: clamp(targetX, -32, 32),
        y: 0,
        z: clamp(targetZ, -50, 50),
      },
      isSprinting: false,
      aiState: 'SUPPORT_ATTACK',
    }
  }

  public shouldAttemptTackle(
    player: SimPlayer,
    ballHolder: SimPlayer | null,
    ball: SimBall,
    difficulty: AIDifficultyConfig
  ): boolean {
    if (!ballHolder || ballHolder.teamIndex === player.teamIndex) return false
    const distToBall = vec3.distance(player.position, ball.position)

    if (distToBall > 1.35) return false

    // Respect difficulty tackle probability
    return Math.random() < difficulty.tackleProbability
  }
}
