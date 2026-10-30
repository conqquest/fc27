import { describe, it, expect, beforeEach } from 'vitest'
import { PlayerSwitchController } from '../../src/engine/ai/PlayerSwitchController'
import { resolveDifficulty, DIFFICULTY_PRESETS } from '../../src/engine/ai/AIDifficulty'
import { PlayerAI } from '../../src/engine/ai/PlayerAI'
import { TeamAI } from '../../src/engine/ai/TeamAI'
import { GoalkeeperAI } from '../../src/engine/ai/GoalkeeperAI'
import type { SimPlayer, SimBall, Tactics, Vec3 } from '../../src/data/types'

const mockTactics: Tactics = {
  formation: '4-3-3',
  mentality: 'balanced',
  pressStyle: 'balanced',
  defensiveLineHeight: 5,
  attackingWidth: 5,
  buildUpSpeed: 5,
  counterAttack: false,
  possessionFocus: false,
}

function createMockPlayer(
  id: string,
  teamIndex: 0 | 1,
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward',
  pos: { x: number; y: number; z: number },
  extra: Partial<SimPlayer> = {}
): SimPlayer {
  const isGK = role === 'goalkeeper'
  const isDef = role === 'defender'
  const isMid = role === 'midfielder'

  return {
    id,
    teamIndex,
    role,
    number: 10,
    position: { ...pos },
    velocity: { x: 0, y: 0, z: 0 },
    facing: 0,
    hasBall: false,
    isControlled: false,
    stamina: 100,
    cardStatus: 'none',
    yellowCards: 0,
    isRedCarded: false,
    isOnPitch: true,
    animation: 'idle',
    targetPosition: { ...pos },
    playerData: {
      id,
      name: `Player ${id}`,
      number: 10,
      position: isGK ? 'GK' : isDef ? 'CB' : isMid ? 'CM' : 'ST',
      role,
      rating: 85,
      pace: 80,
      shooting: 75,
      passing: 80,
      dribbling: 78,
      defending: 82,
      physical: 80,
      preferredFoot: 'right',
      skills: 3,
      weakFoot: 3,
      attributes: {
        pace: 80,
        acceleration: 80,
        sprintSpeed: 80,
        shooting: 75,
        finishing: 75,
        shotPower: 75,
        longShots: 75,
        passing: 80,
        vision: 80,
        crossing: 75,
        shortPassing: 82,
        longPassing: 78,
        dribbling: 78,
        ballControl: 80,
        agility: 75,
        balance: 75,
        defending: 82,
        interceptions: 80,
        standingTackle: 82,
        slidingTackle: 78,
        strength: 80,
        stamina: 85,
        reactions: 82,
        heading: 75,
        gkDiving: isGK ? 85 : 15,
        gkHandling: isGK ? 82 : 12,
        gkKicking: isGK ? 80 : 20,
        gkPositioning: isGK ? 84 : 14,
        gkReflexes: isGK ? 86 : 16,
      },
    },
    ...extra,
  }
}

function createMockBall(pos = { x: 0, y: 0.11, z: 0 }, vel = { x: 0, y: 0, z: 0 }): SimBall {
  return {
    position: { ...pos },
    velocity: { ...vel },
    spin: { x: 0, y: 0, z: 0 },
    possessionPlayerId: null,
  }
}

describe('1. PlayerSwitchController (S-key player switching)', () => {
  let switchController: PlayerSwitchController

  beforeEach(() => {
    switchController = new PlayerSwitchController()
  })

  it('selects the nearest defender to the ball', () => {
    const ball = createMockBall({ x: 0, y: 0.11, z: -10 })
    const p1 = createMockPlayer('p1', 0, 'defender', { x: 0, y: 0, z: -15 }) // dist = 5
    const p2 = createMockPlayer('p2', 0, 'midfielder', { x: 20, y: 0, z: 0 }) // dist = 22.3
    const p3 = createMockPlayer('p3', 0, 'forward', { x: -30, y: 0, z: 20 })

    const selected = switchController.selectBestDefender([p1, p2, p3], ball, null, -52.5)
    expect(selected?.id).toBe('p1')
  })

  it('applies goal-side positioning bonus', () => {
    // Defending goal is at z = -52.5 (Home goal)
    // Ball is at z = -20
    // p1 is at z = -15 (not goal-side, behind the ball away from goal, dist = 5)
    // p2 is at z = -26 (goal-side, between ball and goal, dist = 6)
    // With goal-side bonus (-2.8m), p2 effective dist = 3.2m < 5m
    const ball = createMockBall({ x: 0, y: 0.11, z: -20 })
    const p1 = createMockPlayer('p1', 0, 'midfielder', { x: 0, y: 0, z: -15 })
    const p2 = createMockPlayer('p2', 0, 'defender', { x: 0, y: 0, z: -26 })

    const selected = switchController.selectBestDefender([p1, p2], ball, null, -52.5)
    expect(selected?.id).toBe('p2')
  })

  it('never selects goalkeepers or red-carded players', () => {
    const ball = createMockBall({ x: 0, y: 0.11, z: -45 })
    const gk = createMockPlayer('gk', 0, 'goalkeeper', { x: 0, y: 0, z: -46 }) // Closest to ball
    const redCarded = createMockPlayer('p_red', 0, 'defender', { x: 1, y: 0, z: -44 }, { isRedCarded: true, isOnPitch: false })
    const cb = createMockPlayer('cb', 0, 'defender', { x: 5, y: 0, z: -40 })

    const selected = switchController.selectBestDefender([gk, redCarded, cb], ball, null, -52.5)
    expect(selected?.id).toBe('cb')
  })

  it('cycles away from the currently controlled player on repeated S press', () => {
    const ball = createMockBall({ x: 0, y: 0.11, z: 0 })
    const p1 = createMockPlayer('p1', 0, 'defender', { x: 0, y: 0, z: -5 }) // Closest
    const p2 = createMockPlayer('p2', 0, 'midfielder', { x: 0, y: 0, z: -8 }) // Second closest

    // First switch selects p1
    const firstSwitch = switchController.selectBestDefender([p1, p2], ball, null, -52.5)
    expect(firstSwitch?.id).toBe('p1')

    // Pressing S again while p1 is controlled switches to p2
    const secondSwitch = switchController.selectBestDefender([p1, p2], ball, 'p1', -52.5)
    expect(secondSwitch?.id).toBe('p2')
  })
})

