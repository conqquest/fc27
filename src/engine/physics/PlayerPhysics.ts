import type { Vec3, PlayerAttributes } from '../../data/types'
import { vec3, clamp, lerp } from '../../utils/math'

export class PlayerPhysics {
  public position: Vec3 = { x: 0, y: 0, z: 0 }
  public velocity: Vec3 = { x: 0, y: 0, z: 0 }
  public rotation: number = 0 // radians
  public stamina: number = 100 // 0-100

  public readonly PLAYER_RADIUS = 0.45
  public readonly BASE_MAX_SPEED = 6.8 // m/s
  public readonly BASE_SPRINT_SPEED = 9.4 // m/s
  public readonly BASE_ACCEL = 24.0 // m/s^2
  public readonly BASE_DECEL = 28.0 // m/s^2
  public readonly TURN_SPEED = 10.0 // rad/s

  public update(
    dt: number,
    inputDir: Vec3,
    isSprinting: boolean,
    attributes: PlayerAttributes
  ): void {
    const clampedDt = Math.min(dt, 0.05)

    // Attribute modifiers
    const paceMod = (attributes.pace - 75) / 100 // e.g. 95 pace -> +0.20
    const accelMod = (attributes.acceleration - 75) / 100
    const agilityMod = (attributes.agility - 75) / 100

    // Target maximum speed based on sprinting and stamina
    const staminaFactor = Math.max(0.65, this.stamina / 100)
    let maxSpeed = this.BASE_MAX_SPEED * (1 + paceMod * 0.25) * staminaFactor

    if (isSprinting && this.stamina > 5) {
      maxSpeed = this.BASE_SPRINT_SPEED * (1 + paceMod * 0.3) * staminaFactor
      // Drain stamina
      const drainRate = 8.5 * (1 - (attributes.stamina - 75) / 150)
      this.stamina = Math.max(0, this.stamina - drainRate * clampedDt)
    } else {
      // Recover stamina
      const recoverRate = 4.0 * (1 + (attributes.stamina - 75) / 150)
      this.stamina = Math.min(100, this.stamina + recoverRate * clampedDt)
    }

    const inputLen = vec3.length(inputDir)

    if (inputLen > 0.05) {
      const dirNorm = vec3.normalize(inputDir)

      // Turn towards input direction
      const targetAngle = Math.atan2(dirNorm.x, dirNorm.z)
      let diff = targetAngle - this.rotation
      while (diff < -Math.PI) diff += Math.PI * 2
      while (diff > Math.PI) diff -= Math.PI * 2

      const maxTurn = (this.TURN_SPEED + agilityMod * 4.0) * clampedDt
      this.rotation += clamp(diff, -maxTurn, maxTurn)

      // Accelerate in input direction
      const accel = this.BASE_ACCEL * (1 + accelMod * 0.3)
      this.velocity.x += dirNorm.x * accel * clampedDt
      this.velocity.z += dirNorm.z * accel * clampedDt

      // Clamp to maxSpeed
      const currentSpeed = Math.hypot(this.velocity.x, this.velocity.z)
      if (currentSpeed > maxSpeed) {
        const ratio = maxSpeed / currentSpeed
        this.velocity.x *= ratio
        this.velocity.z *= ratio
      }
    } else {
      // Decelerate
      const currentSpeed = Math.hypot(this.velocity.x, this.velocity.z)
      if (currentSpeed > 0.05) {
        const newSpeed = Math.max(0, currentSpeed - this.BASE_DECEL * clampedDt)
        const ratio = newSpeed / currentSpeed
        this.velocity.x *= ratio
        this.velocity.z *= ratio
      } else {
        this.velocity.x = 0
        this.velocity.z = 0
      }
    }

    // Integrate position
    this.position.x += this.velocity.x * clampedDt
    this.position.z += this.velocity.z * clampedDt
    this.position.y = 0

    // Pitch bounds clamping (pitch is 105 x 68, boundaries at +/-34 x, +/-52.5 z)
    this.position.x = clamp(this.position.x, -34.5, 34.5)
    this.position.z = clamp(this.position.z, -53.0, 53.0)
  }

  public setPosition(pos: Vec3): void {
    this.position = { x: pos.x, y: 0, z: pos.z }
    this.velocity = { x: 0, y: 0, z: 0 }
  }

  public teleport(pos: Vec3, facingAngle?: number): void {
    this.position = { x: pos.x, y: 0, z: pos.z }
    this.velocity = { x: 0, y: 0, z: 0 }
    if (facingAngle !== undefined) {
      this.rotation = facingAngle
    }
  }

  public getPosition(): Vec3 {
    return { ...this.position }
  }

  public getVelocity(): Vec3 {
    return { ...this.velocity }
  }

  public getRotation(): number {
    return this.rotation
  }

  public getStamina(): number {
    return this.stamina
  }
}
