export class MatchClock {
  private halfDurationMs: number
  private elapsedRealMs: number = 0
  private isClockPaused: boolean = false
  private stoppageMinutes: number = 2
  private half: 1 | 2 | 3 | 4 = 1
  private extraTimeEnabled: boolean = false

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
    this.stoppageMinutes = Math.max(this.stoppageMinutes, minutes)
  }

  public getStoppageTime(): number {
    return this.stoppageMinutes
  }

  public enableExtraTime(): void {
    this.extraTimeEnabled = true
  }

  public getMinute(): number {
    const fraction = this.elapsedRealMs / this.halfDurationMs
    let baseMinute = 0
    let regularCap = 45

    if (this.half === 1) {
      baseMinute = 0
      regularCap = 45
    } else if (this.half === 2) {
      baseMinute = 45
      regularCap = 90
    } else if (this.half === 3) {
      baseMinute = 90
      regularCap = 105
    } else {
      baseMinute = 105
      regularCap = 120
    }

    const addedGameMinutes = fraction * (this.half <= 2 ? 45 : 15)
    const current = Math.floor(baseMinute + addedGameMinutes) + 1
    const maxMinute = regularCap + this.stoppageMinutes
    return Math.min(maxMinute, Math.max(1, current))
  }

  public getHalf(): 1 | 2 | 3 | 4 {
    return this.half
  }

  public isHalfOver(): boolean {
    const fraction = this.elapsedRealMs / this.halfDurationMs
    const periodDuration = this.half <= 2 ? 45 : 15
    const addedGameMinutes = fraction * periodDuration
    return addedGameMinutes >= periodDuration + this.stoppageMinutes
  }

  public isMatchOver(): boolean {
    if (this.extraTimeEnabled) {
      return this.half === 4 && this.isHalfOver()
    }
    return this.half === 2 && this.isHalfOver()
  }

  public startSecondHalf(): void {
    this.half = 2
    this.elapsedRealMs = 0
    this.stoppageMinutes = 3
    this.isClockPaused = false
  }

  public startExtraTime(): void {
    this.extraTimeEnabled = true
    this.half = 3
    this.elapsedRealMs = 0
    this.stoppageMinutes = 1
    this.isClockPaused = false
  }

  public startSecondExtraTimeHalf(): void {
    this.half = 4
    this.elapsedRealMs = 0
    this.stoppageMinutes = 1
    this.isClockPaused = false
  }

  public reset(): void {
    this.half = 1
    this.elapsedRealMs = 0
    this.isClockPaused = false
    this.stoppageMinutes = 2
    this.extraTimeEnabled = false
  }
}