describe('2. AIDifficulty configuration & scaling', () => {
  it('resolves standard difficulties properly', () => {
    const amateur = resolveDifficulty('amateur')
    const pro = resolveDifficulty('professional')
    const legendary = resolveDifficulty('legendary')

    // Reaction delay: amateur > pro > legendary (legendary reacts fastest)
    expect(amateur.reactionDelayMs).toBeGreaterThan(pro.reactionDelayMs)
    expect(pro.reactionDelayMs).toBeGreaterThan(legendary.reactionDelayMs)

    // Pass accuracy: legendary > pro > amateur
    expect(legendary.passAccuracy).toBeGreaterThan(pro.passAccuracy)
    expect(pro.passAccuracy).toBeGreaterThan(amateur.passAccuracy)

    // Pressing aggression: legendary > amateur
    expect(legendary.pressAggressiveness).toBeGreaterThan(amateur.pressAggressiveness)

    // Shot precision: legendary > amateur
    expect(legendary.shotPrecision).toBeGreaterThan(amateur.shotPrecision)
  })

  it('falls back to medium for unknown difficulty strings', () => {
    const unknown = resolveDifficulty('super-extreme-custom')
    expect(unknown.reactionDelayMs).toBe(DIFFICULTY_PRESETS['medium'].reactionDelayMs)
  })
})

describe('3. PlayerAI State-Based Calculations', () => {
  let playerAI: PlayerAI
  const anchor: Vec3 = { x: 0, y: 0, z: 10 }
  const diff = resolveDifficulty('professional')

  beforeEach(() => {
    playerAI = new PlayerAI()
  })

  it('computes DRIBBLING state when holding ball and steers away from close opponents', () => {
    const ball = createMockBall({ x: 0, y: 0.11, z: 10 })
    const carrier = createMockPlayer('carrier', 1, 'forward', { x: 0, y: 0, z: 10 }, { hasBall: true })
    const defender = createMockPlayer('def', 0, 'defender', { x: 0, y: 0, z: 7 }) // Directly ahead

    const decision = playerAI.computeTarget(
      carrier,
      ball,
      [carrier],
      [defender],
      mockTactics,
      anchor,
      true, // isTeamPossession
      false, // isClosestToBall
      false, // isTeammatePressureTarget
      diff
    )

    expect(decision.aiState).toBe('DRIBBLING')
    // Should steer sideways (X direction) to evade defender directly ahead
    expect(Math.abs(decision.targetPosition.x)).toBeGreaterThan(0)
  })

  it('computes PRESSING state when defending nearest to ball carrier', () => {
    const ball = createMockBall({ x: 0, y: 0.11, z: 0 })
    const opponent = createMockPlayer('opp', 0, 'midfielder', { x: 0, y: 0, z: 0 }, { hasBall: true })
    const presser = createMockPlayer('presser', 1, 'midfielder', { x: 3, y: 0, z: 2 })

    const decision = playerAI.computeTarget(
      presser,
      ball,
      [presser],
      [opponent],
      mockTactics,
      anchor,
      false, // isTeamPossession
      true, // isClosestToBall
      false,
      diff
    )

    expect(['PRESSING', 'INTERCEPTING']).toContain(decision.aiState)
    expect(decision.isSprinting).toBe(true)
  })

  it('computes goal-side MARKING or BLOCKING_PASSING_LANE when not pressing', () => {
    const ball = createMockBall({ x: -20, y: 0.11, z: 0 })
    const oppWithBall = createMockPlayer('opp1', 0, 'midfielder', { x: -20, y: 0, z: 0 }, { hasBall: true })
    const oppTarget = createMockPlayer('opp2', 0, 'forward', { x: 10, y: 0, z: -15 })
    const marker = createMockPlayer('marker', 1, 'defender', { x: 10, y: 0, z: -10 })
    const otherPresser = createMockPlayer('presser', 1, 'midfielder', { x: -18, y: 0, z: 0 })

    const decision = playerAI.computeTarget(
      marker,
      ball,
      [marker, otherPresser],
      [oppWithBall, oppTarget],
      mockTactics,
      anchor,
      false, // isTeamPossession
      false, // isClosestToBall
      false, // isTeammatePressureTarget
      diff
    )

    expect(['MARKING', 'BLOCKING_PASSING_LANE', 'RECOVERING_POSITION']).toContain(decision.aiState)
  })
})

