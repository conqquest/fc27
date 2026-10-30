import type { SimBall, Vec3 } from '../../data/types'

export class GoalDetector {
  private lastGoalTimestamp: number = -Infinity
  public readonly GOAL_WIDTH_HALF = 3.66 // 7.32m total width
  public readonly GOAL_HEIGHT = 2.44 // 2.44m high
  public readonly GOAL_LINE_Z = 52.5 // +/- 52.5m
  public readonly BALL_RADIUS = 0.11 // 11cm radius
  private readonly COOLDOWN_MS = 2500 // Prevent multiple triggers for the same goal

  /**
   * Check if whole ball crossed either goal line inside the posts and under crossbar.
   * IFAB Law 10: The whole of the ball must cross the goal line.
   * Returns:
   *  0 -> Home team scored (ball in Away goal at z > +52.5 + BALL_RADIUS)
   *  1 -> Away team scored (ball in Home goal at z < -52.5 - BALL_RADIUS)
   *  null -> No goal
   */
  public check(
    ball: SimBall,
    prevBallPos: Vec3,
    currentTimeMs: number,
    isIndirectPlay: boolean = false,
    isThrowInDirect: boolean = false
  ): 0 | 1 | null {
    if (currentTimeMs - this.lastGoalTimestamp < this.COOLDOWN_MS) {
      return null
    }

    const { x: prevX, y: prevY, z: prevZ } = prevBallPos
    const { x: curX, y: curY, z: curZ } = ball.position

    // IFAB Law 10: Whole ball must cross the goal line
    const awayGoalLineZ = this.GOAL_LINE_Z + this.BALL_RADIUS
    const homeGoalLineZ = -this.GOAL_LINE_Z - this.BALL_RADIUS

    // Check Away Goal (Z = +52.5) -> Home scores (0)
    if (prevZ <= this.GOAL_LINE_Z && curZ >= awayGoalLineZ) {
      const t = (this.GOAL_LINE_Z - prevZ) / (curZ - prevZ || 0.0001)
      const crossX = prevX + (curX - prevX) * t
      const crossY = prevY + (curY - prevY) * t

      if (Math.abs(crossX) <= this.GOAL_WIDTH_HALF && crossY >= 0 && crossY <= this.GOAL_HEIGHT) {
        // Law 13/15: Direct goal cannot be scored from an indirect free kick or throw-in without touching another player
        if (isIndirectPlay || isThrowInDirect) {
          return null
        }
        this.lastGoalTimestamp = currentTimeMs
        return 0
      }
    }

    // Check Home Goal (Z = -52.5) -> Away scores (1)
    if (prevZ >= -this.GOAL_LINE_Z && curZ <= homeGoalLineZ) {
      const t = (-this.GOAL_LINE_Z - prevZ) / (curZ - prevZ || 0.0001)
      const crossX = prevX + (curX - prevX) * t
      const crossY = prevY + (curY - prevY) * t

      if (Math.abs(crossX) <= this.GOAL_WIDTH_HALF && crossY >= 0 && crossY <= this.GOAL_HEIGHT) {
        if (isIndirectPlay || isThrowInDirect) {
          return null
        }
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
