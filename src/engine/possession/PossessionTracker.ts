export class PossessionTracker {
  private homePossessionMs: number = 5000
  private awayPossessionMs: number = 5000
  private currentPossessor: 0 | 1 | null = null

  public setPossession(teamIndex: 0 | 1 | null): void {
    this.currentPossessor = teamIndex
  }

  public update(dtMs: number): void {
    if (this.currentPossessor === 0) {
      this.homePossessionMs += dtMs
    } else if (this.currentPossessor === 1) {
      this.awayPossessionMs += dtMs
    }
  }

  public getPossession(): [number, number] {
    const total = this.homePossessionMs + this.awayPossessionMs
    if (total <= 0) return [50, 50]
    const homePercent = Math.round((this.homePossessionMs / total) * 100)
    const awayPercent = 100 - homePercent
    return [homePercent, awayPercent]
  }

  public reset(): void {
    this.homePossessionMs = 5000
    this.awayPossessionMs = 5000
    this.currentPossessor = null
  }
}