describe('4. TeamAI & Teammate Secondary Pressure', () => {
  let teamAI: TeamAI

  beforeEach(() => {
    teamAI = new TeamAI()
  })

  it('activates teammate secondary pressure when user holds Q', () => {
    const ball = createMockBall({ x: 0, y: 0.11, z: 0 })
    const oppCarrier = createMockPlayer('opp', 1, 'forward', { x: 0, y: 0, z: 0 }, { hasBall: true })
    const userControlled = createMockPlayer('user', 0, 'defender', { x: 8, y: 0, z: -5 }, { isControlled: true })
    const aiTeammate1 = createMockPlayer('tm1', 0, 'midfielder', { x: 3, y: 0, z: 2 }) // Nearest AI teammate
    const aiTeammate2 = createMockPlayer('tm2', 0, 'defender', { x: 15, y: 0, z: -15 })

    const teamPlayers = [userControlled, aiTeammate1, aiTeammate2]
    const oppPlayers = [oppCarrier]

    // Update with teammate pressure active
    teamAI.updateTeam(teamPlayers, oppPlayers, ball, mockTactics, 1000, false, 'professional', true)

    // The nearest AI teammate should be marked as pressing
    expect(aiTeammate1.isPressingTeammate).toBe(true)
    expect(aiTeammate2.isPressingTeammate).toBe(false)
    expect(userControlled.isPressingTeammate).toBe(false)
  })

  it('clears teammate pressure when Q is released', () => {
    const ball = createMockBall({ x: 0, y: 0.11, z: 0 })
    const oppCarrier = createMockPlayer('opp', 1, 'forward', { x: 0, y: 0, z: 0 }, { hasBall: true })
    const aiTeammate1 = createMockPlayer('tm1', 0, 'midfielder', { x: 3, y: 0, z: 2 })

    const teamPlayers = [aiTeammate1]
    const oppPlayers = [oppCarrier]

    // Pressure active
    teamAI.updateTeam(teamPlayers, oppPlayers, ball, mockTactics, 1000, false, 'professional', true)
    expect(aiTeammate1.isPressingTeammate).toBe(true)

    // Pressure released
    teamAI.updateTeam(teamPlayers, oppPlayers, ball, mockTactics, 2000, false, 'professional', false)
    expect(aiTeammate1.isPressingTeammate).toBe(false)
  })
})

describe('5. GoalkeeperAI Positioning & Distribution', () => {
  let gkAI: GoalkeeperAI

  beforeEach(() => {
    gkAI = new GoalkeeperAI()
  })

  it('positions goalkeeper along the arc bisecting ball and goal center', () => {
    const gk = createMockPlayer('gk', 1, 'goalkeeper', { x: 0, y: 0, z: 52.5 })
    const ball = createMockBall({ x: 15, y: 0.11, z: 30 })

    const decision = gkAI.update(gk, ball, 0.016, [gk])

    // GK should shift towards +X (same side as the ball) but stay near the goal line
    expect(decision.targetPos.x).toBeGreaterThan(0)
    expect(decision.targetPos.z).toBeGreaterThan(45)
    expect(decision.targetPos.z).toBeLessThanOrEqual(52.5)
  })

  it('sweeps forward when loose ball enters the 18-yard penalty box', () => {
    const gk = createMockPlayer('gk', 1, 'goalkeeper', { x: 0, y: 0, z: 52.5 })
    // Ball inside 18-yard box (|x| < 18, z > 37.5) and loose
    const ball = createMockBall({ x: 5, y: 0.11, z: 42 }, { x: 0, y: 0, z: 0 })

    const decision = gkAI.update(gk, ball, 0.016, [gk])

    // GK should rush out to claim the loose ball
    expect(decision.isRushingOut).toBe(true)
    expect(decision.targetPos.z).toBeCloseTo(42, 0)
    expect(decision.targetPos.x).toBeCloseTo(5, 0)
  })

  it('distributes the ball when in keeper possession', () => {
    const gk = createMockPlayer('gk', 1, 'goalkeeper', { x: 0, y: 0, z: 52.5 }, { hasBall: true })
    const teammate = createMockPlayer('cb', 1, 'defender', { x: 10, y: 0, z: 40 })
    const ball = createMockBall({ x: 0, y: 0.11, z: 52.5 })

    const decision = gkAI.update(gk, ball, 0.016, [gk, teammate])

    expect(decision.aiDistributionKick).toBeDefined()
    expect(decision.aiDistributionKick?.velocity).toBeDefined()
  })
})
