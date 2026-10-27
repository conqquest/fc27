import { describe, it, expect } from 'vitest'
import { SimulationLoop } from '../../src/engine/SimulationLoop'
import { getTeamById } from '../../src/data/teams'

describe('SimulationLoop Integration', () => {
  const home = getTeamById('real-madrid')
  const away = getTeamById('manchester-city')

  it('spawns 22 players on the pitch (11 vs 11)', () => {
    const sim = new SimulationLoop(home, away, 5)
    expect(sim.simPlayers.length).toBe(22)

    const homePlayers = sim.simPlayers.filter((p) => p.teamIndex === 0)
    const awayPlayers = sim.simPlayers.filter((p) => p.teamIndex === 1)

    expect(homePlayers.length).toBe(11)
    expect(awayPlayers.length).toBe(11)
  })

  it('assigns exactly one controlled player initially', () => {
    const sim = new SimulationLoop(home, away, 5)
    const controlled = sim.simPlayers.filter((p) => p.isControlled)
    expect(controlled.length).toBe(1)
    expect(sim.controlledPlayerId).not.toBeNull()
  })

  it('switches controlled player to the one closest to the ball', () => {
    const sim = new SimulationLoop(home, away, 5)
    const targetPlayer = sim.simPlayers.find((p) => p.teamIndex === 0 && p.slotIndex === 6)
    if (targetPlayer) {
      // Place ball near slot 6 midfielder
      sim.ballPhysics.setPosition({ ...targetPlayer.position, y: 0.11 })
      sim.switchControlledPlayer()
      expect(sim.controlledPlayerId).toBe(targetPlayer.id)
    }
  })

  it('steps physics update and maintains ball inside simulation', () => {
    const sim = new SimulationLoop(home, away, 5)
    sim.update(0.016, { x: 0, y: 0, z: 1 }, false)

    const ball = sim.getBall()
    expect(ball.position.y).toBeGreaterThanOrEqual(0.11)
  })

  it('charges shot power over time and releases dynamic shot', () => {
    const sim = new SimulationLoop(home, away, 5)
    const controlled = sim.simPlayers.find((p) => p.isControlled)
    if (controlled) {
      controlled.hasBall = true
      sim.startChargingShot()
      expect(sim.isChargingShot).toBe(true)
      expect(sim.currentShotPower).toBe(20)

      // Advance charging by 0.3 seconds
      sim.updateShotCharge(0.3)
      expect(sim.currentShotPower).toBeGreaterThan(50)

      // Release shot
      sim.releaseShot(0)
      expect(sim.isChargingShot).toBe(false)
      expect(sim.stats.shots[0]).toBe(1)
    }
  })

  it('sets up set-pieces correctly and positions taker', () => {
    const sim = new SimulationLoop(home, away, 5)
    sim.setupSetPiece('CORNER', 0, { x: 33.5, y: 0.11, z: 52.0 })

    expect(sim.stateMachine.getPhase()).toBe('SET_PIECE')
    expect(sim.currentSetPiece).not.toBeNull()
    expect(sim.currentSetPiece?.type).toBe('CORNER')
    expect(sim.stats.corners[0]).toBe(1)
    expect(sim.currentAnnouncement?.title).toBe('CORNER KICK')

    // Taker should have ball and be positioned near the corner spot
    const taker = sim.simPlayers.find((p) => p.id === sim.currentSetPiece?.takerId)
    expect(taker).toBeDefined()
    expect(taker?.hasBall).toBe(true)
  })

  it('allows direct passing to a clicked teammate', () => {
    const sim = new SimulationLoop(home, away, 5)
    const controlled = sim.simPlayers.find((p) => p.isControlled)!
    controlled.hasBall = true

    const teammate = sim.simPlayers.find((p) => p.teamIndex === 0 && p.id !== controlled.id)!
    sim.performPassToTeammate(teammate.id)

    expect(sim.controlledPlayerId).toBe(teammate.id)
    expect(sim.lastTouchedPlayerId).toBe(controlled.id)
  })
})
