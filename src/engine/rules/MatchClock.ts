export class MatchClock {
  private halfDurationMs: number
  private elapsedRealMs: number = 0
  private isClockPaused: boolean = false
  private stoppageMinutes: number = 2
  private half: 1 | 2 = 1

  // 45 game minutes correspond to halfDurationMinutes of real time
  constructor(halfDurationMinutes: number = 4) {
    this.halfDurationMs = Math.max(1, halfDurationMinutes) * 60 * 1000
  }

  public tick(realDeltaMs: number): void {
    if (this.isClockPaused) return
    this.elapsedRealMs += realDeltaMs
  }

  public pause(): void {
    this.isClockPaused = true
  }

  public resume(): void {
    this.isClockPaused = false
  }

  public isPaused(): boolean {
    return this.isClockPaused
  }

  public addStoppage(minutes: number): void {
    this.stoppageMinutes = minutes
  }

  public getMinute(): number {
    const fraction = this.elapsedRealMs / this.halfDurationMs
    const baseMinute = this.half === 1 ? 0 : 45
    const addedGameMinutes = fraction * 45
    const current = Math.floor(baseMinute + addedGameMinutes) + 1

    const regularCap = this.half === 1 ? 45 : 90
    const maxMinute = regularCap + this.stoppageMinutes
    return Math.min(maxMinute, Math.max(1, current))
  }

  public getHalf(): 1 | 2 {
    return this.half
  }

  public isHalfOver(): boolean {
    const fraction = this.elapsedRealMs / this.halfDurationMs
    const addedGameMinutes = fraction * 45
    return addedGameMinutes >= 45 + this.stoppageMinutes
  }

  public isMatchOver(): boolean {
    return this.half === 2 && this.isHalfOver()
  }

  public startSecondHalf(): void {
    this.half = 2
    this.elapsedRealMs = 0
    this.stoppageMinutes = 3
    this.isClockPaused = false
  }

  public reset(): void {
    this.half = 1
    this.elapsedRealMs = 0
    this.isClockPaused = false
    this.stoppageMinutes = 2
  }
}
