import { describe, it, expect } from 'vitest'
import { PassingSystem } from '../../src/engine/possession/PassingSystem'
import { ShootingSystem } from '../../src/engine/possession/ShootingSystem'
import { KitGenerator } from '../../src/rendering/KitGenerator'
import type { SimPlayer, Kit } from '../../src/data/types'

describe('PassingSystem', () => {
  const passing = new PassingSystem()

  const dummyPlayer = (id: string, x: number, z: number, teamIndex: 0 | 1 = 0): SimPlayer => ({
    id,
    teamIndex,
    playerData: {
      id,
      name: id,
      shortName: id,
      shirtNumber: 10,
      position: 'CM',
      secondaryPositions: [],
      nationality: 'Spain',
      age: 25,
      height: 180,
      weight: 75,
      preferredFoot: 'Right',
      overall: 85,
      attributes: {
        pace: 80,
        acceleration: 80,
        sprintSpeed: 80,
        shooting: 75,
        finishing: 75,
        shotPower: 80,
        longShots: 75,
        passing: 88,
        vision: 89,
        crossing: 85,
        shortPassing: 90,
        longPassing: 87,
        dribbling: 85,
        ballControl: 88,
        agility: 82,
        balance: 80,
        defending: 60,
        interceptions: 60,
        standingTackle: 60,
        slidingTackle: 55,
        strength: 75,
        stamina: 88,
        reactions: 85,
        heading: 70,
        gkDiving: 15,
        gkHandling: 15,
        gkKicking: 15,
        gkPositioning: 15,
        gkReflexes: 15,
      },
    },
    position: { x, y: 0, z },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: 0,
    stamina: 100,
    hasBall: false,
    isControlled: false,
    targetPosition: { x, y: 0, z },
    role: 'midfielder',
    slotIndex: 0,
    isOnPitch: true,
    isSprinting: false,
  })

  it('selects best teammate in aim direction with clear lane', () => {
    const passer = dummyPlayer('passer', 0, 0)
    const forwardMate = dummyPlayer('mate1', 0, 15) // Directly forward
    const wideMate = dummyPlayer('mate2', 20, 0) // Sideways

    const target = passing.selectTarget(passer, [passer, forwardMate, wideMate], 0, [])
    expect(target?.id).toBe('mate1')
  })

  it('computes ground pass velocity toward target', () => {
    const from = { x: 0, y: 0.11, z: 0 }
    const to = { x: 0, y: 0.11, z: 20 }
    const vel = passing.computeGroundPass(from, to, 1.0, 88)

    expect(vel.z).toBeGreaterThan(10)
    expect(vel.x).toBeCloseTo(0, 1)
  })
})

describe('ShootingSystem', () => {
  const shooting = new ShootingSystem()

  it('computes shot toward goal center with realistic speed', () => {
    const shooter: SimPlayer = {
      id: 'st',
      teamIndex: 0,
      playerData: {
        id: 'st',
        name: 'Striker',
        shortName: 'Striker',
        shirtNumber: 9,
        position: 'ST',
        secondaryPositions: [],
        nationality: 'France',
        age: 26,
        height: 185,
        weight: 80,
        preferredFoot: 'Right',
        overall: 90,
        attributes: {
          pace: 92,
          acceleration: 92,
          sprintSpeed: 93,
          shooting: 92,
          finishing: 94,
          shotPower: 92,
          longShots: 88,
          passing: 80,
          vision: 82,
          crossing: 78,
          shortPassing: 82,
          longPassing: 75,
          dribbling: 90,
          ballControl: 91,
          agility: 90,
          balance: 86,
          defending: 40,
          interceptions: 40,
          standingTackle: 40,
          slidingTackle: 35,
          strength: 84,
          stamina: 88,
          reactions: 92,
          heading: 84,
          gkDiving: 15,
          gkHandling: 15,
          gkKicking: 15,
          gkPositioning: 15,
          gkReflexes: 15,
        },
      },
      position: { x: 0, y: 0, z: 35 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: 0,
      stamina: 100,
      hasBall: true,
      isControlled: true,
      targetPosition: { x: 0, y: 0, z: 35 },
      role: 'attacker',
      slotIndex: 9,
      isOnPitch: true,
      isSprinting: false,
    }

    const goalCenter = { x: 0, y: 1.2, z: 52.5 }
    const result = shooting.computeShot(shooter, goalCenter, 85, shooter.playerData.attributes)

    expect(result.velocity.z).toBeGreaterThan(15)
    expect(result.power).toBe(85)
  })
})

describe('KitGenerator', () => {
  it('detects color clashes when kits have similar primary color', () => {
    const kitWhite: Kit = {
      id: 'k1',
      name: 'White Kit',
      type: 'home',
      pattern: 'solid',
      colors: {
        primary: '#FFFFFF',
        secondary: '#000000',
        accent: '#D4AF37',
        numberColor: '#000000',
        numberOutline: '#FFFFFF',
        shortsColor: '#FFFFFF',
        socksColor: '#FFFFFF',
        socksStripe: '#000000',
      },
      collarStyle: 'round',
      sleeveLength: 'short',
      hasSleeveStripe: false,
      numberFont: 'modern',
      showPlayerName: true,
    }

    const kitLightGrey: Kit = {
      ...kitWhite,
      id: 'k2',
      colors: {
        ...kitWhite.colors,
        primary: '#EEEEEE',
      },
    }

    const kitNavy: Kit = {
      ...kitWhite,
      id: 'k3',
      colors: {
        ...kitWhite.colors,
        primary: '#0A192F',
      },
    }

    expect(KitGenerator.isClashing(kitWhite, kitLightGrey)).toBe(true)
    expect(KitGenerator.isClashing(kitWhite, kitNavy)).toBe(false)
  })
})
