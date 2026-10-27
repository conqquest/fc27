import React from 'react'
import type { Team, MatchStats } from '../data/types'

interface HalfTimeModalProps {
  homeTeam: Team
  awayTeam: Team
  score: [number, number]
  stats: MatchStats
  onStartSecondHalf: () => void
  onQuit: () => void
}

export const HalfTimeModal: React.FC<HalfTimeModalProps> = ({
  homeTeam,
  awayTeam,
  score,
  stats,
  onStartSecondHalf,
  onQuit,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md font-display p-6 animate-fade-in">
      <div className="bg-ui-dark border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-ui-card via-white/5 to-ui-card p-6 border-b border-white/10 text-center">
          <div className="text-xs uppercase font-extrabold tracking-widest text-ui-gold mb-2">
            Half Time
          </div>
          <div className="flex items-center justify-center gap-6">
            <div className="text-right flex-1">
              <div className="text-xl font-black text-white">{homeTeam.name}</div>
            </div>
            <div className="bg-black/60 px-5 py-2 rounded-xl text-3xl font-mono font-black text-ui-accent border border-white/10">
              {score[0]} - {score[1]}
            </div>
            <div className="text-left flex-1">
              <div className="text-xl font-black text-white">{awayTeam.name}</div>
            </div>
          </div>
        </div>

        {/* 1st Half Statistics */}
        <div className="p-6 border-b border-white/10 flex flex-col gap-3 text-xs">
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
            <span className="text-white/40">On Target</span>
            <span className="font-bold w-12 text-right">{stats.shotsOnTarget[1]}</span>
          </div>
        </div>

        <div className="p-6 bg-ui-card flex flex-col gap-3">
          <button
            onClick={onStartSecondHalf}
            className="w-full bg-ui-accent hover:bg-ui-accent/80 text-black font-extrabold py-3.5 rounded-xl transition shadow-lg tracking-wider uppercase text-sm cursor-pointer"
          >
            Start 2nd Half
          </button>
          <button
            onClick={onQuit}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition border border-white/10 text-xs uppercase tracking-wider cursor-pointer"
          >
            End Match & Quit
          </button>
        </div>
      </div>
    </div>
  )
}
