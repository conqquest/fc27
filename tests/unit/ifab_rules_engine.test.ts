import { describe, it, expect } from 'vitest'
import { OffsideEngine } from '../../src/engine/rules/OffsideEngine'
import { FoulDetection } from '../../src/engine/rules/FoulDetection'
import { DisciplinarySystem } from '../../src/engine/rules/DisciplinarySystem'
import { RestartManager } from '../../src/engine/rules/RestartManager'
import { GoalDetector } from '../../src/engine/rules/GoalDetector'
import type { SimPlayer, SimBall, Vec3 } from '../../src/data/types'

function createMockPlayer(id: string, teamIndex: 0 | 1, x: number, z: number, role: 'attacker' | 'midfielder' | 'defender' | 'goalkeeper' = 'attacker'): SimPlayer {
  return {
    id,
    teamIndex,
    playerData: {
      id,
      name: `Player ${id}`,
      shortName: id.toUpperCase(),
      shirtNumber: 10,
      position: role === 'goalkeeper' ? 'GK' : role === 'defender' ? 'CB' : role === 'midfielder' ? 'CM' : 'ST',
      secondaryPositions: [],
      nationality: 'England',
      age: 25,
      height: 185,
      weight: 78,
      preferredFoot: 'Right',
      overall: 85,
      attributes: {
        pace: 80, acceleration: 80, sprintSpeed: 80, shooting: 80, finishing: 80, shotPower: 80, longShots: 80,
        passing: 80, vision: 80, crossing: 80, shortPassing: 80, longPassing: 80, dribbling: 80, ballControl: 80,
        agility: 80, balance: 80, defending: 80, interceptions: 80, standingTackle: 80, slidingTackle: 80,
        strength: 80, stamina: 100, reactions: 80, heading: 80,
        gkDiving: 80, gkHandling: 80, gkKicking: 80, gkPositioning: 80, gkReflexes: 80,
      },
    },
    position: { x, y: 0, z },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: 0,
    stamina: 100,
    hasBall: false,
    isControlled: false,
    targetPosition: { x, y: 0, z },
    role,
    slotIndex: 9,
    isOnPitch: true,
    isSprinting: false,
    yellowCards: 0,
    isRedCarded: false,
  }
}

