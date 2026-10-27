import React from 'react'
import type { Team, MatchPhase, MatchStats, SimPlayer, Vec3 } from '../data/types'
import { Radar } from './Radar'
import { PlayerIndicator } from './PlayerIndicator'

interface MatchHUDProps {
  homeTeam: Team
  awayTeam: Team
  score: [number, number]
  minute: number
  half: 1 | 2
  phase: MatchPhase
  stats: MatchStats
  controlledPlayer: SimPlayer | null
  players: SimPlayer[]
  ballPosition: Vec3
  showRadar: boolean
  onPauseToggle: () => void
}

export const MatchHUD: React.FC<MatchHUDProps> = ({
  homeTeam,
  awayTeam,
  score,
  minute,
  half,
  phase,
  stats,
  controlledPlayer,
  players,
  ballPosition,
  showRadar,
  onPauseToggle,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-display">
      {/* ─── Top Left: Broadcast Scoreboard ─── */}
      <div className="absolute top-5 left-6 flex items-center pointer-events-auto">
        <div className="flex items-center bg-ui-dark/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden text-white">
          {/* Home team */}
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            <span
              className="w-3 h-3 rounded-full border border-white/30"
              style={{ backgroundColor: homeTeam.colors.primary }}
            />
            <span className="font-extrabold text-sm tracking-wider">{homeTeam.shortName}</span>
          </div>

          {/* Live Score */}
          <div className="bg-black/60 px-4 py-2.5 font-mono font-black text-lg text-ui-accent flex items-center gap-2 border-x border-white/10">
            <span>{score[0]}</span>
            <span className="text-white/40">-</span>
            <span>{score[1]}</span>
          </div>

          {/* Away team */}
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            <span className="font-extrabold text-sm tracking-wider">{awayTeam.shortName}</span>
            <span
              className="w-3 h-3 rounded-full border border-white/30"
              style={{ backgroundColor: awayTeam.colors.primary }}
            />
          </div>

          {/* Minute & Half */}
          <div className="bg-white/10 px-3 py-2.5 text-xs font-mono font-bold text-white/90 border-l border-white/10 flex items-center gap-1.5">
            <span>{minute}'</span>
            <span className="text-[10px] text-white/50">{half === 1 ? '1H' : '2H'}</span>
          </div>
        </div>

        {/* Pause Button */}
        <button
          onClick={onPauseToggle}
          className="ml-3 bg-ui-dark/85 backdrop-blur-md hover:bg-white/20 text-white/80 hover:text-white px-3 py-2.5 rounded-xl border border-white/10 text-xs font-semibold tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span>ESC</span>
          <span>PAUSE</span>
        </button>
      </div>

      {/* ─── Top Center: Possession Bar ─── */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-ui-dark/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 shadow-xl flex items-center gap-3">
        <span className="text-xs font-bold font-mono" style={{ color: homeTeam.colors.primary }}>
          {stats.possession[0]}%
        </span>
        <div className="w-28 h-2 bg-white/15 rounded-full overflow-hidden flex">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${stats.possession[0]}%`, backgroundColor: homeTeam.colors.primary }}
          />
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${stats.possession[1]}%`, backgroundColor: awayTeam.colors.primary }}
          />
        </div>
        <span className="text-xs font-bold font-mono" style={{ color: awayTeam.colors.primary }}>
          {stats.possession[1]}%
        </span>
      </div>

      {/* ─── Goal Celebration Banner ─── */}
      {phase === 'GOAL_CELEBRATION' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in pointer-events-none">
          <div className="bg-gradient-to-r from-ui-dark via-ui-accent/20 to-ui-dark border-y-2 border-ui-accent py-8 px-24 text-center transform scale-110 shadow-2xl">
            <h1 className="text-6xl font-black italic tracking-widest text-white drop-shadow-[0_4px_16px_rgba(0,212,255,0.8)] animate-pulse">
              GOAL!
            </h1>
            <p className="text-lg text-ui-accent font-bold mt-2 tracking-widest uppercase">
              What a strike!
            </p>
          </div>
        </div>
      )}

      {/* ─── Bottom Left: Player Card & Stamina ─── */}
      <div className="absolute bottom-6 left-6">
        <PlayerIndicator player={controlledPlayer} />
      </div>

      {/* ─── Bottom Center: Tactical Radar ─── */}
      {showRadar && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <Radar
            players={players}
            ballPosition={ballPosition}
            homeColor={homeTeam.colors.primary}
            awayColor={awayTeam.colors.primary}
          />
        </div>
      )}

      {/* ─── Bottom Right: Key Controls Helper ─── */}
      <div className="absolute bottom-6 right-6 bg-ui-dark/80 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl text-white/70 text-xs flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-white/90">W A S D</span>
          <span>Move</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-white/90">Shift</span>
          <span>Sprint</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-white/90">L-Click</span>
          <span>Pass</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-white/90">E</span>
          <span>Shoot</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-white/90">Q / F</span>
          <span>Through / Cross</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-white/90">R-Click</span>
          <span>Switch Player</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-white/90">Space</span>
          <span>Tackle</span>
        </div>
      </div>
    </div>
  )
}
