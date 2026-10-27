import type { Vec3 } from '../../data/types'
import { vec3, clamp } from '../../utils/math'

export class BallPhysics {
  public position: Vec3 = { x: 0, y: 0.11, z: 0 }
  public velocity: Vec3 = { x: 0, y: 0, z: 0 }
  public spin: Vec3 = { x: 0, y: 0, z: 0 }

  public readonly RADIUS = 0.11
  public readonly GRAVITY = -9.81
  public readonly BOUNCE_DAMPING = 0.62
  public readonly ROLLING_FRICTION = 2.5 // deceleration m/s^2 on grass
  public readonly AIR_DRAG = 0.04
  public readonly GROUND_Y = 0.11

  public update(dt: number): void {
    // Clamp dt to avoid physics explosions on lag spikes
    const clampedDt = Math.min(dt, 0.05)

    // Air drag
    const speed = vec3.length(this.velocity)
    if (speed > 0.01) {
      const dragFactor = Math.max(0, 1 - this.AIR_DRAG * speed * clampedDt)
      this.velocity.x *= dragFactor
      this.velocity.z *= dragFactor
    }

    // Magnus effect / curve from spin
    if (Math.abs(this.spin.y) > 0.1 && speed > 2.0) {
      const curveForce = this.spin.y * 0.08 * clampedDt
      const perpX = -this.velocity.z
      const perpZ = this.velocity.x
      this.velocity.x += perpX * curveForce
      this.velocity.z += perpZ * curveForce
      this.spin.y *= Math.max(0, 1 - 0.5 * clampedDt)
    }

    // Gravity
    this.velocity.y += this.GRAVITY * clampedDt

    // Position integration
    this.position.x += this.velocity.x * clampedDt
    this.position.y += this.velocity.y * clampedDt
    this.position.z += this.velocity.z * clampedDt

    // Ground collision & response
    if (this.position.y <= this.GROUND_Y) {
      this.position.y = this.GROUND_Y

      if (this.velocity.y < -0.5) {
        // Bounce
        this.velocity.y = -this.velocity.y * this.BOUNCE_DAMPING
      } else {
        // Rolling on ground
        this.velocity.y = 0
        const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z)
        if (horizontalSpeed > 0.05) {
          const newSpeed = Math.max(0, horizontalSpeed - this.ROLLING_FRICTION * clampedDt)
          const ratio = newSpeed / horizontalSpeed
          this.velocity.x *= ratio
          this.velocity.z *= ratio
        } else {
          this.velocity.x = 0
          this.velocity.z = 0
        }
      }
    }
  }

  public kick(direction: Vec3, power: number, loft: number = 0.1, spin: number = 0): void {
    const dirNorm = vec3.normalize(direction)
    // power is 0 to 100 -> maps to ~0 to 36 m/s (approx 130 km/h max shot)
    const baseSpeed = (clamp(power, 5, 100) / 100) * 34.0
    const loftClamped = clamp(loft, 0, 1)

    const horizontalRatio = Math.cos(loftClamped * 0.7)
    const verticalRatio = Math.sin(loftClamped * 0.7)

    this.velocity = {
      x: dirNorm.x * baseSpeed * horizontalRatio,
      y: baseSpeed * verticalRatio + (loftClamped > 0.05 ? 1.5 : 0),
      z: dirNorm.z * baseSpeed * horizontalRatio,
    }

    this.spin = {
      x: 0,
      y: spin,
      z: 0,
    }
  }

  public applyForce(force: Vec3): void {
    this.velocity = vec3.add(this.velocity, force)
  }

  public setPosition(pos: Vec3): void {
    this.position = { ...pos, y: Math.max(pos.y, this.GROUND_Y) }
    this.velocity = { x: 0, y: 0, z: 0 }
    this.spin = { x: 0, y: 0, z: 0 }
  }

  public getPosition(): Vec3 {
    return { ...this.position }
  }

  public getVelocity(): Vec3 {
    return { ...this.velocity }
  }

  public isGrounded(): boolean {
    return this.position.y <= this.GROUND_Y + 0.05 && Math.abs(this.velocity.y) < 0.2
  }

  public getSpeed(): number {
    return vec3.length(this.velocity)
  }
}