describe('IFAB Law 11 - Offside Engine', () => {
  const engine = new OffsideEngine()

  it('determines attacker in own half is never offside', () => {
    // Team 0 attacks +Z (opponent half is z > 0)
    const passer = createMockPlayer('p1', 0, 0, -20)
    const attacker = createMockPlayer('att', 0, 10, -5) // In own half
    const defenders = [
      createMockPlayer('gk', 1, 0, 50, 'goalkeeper'),
      createMockPlayer('def1', 1, 5, 20, 'defender'),
    ]

    const snapshot = engine.createSnapshot(passer, [attacker], defenders, { x: 0, y: 0, z: -20 }, 1000)
    expect(snapshot).not.toBeNull()
    expect(snapshot?.offsidePlayerIds).not.toContain('att')
  })

  it('determines attacker level with second-last opponent is onside', () => {
    const passer = createMockPlayer('p1', 0, 0, 10)
    const attacker = createMockPlayer('att', 0, 10, 25)
    const defenders = [
      createMockPlayer('gk', 1, 0, 50, 'goalkeeper'),
      createMockPlayer('def1', 1, 5, 25, 'defender'), // Exactly level with attacker
    ]

    const snapshot = engine.createSnapshot(passer, [attacker], defenders, { x: 0, y: 0, z: 10 }, 1000)
    expect(snapshot?.offsidePlayerIds).not.toContain('att')
  })

  it('determines attacker behind the ball is onside even if ahead of defenders', () => {
    const passer = createMockPlayer('p1', 0, 0, 42) // Ball is at z = 42
    const attacker = createMockPlayer('att', 0, 10, 40) // Attacker is behind ball
    const defenders = [
      createMockPlayer('gk', 1, 0, 50, 'goalkeeper'),
      createMockPlayer('def1', 1, 5, 30, 'defender'), // Defenders caught behind
    ]

    const snapshot = engine.createSnapshot(passer, [attacker], defenders, { x: 0, y: 0, z: 42 }, 1000)
    expect(snapshot?.offsidePlayerIds).not.toContain('att')
  })

  it('identifies attacker ahead of second-last opponent and ahead of ball as in offside position', () => {
    const passer = createMockPlayer('p1', 0, 0, 20)
    const attacker = createMockPlayer('att', 0, 5, 38) // Ahead of def1 (30) and ball (20)
    const defenders = [
      createMockPlayer('gk', 1, 0, 50, 'goalkeeper'),
      createMockPlayer('def1', 1, 5, 30, 'defender'),
    ]

    const snapshot = engine.createSnapshot(passer, [attacker], defenders, { x: 0, y: 0, z: 20 }, 1000)
    expect(snapshot?.offsidePlayerIds).toContain('att')
  })

  it('does NOT penalize offside position until player becomes actively involved', () => {
    const passer = createMockPlayer('p1', 0, 0, 20)
    const offsideAttacker = createMockPlayer('att_off', 0, 5, 38)
    const onsideAttacker = createMockPlayer('att_on', 0, -10, 25)
    const defenders = [
      createMockPlayer('gk', 1, 0, 50, 'goalkeeper'),
      createMockPlayer('def1', 1, 5, 30, 'defender'),
    ]

    engine.createSnapshot(passer, [offsideAttacker, onsideAttacker], defenders, { x: 0, y: 0, z: 20 }, 1000)

    // Onside attacker touches the ball -> NO offside offence!
    const decision = engine.evaluateInvolvement(onsideAttacker)
    expect(decision.isOffside).toBe(false)
  })

  it('penalizes offside player for interfering with play when touching the ball', () => {
    const passer = createMockPlayer('p1', 0, 0, 20)
    const offsideAttacker = createMockPlayer('att_off', 0, 5, 38)
    const defenders = [
      createMockPlayer('gk', 1, 0, 50, 'goalkeeper'),
      createMockPlayer('def1', 1, 5, 30, 'defender'),
    ]

    engine.createSnapshot(passer, [offsideAttacker], defenders, { x: 0, y: 0, z: 20 }, 1000)

    // Offside attacker receives the pass -> OFFSIDE!
    const decision = engine.evaluateInvolvement(offsideAttacker)
    expect(decision.isOffside).toBe(true)
    expect(decision.offendingPlayerId).toBe('att_off')
    expect(decision.reason).toBe('interfering_with_play')
  })

  it('Law 11.3 exceptions: no offside directly from a throw-in, corner, or goal kick', () => {
    const passer = createMockPlayer('p1', 0, 34, 40)
    const attacker = createMockPlayer('att', 0, 5, 48) // Deep behind defence
    const defenders = [
      createMockPlayer('gk', 1, 0, 50, 'goalkeeper'),
      createMockPlayer('def1', 1, 5, 30, 'defender'),
    ]

    // From throw-in
    const snapThrowIn = engine.createSnapshot(passer, [attacker], defenders, { x: 34, y: 0, z: 40 }, 1000, 'throw_in')
    expect(snapThrowIn).toBeNull()

    // From corner
    const snapCorner = engine.createSnapshot(passer, [attacker], defenders, { x: 34, y: 0, z: 52 }, 1000, 'corner')
    expect(snapCorner).toBeNull()

    // From goal kick
    const snapGoalKick = engine.createSnapshot(passer, [attacker], defenders, { x: 0, y: 0, z: -47 }, 1000, 'goal_kick')
    expect(snapGoalKick).toBeNull()
  })

  it('rebound from goalkeeper save constitutes gaining an advantage (still offside)', () => {
    const passer = createMockPlayer('p1', 0, 0, 35)
    const offsideAttacker = createMockPlayer('att', 0, 2, 45)
    const defenders = [
      createMockPlayer('gk', 1, 0, 50, 'goalkeeper'),
      createMockPlayer('def1', 1, 5, 40, 'defender'),
    ]

    engine.createSnapshot(passer, [offsideAttacker], defenders, { x: 0, y: 0, z: 35 }, 1000)

    // Ball saved by goalkeeper and rebounds to offside attacker
    const decision = engine.evaluateInvolvement(offsideAttacker, false, true)
    expect(decision.isOffside).toBe(true)
    expect(decision.reason).toBe('gaining_advantage')
  })

  it('deliberate play by opponent resets offside assessment', () => {
    const passer = createMockPlayer('p1', 0, 0, 20)
    const offsideAttacker = createMockPlayer('att', 0, 5, 38)
    const defender = createMockPlayer('def1', 1, 5, 30, 'defender')
    const gk = createMockPlayer('gk', 1, 0, 50, 'goalkeeper')

    engine.createSnapshot(passer, [offsideAttacker], [gk, defender], { x: 0, y: 0, z: 20 }, 1000)

    // Defender deliberately plays the ball (not a save)
    engine.evaluateInvolvement(defender, true, false)

    // Attacker receives it after opponent deliberate play -> NO offside!
    const decision = engine.evaluateInvolvement(offsideAttacker)
    expect(decision.isOffside).toBe(false)
  })
})

