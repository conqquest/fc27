import { describe, it, expect } from 'vitest'
import { GoalDetector } from '../../src/engine/rules/GoalDetector'
import { Referee } from '../../src/engine/rules/Referee'
import { MatchClock } from '../../src/engine/rules/MatchClock'
import { MatchStateMachine } from '../../src/engine/MatchStateMachine'
import type { SimBall } from '../../src/data/types'

describe('GoalDetector', () => {
  it('detects ball crossing Away goal line inside posts', () => {
    const detector = new GoalDetector()
    const prevBallPos = { x: 1.0, y: 1.0, z: 52.0 }
    const currentBall: SimBall = {
      position: { x: 1.0, y: 1.0, z: 53.0 },
      velocity: { x: 0, y: 0, z: 15 },
      spin: { x: 0, y: 0, z: 0 },
      possessionPlayerId: null,
      lastTouchedTeam: 0,
      lastTouchedPlayerId: 'player-1',
      isInPlay: true,
    }

    const scoringTeam = detector.check(currentBall, prevBallPos, 1000)
    expect(scoringTeam).toBe(0) // Home scored
  })

  it('rejects shots that go wide of the goal posts', () => {
    const detector = new GoalDetector()
    const prevBallPos = { x: 8.0, y: 1.0, z: 52.0 } // Goal post is 3.66m wide
    const currentBall: SimBall = {
      position: { x: 8.5, y: 1.0, z: 53.0 },
      velocity: { x: 5, y: 0, z: 15 },
      spin: { x: 0, y: 0, z: 0 },
      possessionPlayerId: null,
      lastTouchedTeam: 0,
      lastTouchedPlayerId: null,
      isInPlay: true,
    }

    const scoringTeam = detector.check(currentBall, prevBallPos, 1000)
    expect(scoringTeam).toBeNull()
  })

  it('prevents multiple goal counts for the same shot within cooldown', () => {
    const detector = new GoalDetector()
    const prevPos = { x: 0, y: 1, z: 52.0 }
    const ball: SimBall = {
      position: { x: 0, y: 1, z: 53.0 },
      velocity: { x: 0, y: 0, z: 5 },
      spin: { x: 0, y: 0, z: 0 },
      possessionPlayerId: null,
      lastTouchedTeam: 0,
      lastTouchedPlayerId: null,
      isInPlay: true,
    }

    const firstCheck = detector.check(ball, prevPos, 1000)
    expect(firstCheck).toBe(0)

    // Immediate second check should be null due to cooldown
    const secondCheck = detector.check(ball, prevPos, 1050)
    expect(secondCheck).toBeNull()
  })
})

describe('Referee', () => {
  const referee = new Referee()

  it('detects touchline out-of-bounds as throw-in for opponent', () => {
    const ball: SimBall = {
      position: { x: 35.5, y: 0.11, z: 10 }, // Out on right sideline (> 34m)
      velocity: { x: 5, y: 0, z: 0 },
      spin: { x: 0, y: 0, z: 0 },
      possessionPlayerId: null,
      lastTouchedTeam: 0,
      lastTouchedPlayerId: null,
      isInPlay: true,
    }

    const decision = referee.checkBallOut(ball, { x: 33, y: 0.11, z: 10 }, 0)
    expect(decision.type).toBe('throw_in')
    expect(decision.teamIndex).toBe(1) // Away team throw-in
  })

  it('detects goal-line out by defending team as corner kick', () => {
    const ball: SimBall = {
      position: { x: 10, y: 0.11, z: -53.5 }, // Past Home goal line (< -52.5m)
      velocity: { x: 0, y: 0, z: -5 },
      spin: { x: 0, y: 0, z: 0 },
      possessionPlayerId: null,
      lastTouchedTeam: 0, // Touched by Home (defending)
      lastTouchedPlayerId: null,
      isInPlay: true,
    }

    const decision = referee.checkBallOut(ball, { x: 10, y: 0.11, z: -52.0 }, 0)
    expect(decision.type).toBe('corner')
    expect(decision.teamIndex).toBe(1) // Corner awarded to Away team
  })
})

describe('MatchClock', () => {
  it('increments minute as time elapses', () => {
    const clock = new MatchClock(1) // 1 minute real time = 45 game minutes
    expect(clock.getMinute()).toBe(1)

    // Tick forward 20 seconds (approx 15 game minutes)
    clock.tick(20000)
    expect(clock.getMinute()).toBeGreaterThan(10)
  })

  it('pauses and resumes without advancing time', () => {
    const clock = new MatchClock(4)
    clock.tick(5000)
    const minBefore = clock.getMinute()

    clock.pause()
    expect(clock.isPaused()).toBe(true)
    clock.tick(10000)
    expect(clock.getMinute()).toBe(minBefore)

    clock.resume()
    expect(clock.isPaused()).toBe(false)
  })
})

describe('MatchStateMachine', () => {
  it('manages match lifecycle transitions including set pieces', () => {
    const sm = new MatchStateMachine()
    expect(sm.getPhase()).toBe('PRE_MATCH')

    expect(sm.transition('KICK_OFF')).toBe(true)
    expect(sm.transition('PLAYING')).toBe(true)
    expect(sm.transition('SET_PIECE')).toBe(true)
    expect(sm.transition('PLAYING')).toBe(true)
    expect(sm.transition('PAUSED')).toBe(true)
    expect(sm.transition('PLAYING')).toBe(true)
    expect(sm.transition('HALF_TIME')).toBe(true)
  })

  it('rejects illegal phase jumps', () => {
    const sm = new MatchStateMachine()
    expect(sm.transition('FULL_TIME')).toBe(false) // cannot jump from PRE_MATCH to FULL_TIME
  })
})
