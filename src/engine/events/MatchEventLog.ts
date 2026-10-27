import type { MatchEvent } from '../../data/types'
import { generateId } from '../../utils/ids'

export class MatchEventLog {
  private events: MatchEvent[] = []

  public addEvent(
    type: MatchEvent['type'],
    minute: number,
    teamId: string,
    description: string,
    playerId?: string,
    assistPlayerId?: string
  ): MatchEvent {
    const event: MatchEvent = {
      id: generateId('evt'),
      type,
      minute,
      teamId,
      playerId,
      assistPlayerId,
      description,
    }
    this.events.push(event)
    return event
  }

  public getEvents(): MatchEvent[] {
    return [...this.events]
  }

  public clear(): void {
    this.events = []
  }
}
