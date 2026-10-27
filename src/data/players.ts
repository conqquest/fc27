import type { Player } from './types'
import { TEAMS } from './teams'

export const ALL_PLAYERS: Player[] = TEAMS.flatMap((team) => team.squad)

export function getPlayerById(id: string): Player | undefined {
  return ALL_PLAYERS.find((p) => p.id === id)
}

export function searchPlayers(query: string): Player[] {
  const q = query.toLowerCase()
  return ALL_PLAYERS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.shortName.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q) ||
      p.nationality.toLowerCase().includes(q)
  )
}
