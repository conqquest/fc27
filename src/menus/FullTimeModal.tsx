import React from 'react'
import type { Team, MatchStats } from '../data/types'

interface FullTimeModalProps {
  homeTeam: Team
  awayTeam: Team
  score: [number, number]
  stats: MatchStats
  onRematch: () => void
  onQuit: () => void
}

export const FullTimeModal: React.FC<FullTimeModalProps> = ({
  homeTeam,
  awayTeam,
  score,
  stats,
  onRematch,
  onQuit,
}) => {
  const isDraw = score[0] === score[1]
  const winner = score[0] > score[1] ? homeTeam : awayTeam

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg font-display p-6 animate-fade-in">
      <div className="bg-ui-dark border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Banner */}
        <div className="bg-gradient-to-r from-ui-card via-ui-accent/15 to-ui-card p-6 border-b border-white/10 text-center">
          <div className="text-xs uppercase font-extrabold tracking-widest text-ui-green mb-1">
            Full Time
          </div>
          <div className="text-2xl font-black text-white mb-3">
            {isDraw ? 'Match Drawn!' : `${winner.name} Wins!`}
          </div>

          <div className="flex items-center justify-center gap-6">
            <div className="text-right flex-1">
              <div className="text-lg font-black text-white">{homeTeam.name}</div>
            </div>
            <div className="bg-black/60 px-6 py-2.5 rounded-xl text-4xl font-mono font-black text-ui-accent border border-white/10">
              {score[0]} - {score[1]}
            </div>
            <div className="text-left flex-1">
              <div className="text-lg font-black text-white">{awayTeam.name}</div>
            </div>
          </div>
        </div>

        {/* Full Match Statistics */}
        <div className="p-6 border-b border-white/10 flex flex-col gap-3.5 text-xs">
          <h3 className="font-bold text-white/80 uppercase tracking-wider text-center mb-1">
            Final Match Statistics
          </h3>
          <div className="flex items-center justify-between text-white/70">
            <span className="font-bold w-12 text-left">{stats.possession[0]}%</span>
            <span className="text-white/40">Possession</span>
            <span className="font-bold w-12 text-right">{stats.possession[1]}%</span>
          </div>
          <div className="flex items-center justify-between text-white/70">
            <span className="font-bold w-12 text-left">{stats.shots[0]}</span>
            <span className="text-white/40">Shots</span>
            <span className="font-bold w-12 text-right">{stats.shots[1]}</span>
          </div>
          <div className="flex items-center justify-between text-white/70">
            <span className="font-bold w-12 text-left">{stats.shotsOnTarget[0]}</span>
            <span className="text-white/40">Shots on Target</span>
            <span className="font-bold w-12 text-right">{stats.shotsOnTarget[1]}</span>
          </div>
          <div className="flex items-center justify-between text-white/70">
            <span className="font-bold w-12 text-left">{stats.passAccuracy[0]}%</span>
            <span className="text-white/40">Pass Accuracy</span>
            <span className="font-bold w-12 text-right">{stats.passAccuracy[1]}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-ui-card flex flex-col gap-3">
          <button
            onClick={onRematch}
            className="w-full bg-ui-accent hover:bg-ui-accent/80 text-black font-extrabold py-3.5 rounded-xl transition shadow-lg tracking-wider uppercase text-sm cursor-pointer"
          >
            Rematch
          </button>
          <button
            onClick={onQuit}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition border border-white/10 text-xs uppercase tracking-wider cursor-pointer"
          >
            Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  )
}
