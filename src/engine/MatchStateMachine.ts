import type { MatchPhase } from '../data/types'

export class MatchStateMachine {
  private phase: MatchPhase = 'PRE_MATCH'
  private prevPhaseBeforePause: MatchPhase = 'PLAYING'
  private listeners: Array<(phase: MatchPhase, prev: MatchPhase) => void> = []

  public getPhase(): MatchPhase {
    return this.phase
  }

  public getPrevPhaseBeforePause(): MatchPhase {
    return this.prevPhaseBeforePause
  }

  public canTransitionTo(to: MatchPhase): boolean {
    if (to === this.phase) return false

    if (to === 'PAUSED') {
      return (
        this.phase === 'PRE_MATCH' ||
        this.phase === 'KICK_OFF' ||
        this.phase === 'PLAYING' ||
        this.phase === 'SET_PIECE' ||
        this.phase === 'GOAL_CELEBRATION'
      )
    }

    switch (this.phase) {
      case 'PRE_MATCH':
        return to === 'KICK_OFF' || to === 'PLAYING' || to === 'SET_PIECE'
      case 'KICK_OFF':
        return to === 'PLAYING' || to === 'SET_PIECE'
      case 'PLAYING':
        return (
          to === 'GOAL_CELEBRATION' ||
          to === 'SET_PIECE' ||
          to === 'HALF_TIME' ||
          to === 'FULL_TIME' ||
          to === 'EXTRA_TIME'
        )
      case 'SET_PIECE':
        return (
          to === 'PLAYING' ||
          to === 'HALF_TIME' ||
          to === 'FULL_TIME'
        )
      case 'PAUSED':
        return to === 'PLAYING' || to === 'SET_PIECE' || to === 'KICK_OFF' || to === 'PRE_MATCH'
      case 'GOAL_CELEBRATION':
        return to === 'KICK_OFF' || to === 'PLAYING'
      case 'HALF_TIME':
        return to === 'KICK_OFF' || to === 'PLAYING'
      case 'EXTRA_TIME':
        return to === 'PENALTY_SHOOTOUT' || to === 'FULL_TIME' || to === 'PLAYING'
      case 'PENALTY_SHOOTOUT':
        return to === 'FULL_TIME'
      case 'FULL_TIME':
        return to === 'PRE_MATCH'
      default:
        return false
    }
  }

  public transition(to: MatchPhase): boolean {
    if (!this.canTransitionTo(to)) {
      if (to === 'PRE_MATCH') {
        const prev = this.phase
        this.phase = to
        this.notify(prev)
        return true
      }
      return false
    }

    const prev = this.phase
    if (to === 'PAUSED') {
      this.prevPhaseBeforePause = prev
    }
    this.phase = to
    this.notify(prev)
    return true
  }

  public onTransition(cb: (phase: MatchPhase, prev: MatchPhase) => void): () => void {
    this.listeners.push(cb)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb)
    }
  }

  private notify(prev: MatchPhase): void {
    for (const listener of this.listeners) {
      listener(this.phase, prev)
    }
  }

  public reset(): void {
    const prev = this.phase
    this.phase = 'PRE_MATCH'
    this.prevPhaseBeforePause = 'PLAYING'
    this.notify(prev)
  }
}
