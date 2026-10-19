// ─── Core geometric types ───────────────────────────────────────────────────

export interface Vec3 {
  x: number
  y: number
  z: number
}

// ─── Player data ─────────────────────────────────────────────────────────────

export type Position =
  | 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM'
  | 'LM' | 'RM' | 'LW' | 'RW' | 'ST' | 'CF'

export interface PlayerAttributes {
  pace: number           // 0-99
  acceleration: number
  sprintSpeed: number
  shooting: number
  finishing: number
  shotPower: number
  longShots: number
  passing: number
  vision: number
  crossing: number
  shortPassing: number
  longPassing: number
  dribbling: number
  ballControl: number
  agility: number
  balance: number
  defending: number
  interceptions: number
  standingTackle: number
  slidingTackle: number
  strength: number
  stamina: number
  reactions: number
  heading: number
  // Goalkeeper specific
  gkDiving: number
  gkHandling: number
  gkKicking: number
  gkPositioning: number
  gkReflexes: number
}

export interface Player {
  id: string
  name: string
  shortName: string
  shirtNumber: number
  position: Position
  secondaryPositions: Position[]
  nationality: string
  age: number
  height: number           // cm
  weight: number           // kg
  preferredFoot: 'Left' | 'Right' | 'Both'
  overall: number          // 0-99
  attributes: PlayerAttributes
  // Squad roles
  isCaptain?: boolean
  isPenaltyTaker?: boolean
  isFreeKickTaker?: boolean
  isCornerTaker?: boolean
}

// ─── Kit data ────────────────────────────────────────────────────────────────

export type KitPattern =
  | 'solid' | 'vertical-stripes' | 'horizontal-stripes'
  | 'hoops' | 'gradient' | 'sash' | 'halved'

export type CollarStyle = 'round' | 'v-neck' | 'polo' | 'mandarin'

export interface KitColors {
  primary: string      // hex
  secondary: string
  accent: string
  numberColor: string
  numberOutline: string
  shortsColor: string
  socksColor: string
  socksStripe: string
}

export interface Kit {
  id: string
  name: string
  type: 'home' | 'away' | 'third' | 'goalkeeper'
  pattern: KitPattern
  colors: KitColors
  collarStyle: CollarStyle
  sleeveLength: 'short' | 'long'
  hasSleeveStripe: boolean
  sponsorText?: string
  numberFont: 'block' | 'modern' | 'classic'
  showPlayerName: boolean
}

// ─── Formation / tactics ─────────────────────────────────────────────────────

export type FormationName =
  | '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2'
  | '3-4-3' | '4-1-4-1' | '5-3-2'

export interface FormationPosition {
  slot: number
  position: Position
  /** Normalized pitch coords: x [-1,1], z [-1,1] (0,0 = centre) */
  defaultX: number
  defaultZ: number
}

export interface Formation {
  name: FormationName
  positions: FormationPosition[]
}

export type Mentality = 'ultra-defensive' | 'defensive' | 'balanced' | 'attacking' | 'ultra-attacking'
export type PressStyle = 'low' | 'mid' | 'high' | 'gegenpressing'

export interface Tactics {
  formation: FormationName
  mentality: Mentality
  pressStyle: PressStyle
  defensiveLineHeight: number   // 1-10
  attackingWidth: number        // 1-10
  buildUpSpeed: number          // 1-10
  counterAttack: boolean
  possessionFocus: boolean
}

// ─── Team data ───────────────────────────────────────────────────────────────

export interface StadiumMeta {
  name: string
  capacity: number
  city: string
  country: string
  surfaceColor?: string
}

export interface Team {
  id: string
  name: string
  shortName: string           // e.g. "MCI"
  country: string
  league: string
  overallRating: number
  attackRating: number
  defenceRating: number
  squad: Player[]             // up to 23
  startingXI: string[]        // player IDs, 11 entries
  substitutes: string[]       // player IDs
  tactics: Tactics
  homeKit: Kit
  awayKit: Kit
  gkKit: Kit
  badgeUrl?: string
  stadium: StadiumMeta
  colors: { primary: string; secondary: string }
  dataSource: string
  dataUpdated: string
}

