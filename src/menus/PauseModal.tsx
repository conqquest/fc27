import React from 'react'
import type { Team, MatchStats } from '../data/types'

interface PauseModalProps {
  homeTeam: Team
  awayTeam: Team
  score: [number, number]
  minute: number
  stats: MatchStats
  onResume: () => void
  onRestart: () => void
  onQuit: () => void
}

export const PauseModal: React.FC<PauseModalProps> = ({
  homeTeam,
  awayTeam,
  score,
  minute,
  stats,
  onResume,
  onRestart,
  onQuit,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md font-display p-6 animate-fade-in">
      <div className="bg-ui-dark border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header with Score */}
        <div className="bg-gradient-to-r from-ui-card via-white/5 to-ui-card p-6 border-b border-white/10 text-center">
          <div className="text-xs uppercase font-bold tracking-widest text-ui-accent mb-2">
            Match Paused • {minute}'
          </div>
          <div className="flex items-center justify-center gap-6">
            <div className="text-right flex-1">
              <div className="text-xl font-black text-white">{homeTeam.name}</div>
              <div className="text-xs text-white/50">{homeTeam.league}</div>
            </div>
            <div className="bg-black/60 px-5 py-2 rounded-xl text-3xl font-mono font-black text-ui-accent border border-white/10">
              {score[0]} - {score[1]}
            </div>
            <div className="text-left flex-1">
              <div className="text-xl font-black text-white">{awayTeam.name}</div>
              <div className="text-xs text-white/50">{awayTeam.league}</div>
            </div>
          </div>
        </div>

        {/* Match Statistics Summary */}
        <div className="p-6 border-b border-white/10">
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4 text-center">
            Match Statistics
          </h3>
          <div className="flex flex-col gap-3 text-xs">
            {/* Possession */}
            <div className="flex items-center justify-between text-white/70">
              <span className="font-bold w-12 text-left">{stats.possession[0]}%</span>
              <span className="text-white/40">Possession</span>
              <span className="font-bold w-12 text-right">{stats.possession[1]}%</span>
            </div>
            {/* Shots */}
            <div className="flex items-center justify-between text-white/70">
              <span className="font-bold w-12 text-left">{stats.shots[0]}</span>
              <span className="text-white/40">Total Shots</span>
              <span className="font-bold w-12 text-right">{stats.shots[1]}</span>
            </div>
            {/* Shots on target */}
            <div className="flex items-center justify-between text-white/70">
              <span className="font-bold w-12 text-left">{stats.shotsOnTarget[0]}</span>
              <span className="text-white/40">Shots on Target</span>
              <span className="font-bold w-12 text-right">{stats.shotsOnTarget[1]}</span>
            </div>
            {/* Pass accuracy */}
            <div className="flex items-center justify-between text-white/70">
              <span className="font-bold w-12 text-left">{stats.passAccuracy[0]}%</span>
              <span className="text-white/40">Pass Accuracy</span>
              <span className="font-bold w-12 text-right">{stats.passAccuracy[1]}%</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-ui-card flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full bg-ui-accent hover:bg-ui-accent/80 text-black font-extrabold py-3.5 rounded-xl transition shadow-lg tracking-wider uppercase text-sm cursor-pointer"
          >
            Resume Match
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onRestart}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition border border-white/10 text-xs uppercase tracking-wider cursor-pointer"
            >
              Restart Match
            </button>
            <button
              onClick={onQuit}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold py-3 rounded-xl transition border border-red-500/30 text-xs uppercase tracking-wider cursor-pointer"
            >
              Quit to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