describe('IFAB Law 12 - Foul Detection & Advantage System', () => {
  const fouls = new FoulDetection()

  it('classifies normal challenge close to ball as clean tackle', () => {
    const tackler = createMockPlayer('tackler', 0, 5, 10)
    const victim = createMockPlayer('victim', 1, 5.2, 10.2)
    const ballPos = { x: 5.1, y: 0.11, z: 10.1 } // Ball right between them

    const result = fouls.evaluateTackle(tackler, victim, ballPos, false)
    expect(result.isFoul).toBe(false)
  })

  it('classifies collision away from ball as careless foul', () => {
    const tackler = createMockPlayer('tackler', 0, 5, 10)
    const victim = createMockPlayer('victim', 1, 5.2, 10.2)
    const ballPos = { x: 2, y: 0.11, z: 5 } // Ball 4m away

    const result = fouls.evaluateTackle(tackler, victim, ballPos, false)
    expect(result.isFoul).toBe(true)
    expect(result.severity).toBe('careless')
    expect(result.card).toBeUndefined()
  })

  it('classifies reckless slide tackle as yellow card offence', () => {
    const tackler = createMockPlayer('tackler', 0, 5, 10)
    const victim = createMockPlayer('victim', 1, 5.2, 10.2)
    const ballPos = { x: 3, y: 0.11, z: 7 }

    const result = fouls.evaluateTackle(tackler, victim, ballPos, true) // Slide tackle
    expect(result.isFoul).toBe(true)
    expect(result.severity).toBe('reckless')
    expect(result.card).toBe('yellow')
  })

  it('classifies high-speed slide tackle from behind as serious foul play (red card)', () => {
    const tackler = createMockPlayer('tackler', 0, 5, 8)
    tackler.velocity = { x: 0, y: 0, z: 6 } // High speed forward
    const victim = createMockPlayer('victim', 1, 5, 8.8)
    victim.rotation = 0 // Facing +Z (tackler is behind him)
    const ballPos = { x: 5, y: 0.11, z: 12 }

    const result = fouls.evaluateTackle(tackler, victim, ballPos, true)
    expect(result.isFoul).toBe(true)
    expect(result.severity).toBe('excessive_force')
    expect(result.card).toBe('red')
  })

  it('awards penalty kick when defending team fouls inside their own penalty box', () => {
    // Defending team 1 has penalty box at Z > 36 (52.5 - 16.5)
    const tackler = createMockPlayer('tackler', 1, 2, 45, 'defender')
    const victim = createMockPlayer('victim', 0, 2.2, 45.2, 'attacker')
    const ballPos = { x: 0, y: 0.11, z: 30 }

    const result = fouls.evaluateTackle(tackler, victim, ballPos, false)
    expect(result.isFoul).toBe(true)
    expect(result.isPenalty).toBe(true)
  })

  it('detects outfield player handball blocking shot', () => {
    const defender = createMockPlayer('def', 1, 0, 48, 'defender')
    const ball = { position: { x: 0.2, y: 1.2, z: 48.1 }, velocity: { x: 0, y: 0, z: 15 } }

    const result = fouls.evaluateHandball(defender, ball, true)
    expect(result).not.toBeNull()
    expect(result?.isFoul).toBe(true)
    expect(result?.isPenalty).toBe(true) // Inside penalty area
  })

  it('detects goalkeeper handling outside penalty area as direct free kick', () => {
    const gk = createMockPlayer('gk', 0, 0, -30, 'goalkeeper') // Outside box (box ends at -36)
    const ball = { position: { x: 0.1, y: 0.5, z: -30.1 }, velocity: { x: 0, y: 0, z: 0 } }

    const result = fouls.evaluateHandball(gk, ball, false)
    expect(result).not.toBeNull()
    expect(result?.isFoul).toBe(true)
    expect(result?.isPenalty).toBe(false)
    expect(result?.card).toBe('yellow')
  })

  it('enforces back-pass rule: goalkeeper handling teammate deliberate kick yields indirect free kick', () => {
    const gk = createMockPlayer('gk', 0, 0, -48, 'goalkeeper') // Inside own box
    const teammate = createMockPlayer('cb', 0, 5, -35, 'defender') // Teammate

    const result = fouls.evaluateBackPass(gk, teammate, true)
    expect(result).not.toBeNull()
    expect(result?.isFoul).toBe(true)
    expect(result?.isIndirect).toBe(true)
  })

  it('supports referee advantage window', () => {
    const tackler = createMockPlayer('tackler', 0, 5, 10)
    const victim = createMockPlayer('victim', 1, 5.2, 10.2)
    const ballPos = { x: 2, y: 0.11, z: 5 }

    const foulResult = fouls.evaluateTackle(tackler, victim, ballPos, false)
    expect(foulResult.canPlayAdvantage).toBe(true)

    const adv = fouls.startAdvantage(foulResult, 1000)
    expect(adv.active).toBe(true)
    expect(fouls.getActiveAdvantage()).not.toBeNull()

    fouls.clearAdvantage()
    expect(fouls.getActiveAdvantage()).toBeNull()
  })
})

