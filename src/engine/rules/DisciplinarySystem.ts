import type { SimPlayer } from '../../data/types'

export interface CardRecord {
  playerId: string
  teamIndex: 0 | 1
  yellowCards: number
  isRedCarded: boolean
  expelledMinute?: number
  reason: string
}

export interface CardResult {
  isExpelled: boolean
  cardType: 'yellow' | 'second_yellow_red' | 'red'
  player: SimPlayer
  message: string
}

export class DisciplinarySystem {
  private records: Map<string, CardRecord> = new Map()

  public issueCard(
    player: SimPlayer,
    card: 'yellow' | 'red',
    reason: string,
    minute: number
  ): CardResult {
    let record = this.records.get(player.id)
    if (!record) {
      record = {
        playerId: player.id,
        teamIndex: player.teamIndex,
        yellowCards: 0,
        isRedCarded: false,
        reason,
      }
      this.records.set(player.id, record)
    }

    if (card === 'red') {
      record.isRedCarded = true
      record.expelledMinute = minute
      record.reason = reason
      player.isOnPitch = false
      player.isRedCarded = true
      return {
        isExpelled: true,
        cardType: 'red',
        player,
        message: `RED CARD: ${player.playerData.name} sent off! (${reason})`,
      }
    }

    // Yellow card issued
    record.yellowCards += 1
    player.yellowCards = record.yellowCards

    if (record.yellowCards >= 2) {
      // Second yellow -> Red card!
      record.isRedCarded = true
      record.expelledMinute = minute
      record.reason = `${reason} (Second Yellow)`
      player.isOnPitch = false
      player.isRedCarded = true
      return {
        isExpelled: true,
        cardType: 'second_yellow_red',
        player,
        message: `SECOND YELLOW & RED CARD: ${player.playerData.name} is sent off!`,
      }
    }

    return {
      isExpelled: false,
      cardType: 'yellow',
      player,
      message: `YELLOW CARD: ${player.playerData.name} booked (${reason})`,
    }
  }

  public isExpelled(playerId: string): boolean {
    return this.records.get(playerId)?.isRedCarded ?? false
  }

  public getYellowCards(playerId: string): number {
    return this.records.get(playerId)?.yellowCards ?? 0
  }

  public getAllRecords(): CardRecord[] {
    return Array.from(this.records.values())
  }

  public reset(): void {
    this.records.clear()
  }
}
