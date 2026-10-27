import { describe, it, expect } from 'vitest'
import { BallPhysics } from '../../src/engine/physics/BallPhysics'
import { PlayerPhysics } from '../../src/engine/physics/PlayerPhysics'
import type { PlayerAttributes } from '../../src/data/types'

describe('BallPhysics', () => {
  it('initializes at ground level with zero velocity', () => {
    const ball = new BallPhysics()
    expect(ball.getPosition().y).toBeCloseTo(0.11, 2)
    expect(ball.getSpeed()).toBe(0)
    expect(ball.isGrounded()).toBe(true)
  })

  it('falls under gravity when in the air', () => {
    const ball = new BallPhysics()
    ball.setPosition({ x: 0, y: 5.0, z: 0 })
    expect(ball.isGrounded()).toBe(false)

    ball.update(0.1)
    expect(ball.getVelocity().y).toBeLessThan(0)
    expect(ball.getPosition().y).toBeLessThan(5.0)
  })

  it('bounces when striking the ground', () => {
    const ball = new BallPhysics()
    ball.setPosition({ x: 0, y: 0.12, z: 0 })
    ball.velocity = { x: 0, y: -5.0, z: 0 }

    ball.update(0.016)
    expect(ball.getPosition().y).toBeGreaterThanOrEqual(ball.GROUND_Y)
    expect(ball.getVelocity().y).toBeGreaterThan(0) // bounced up
  })

  it('decelerates due to grass rolling friction', () => {
    const ball = new BallPhysics()
    ball.setPosition({ x: 0, y: 0.11, z: 0 })
    ball.velocity = { x: 10, y: 0, z: 0 }

    ball.update(0.1)
    expect(ball.velocity.x).toBeLessThan(10)
    expect(ball.velocity.x).toBeGreaterThan(0)
  })

  it('applies kick velocity correctly', () => {
    const ball = new BallPhysics()
    ball.kick({ x: 0, y: 0, z: 1 }, 80, 0.2)
    expect(ball.velocity.z).toBeGreaterThan(15)
    expect(ball.velocity.y).toBeGreaterThan(2)
  })
})

describe('PlayerPhysics', () => {
  const sampleAttrs: PlayerAttributes = {
    pace: 88,
    acceleration: 88,
    sprintSpeed: 89,
    shooting: 82,
    finishing: 85,
    shotPower: 86,
    longShots: 80,
    passing: 84,
    vision: 85,
    crossing: 80,
    shortPassing: 86,
    longPassing: 82,
    dribbling: 87,
    ballControl: 88,
    agility: 89,
    balance: 85,
    defending: 50,
    interceptions: 50,
    standingTackle: 52,
    slidingTackle: 48,
    strength: 78,
    stamina: 90,
    reactions: 88,
    heading: 75,
    gkDiving: 15,
    gkHandling: 15,
    gkKicking: 15,
    gkPositioning: 15,
    gkReflexes: 15,
  }

  it('accelerates in input direction', () => {
    const player = new PlayerPhysics()
    player.setPosition({ x: 0, y: 0, z: 0 })

    player.update(0.1, { x: 1, y: 0, z: 0 }, false, sampleAttrs)
    expect(player.getVelocity().x).toBeGreaterThan(0)
    expect(player.getPosition().x).toBeGreaterThan(0)
  })

  it('drains stamina during sprinting and recovers while resting', () => {
    const player = new PlayerPhysics()
    expect(player.getStamina()).toBe(100)

    // Sprint forward
    player.update(0.5, { x: 0, y: 0, z: 1 }, true, sampleAttrs)
    expect(player.getStamina()).toBeLessThan(100)
    const drainedStamina = player.getStamina()

    // Stand still (no sprint)
    player.update(0.5, { x: 0, y: 0, z: 0 }, false, sampleAttrs)
    expect(player.getStamina()).toBeGreaterThan(drainedStamina)
  })

  it('turns toward movement direction', () => {
    const player = new PlayerPhysics()
    player.update(0.2, { x: 1, y: 0, z: 0 }, false, sampleAttrs)
    // Moving purely along +X axis corresponds to angle PI/2
    expect(player.getRotation()).toBeGreaterThan(0)
  })
})