describe('IFAB Law 12 - Disciplinary System (Cards & Expulsion)', () => {
  const disciplinary = new DisciplinarySystem()

  it('issues yellow card and retains player on pitch', () => {
    const player = createMockPlayer('p1', 0, 0, 0)
    const res = disciplinary.issueCard(player, 'yellow', 'Reckless tackle', 22)

    expect(res.isExpelled).toBe(false)
    expect(res.cardType).toBe('yellow')
    expect(player.isOnPitch).toBe(true)
    expect(player.yellowCards).toBe(1)
  })

  it('issues second yellow resulting in immediate red card and expulsion', () => {
    const player = createMockPlayer('p1', 0, 0, 0)
    player.yellowCards = 1 // Already had one

    const res = disciplinary.issueCard(player, 'yellow', 'Tactical foul', 58)
    expect(res.isExpelled).toBe(true)
    expect(res.cardType).toBe('second_yellow_red')
    expect(player.isOnPitch).toBe(false)
    expect(player.isRedCarded).toBe(true)
  })

  it('issues direct red card and expels player immediately from pitch', () => {
    const player = createMockPlayer('p2', 1, 0, 0)
    const res = disciplinary.issueCard(player, 'red', 'Violent conduct', 34)

    expect(res.isExpelled).toBe(true)
    expect(res.cardType).toBe('red')
    expect(player.isOnPitch).toBe(false)
    expect(player.isRedCarded).toBe(true)
    expect(disciplinary.isExpelled('p2')).toBe(true)
  })
})

describe('IFAB Law 8, 13, 14, 15, 16, 17 - Restarts & Set Pieces', () => {
  const restarts = new RestartManager()

  it('positions free kick defending wall at 9.15m distance', () => {
    const taker = createMockPlayer('taker', 0, 0, 20)
    const defenders = [
      createMockPlayer('d1', 1, 0, 25, 'defender'),
      createMockPlayer('d2', 1, 1, 26, 'defender'),
      createMockPlayer('d3', 1, -1, 26, 'defender'),
    ]

    const { wallPositions } = restarts.setupFreeKick(0, { x: 0, y: 0.11, z: 20 }, false, [taker, ...defenders])
    expect(wallPositions.length).toBeGreaterThan(0)
    for (const w of wallPositions) {
      const dist = Math.hypot(w.x - 0, w.z - 20)
      expect(dist).toBeGreaterThanOrEqual(8.5)
    }
  })

  it('positions penalty taker at penalty mark and keeper on goal line', () => {
    const taker = createMockPlayer('taker', 0, 0, 30)
    const keeper = createMockPlayer('gk', 1, 0, 48, 'goalkeeper')
    const otherPlayers = [createMockPlayer('p1', 0, 2, 40), createMockPlayer('p2', 1, -2, 40)]

    const res = restarts.setupPenalty(0, [taker, keeper, ...otherPlayers])
    expect(res.setPiece.type).toBe('PENALTY')
    expect(res.keeper.position.z).toBeCloseTo(52.4, 1)

    // Other players positioned outside box
    for (const p of otherPlayers) {
      expect(Math.abs(p.position.z)).toBeLessThan(41.5) // Behind penalty spot
    }
  })

  it('positions throw-in opponents at least 2m away', () => {
    const taker = createMockPlayer('taker', 0, 34, 10)
    const opponent = createMockPlayer('opp', 1, 34, 10.5)

    restarts.setupThrowIn(0, { x: 34, y: 0.11, z: 10 }, [taker, opponent])
    const dist = Math.hypot(opponent.position.x - 34, opponent.position.z - 10)
    expect(dist).toBeGreaterThanOrEqual(2.0)
  })

  it('enforces two-touch rule on restart: kicker touching ball twice is penalised', () => {
    const taker = createMockPlayer('taker', 0, 0, 0)
    restarts.setupFreeKick(0, { x: 0, y: 0.11, z: 0 }, false, [taker])

    // First touch (taking the kick) is legal
    expect(restarts.checkDoubleTouch(taker)).toBe(false)

    // Second touch before anyone else touches it is ILLEGAL!
    expect(restarts.checkDoubleTouch(taker)).toBe(true)
  })

  it('resets two-touch restriction once another player touches the ball', () => {
    const taker = createMockPlayer('taker', 0, 0, 0)
    const teammate = createMockPlayer('mate', 0, 5, 5)
    restarts.setupFreeKick(0, { x: 0, y: 0.11, z: 0 }, false, [taker, teammate])

    restarts.checkDoubleTouch(taker) // 1st touch
    restarts.registerBallTouch(teammate.id) // Another player touched

    // Now taker can touch again legally
    expect(restarts.checkDoubleTouch(taker)).toBe(false)
  })

  it('manages 5-round penalty shootout and declares winner', () => {
    restarts.startShootout()
    const state = restarts.getShootoutState()
    expect(state.active).toBe(true)

    // Team 0 scores, Team 1 misses
    restarts.recordShootoutKick(true, 't0_1')
    restarts.recordShootoutKick(false, 't1_1')

    // Team 0 scores, Team 1 misses
    restarts.recordShootoutKick(true, 't0_2')
    restarts.recordShootoutKick(false, 't1_2')

    // Team 0 scores, Team 1 misses
    restarts.recordShootoutKick(true, 't0_3')
    const finalState = restarts.recordShootoutKick(false, 't1_3')

    // Team 0 leads 3-0 with only 2 kicks left for Team 1 -> Team 0 wins!
    expect(finalState.winner).toBe(0)
    expect(finalState.active).toBe(false)
  })
})

