import type { SimBall, Vec3 } from '../../data/types'

export class GoalDetector {
  private lastGoalTimestamp: number = -Infinity
  private readonly GOAL_WIDTH_HALF = 3.66 // 7.32m wide
  private readonly GOAL_HEIGHT = 2.44 // 2.44m high
  private readonly GOAL_LINE_Z = 52.5 // +/- 52.5m
  private readonly COOLDOWN_MS = 2500 // Prevent multiple triggers for the same goal

  /**
   * Check if ball crossed either goal line inside the posts
   * Returns:
   *  0 -> Home team scored (ball in Away goal at z > +52.5)
   *  1 -> Away team scored (ball in Home goal at z < -52.5)
   *  null -> No goal
   */
  public check(
    ball: SimBall,
    prevBallPos: Vec3,
    currentTimeMs: number
  ): 0 | 1 | null {
    if (currentTimeMs - this.lastGoalTimestamp < this.COOLDOWN_MS) {
      return null
    }

    const { x: prevX, y: prevY, z: prevZ } = prevBallPos
    const { x: curX, y: curY, z: curZ } = ball.position

    // Check Away Goal (Z = +52.5) -> Home scores (0)
    if (prevZ <= this.GOAL_LINE_Z && curZ > this.GOAL_LINE_Z) {
      const t = (this.GOAL_LINE_Z - prevZ) / (curZ - prevZ || 0.0001)
      const crossX = prevX + (curX - prevX) * t
      const crossY = prevY + (curY - prevY) * t

      if (Math.abs(crossX) <= this.GOAL_WIDTH_HALF && crossY >= 0 && crossY <= this.GOAL_HEIGHT) {
        this.lastGoalTimestamp = currentTimeMs
        return 0
      }
    }

    // Check Home Goal (Z = -52.5) -> Away scores (1)
    if (prevZ >= -this.GOAL_LINE_Z && curZ < -this.GOAL_LINE_Z) {
      const t = (-this.GOAL_LINE_Z - prevZ) / (curZ - prevZ || 0.0001)
      const crossX = prevX + (curX - prevX) * t
      const crossY = prevY + (curY - prevY) * t

      if (Math.abs(crossX) <= this.GOAL_WIDTH_HALF && crossY >= 0 && crossY <= this.GOAL_HEIGHT) {
        this.lastGoalTimestamp = currentTimeMs
        return 1
      }
    }

    return null
  }

  public reset(): void {
    this.lastGoalTimestamp = -Infinity
  }
}