// ─── Match state ─────────────────────────────────────────────────────────────

export type MatchPhase =
  | 'PRE_MATCH' | 'KICK_OFF' | 'PLAYING' | 'PAUSED'
  | 'GOAL_CELEBRATION' | 'HALF_TIME' | 'EXTRA_TIME'
  | 'PENALTY_SHOOTOUT' | 'FULL_TIME'

export type SetPieceType =
  | 'NONE' | 'CORNER_LEFT' | 'CORNER_RIGHT'
  | 'THROW_IN' | 'FREE_KICK' | 'PENALTY' | 'GOAL_KICK' | 'KICK_OFF'

export interface MatchEvent {
  id: string
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'FOUL'
        | 'CORNER' | 'OFFSIDE' | 'PENALTY' | 'SAVE' | 'HALF_TIME' | 'FULL_TIME'
  minute: number
  teamId: string
  playerId?: string
  assistPlayerId?: string
  description: string
}

export interface MatchStats {
  possession: [number, number]         // % home, away
  shots: [number, number]
  shotsOnTarget: [number, number]
  corners: [number, number]
  fouls: [number, number]
  yellowCards: [number, number]
  redCards: [number, number]
  offsides: [number, number]
  saves: [number, number]
  passAccuracy: [number, number]
  distanceCovered: [number, number]
}

// ─── In-match player simulation state ────────────────────────────────────────

export type PlayerRole = 'attacker' | 'midfielder' | 'defender' | 'goalkeeper'

export interface SimPlayer {
  id: string
  teamIndex: 0 | 1
  playerData: Player
  position: Vec3
  velocity: Vec3
  rotation: number           // radians, facing direction
  stamina: number            // 0-100
  hasBall: boolean
  isControlled: boolean
  targetPosition: Vec3
  role: PlayerRole
  slotIndex: number          // formation slot
  isOnPitch: boolean
  isSprinting: boolean
}

export interface SimBall {
  position: Vec3
  velocity: Vec3
  spin: Vec3
  possessionPlayerId: string | null
  lastTouchedTeam: 0 | 1 | null
  lastTouchedPlayerId: string | null
  isInPlay: boolean
}

export interface MatchState {
  phase: MatchPhase
  score: [number, number]
  minute: number
  stoppageTime: number
  half: 1 | 2
  setPiece: SetPieceType
  setPieceTeam: 0 | 1 | null
  ball: SimBall
  players: SimPlayer[]
  events: MatchEvent[]
  stats: MatchStats
  controlledPlayerId: string | null
  homeTeam: Team
  awayTeam: Team
  pausedAt: number | null
  elapsedRealMs: number
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface KeyBindings {
  moveForward: string
  moveBackward: string
  moveLeft: string
  moveRight: string
  sprint: string
  shoot: string
  throughBall: string
  crossOrLoft: string
  tackle: string
  toggleRadar: string
  pause: string
}

export interface GraphicsSettings {
  shadows: boolean
  postProcessing: boolean
  crowdDensity: 'low' | 'medium' | 'high'
  grassDetail: boolean
  targetFps: 30 | 60
}

export interface GameSettings {
  keys: KeyBindings
  graphics: GraphicsSettings
  matchDuration: number      // minutes per half
  difficulty: 'amateur' | 'semi-pro' | 'professional' | 'world-class' | 'legendary'
  commentary: boolean
  volume: number
}

// ─── Career ──────────────────────────────────────────────────────────────────

export interface CareerSeason {
  year: number
  teamId: string
  leaguePosition: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  transfersIn: string[]
  transfersOut: string[]
}

export interface CareerSave {
  id: string
  managerName: string
  teamId: string
  currentSeason: CareerSeason
  pastSeasons: CareerSeason[]
  budget: number
  reputation: number
  createdAt: number
  updatedAt: number
}