describe('IFAB Law 10 - Goal Detection & Validation', () => {
  const detector = new GoalDetector()

  it('validates goal when whole ball crosses goal line between posts', () => {
    const prevBallPos = { x: 0, y: 1.0, z: 52.0 }
    const currentBall: SimBall = {
      position: { x: 0, y: 1.0, z: 53.0 }, // Wholly crossed 52.5 + 0.11
      velocity: { x: 0, y: 0, z: 12 },
      spin: { x: 0, y: 0, z: 0 },
      possessionPlayerId: null,
      lastTouchedTeam: 0,
      lastTouchedPlayerId: 'p1',
      isInPlay: true,
    }

    const scoringTeam = detector.check(currentBall, prevBallPos, 1000)
    expect(scoringTeam).toBe(0)
  })

  it('disallows direct goal from an indirect free kick without second touch', () => {
    const prevBallPos = { x: 0, y: 1.0, z: 52.0 }
    const currentBall: SimBall = {
      position: { x: 0, y: 1.0, z: 53.0 },
      velocity: { x: 0, y: 0, z: 12 },
      spin: { x: 0, y: 0, z: 0 },
      possessionPlayerId: null,
      lastTouchedTeam: 0,
      lastTouchedPlayerId: 'p1',
      isInPlay: true,
    }

    // Is indirect play: NO GOAL!
    const scoringTeam = detector.check(currentBall, prevBallPos, 2000, true, false)
    expect(scoringTeam).toBeNull()
  })

  it('disallows direct goal scored from a throw-in without second touch', () => {
    const prevBallPos = { x: 1.0, y: 1.0, z: 52.0 }
    const currentBall: SimBall = {
      position: { x: 1.0, y: 1.0, z: 53.0 },
      velocity: { x: 0, y: 0, z: 12 },
      spin: { x: 0, y: 0, z: 0 },
      possessionPlayerId: null,
      lastTouchedTeam: 0,
      lastTouchedPlayerId: 'p1',
      isInPlay: true,
    }

    // Direct throw-in: NO GOAL!
    const scoringTeam = detector.check(currentBall, prevBallPos, 3000, false, true)
    expect(scoringTeam).toBeNull()
  })

  it('prevents duplicate goal registration across physics frames', () => {
    const prevBallPos = { x: 0, y: 1.0, z: 52.0 }
    const currentBall: SimBall = {
      position: { x: 0, y: 1.0, z: 53.0 },
      velocity: { x: 0, y: 0, z: 10 },
      spin: { x: 0, y: 0, z: 0 },
      possessionPlayerId: null,
      lastTouchedTeam: 0,
      lastTouchedPlayerId: 'p1',
      isInPlay: true,
    }

    const firstCheck = detector.check(currentBall, prevBallPos, 4000)
    expect(firstCheck).toBe(0)

    // Second check in next frame (50ms later) must be null
    const secondCheck = detector.check(currentBall, prevBallPos, 4050)
    expect(secondCheck).toBeNull()
  })
})
