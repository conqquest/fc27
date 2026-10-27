import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Trophy, Swords } from 'lucide-react'
import { TEAMS } from '../data/teams'
import { useTeamStore } from '../store/teamStore'

interface Fixture {
  id: string
  teamA: string
  teamB: string
  scoreA: number | null
  scoreB: number | null
  completed: boolean
}

export default function TournamentMenu() {
  const navigate = useNavigate()
  const { setHomeTeam, setAwayTeam } = useTeamStore()

  // 8 teams knockout tournament
  const [fixtures, setFixtures] = useState<Fixture[]>([
    { id: 'qf1', teamA: 'real-madrid', teamB: 'bayern-munich', scoreA: null, scoreB: null, completed: false },
    { id: 'qf2', teamA: 'manchester-city', teamB: 'inter', scoreA: null, scoreB: null, completed: false },
    { id: 'qf3', teamA: 'barcelona', teamB: 'psg', scoreA: null, scoreB: null, completed: false },
    { id: 'qf4', teamA: 'arsenal', teamB: 'liverpool', scoreA: null, scoreB: null, completed: false },
  ])

  const getTeam = (id: string) => TEAMS.find((t) => t.id === id) || TEAMS[0]

  const handlePlayFixture = (fix: Fixture) => {
    setHomeTeam(fix.teamA)
    setAwayTeam(fix.teamB)
    navigate('/match')
  }

  const handleSimulateFixture = (fixId: string) => {
    setFixtures((prev) =>
      prev.map((f) => {
        if (f.id === fixId) {
          const sA = Math.floor(Math.random() * 4)
          let sB = Math.floor(Math.random() * 4)
          if (sA === sB) sB += 1
          return { ...f, scoreA: sA, scoreB: sB, completed: true }
        }
        return f
      })
    )
  }

  return (
    <div className="relative w-screen h-screen bg-ui-dark text-white font-display overflow-hidden flex flex-col justify-between p-8 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black italic tracking-wide">Champions Knockout Tournament</h1>
            <p className="text-xs text-white/50">8 Elite Clubs • Single Elimination Bracket</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-ui-gold/20 text-ui-gold border border-ui-gold/40 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
          <Trophy className="w-4 h-4" />
          <span>Quarter-Finals Stage</span>
        </div>
      </div>

      {/* Bracket Grid */}
      <div className="my-auto max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
        {fixtures.map((fix, idx) => {
          const tA = getTeam(fix.teamA)
          const tB = getTeam(fix.teamB)

          return (
            <div
              key={fix.id}
              className="bg-ui-card/90 border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between text-xs font-bold text-white/50 uppercase tracking-wider border-b border-white/10 pb-2">
                <span>Fixture #{idx + 1}</span>
                {fix.completed ? (
                  <span className="text-emerald-400">Completed</span>
                ) : (
                  <span className="text-ui-accent">Ready</span>
                )}
              </div>

              {/* Teams & Scores */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/30"
                      style={{ backgroundColor: tA.colors.primary }}
                    />
                    <span className="font-extrabold text-sm">{tA.name}</span>
                  </div>
                  <span className="font-mono font-black text-lg text-white">
                    {fix.scoreA !== null ? fix.scoreA : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/30"
                      style={{ backgroundColor: tB.colors.primary }}
                    />
                    <span className="font-extrabold text-sm">{tB.name}</span>
                  </div>
                  <span className="font-mono font-black text-lg text-white">
                    {fix.scoreB !== null ? fix.scoreB : '-'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {!fix.completed ? (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => handlePlayFixture(fix)}
                    className="flex items-center justify-center gap-1.5 bg-ui-accent hover:bg-ui-accent/80 text-black py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Play</span>
                  </button>
                  <button
                    onClick={() => handleSimulateFixture(fix.id)}
                    className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition border border-white/10 cursor-pointer"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Simulate</span>
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs font-bold text-white/50 pt-2 border-t border-white/10">
                  Winner advances to Semi-Finals
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 pt-3 text-xs text-white/50 text-center">
        Progress through the tournament bracket to lift the European Champions Cup.
      </div>
    </div>
  )
}
