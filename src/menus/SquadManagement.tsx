import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Shield, UserCheck } from 'lucide-react'
import { useTeamStore } from '../store/teamStore'
import { getTeamById } from '../data/teams'
import type { Player } from '../data/types'

export default function SquadManagement() {
  const navigate = useNavigate()
  const { homeTeamId } = useTeamStore()
  const team = getTeamById(homeTeamId || 'real-madrid')

  const [selectedPlayer, setSelectedPlayer] = useState<Player>(team.squad[0])
  const [captainId, setCaptainId] = useState<string>(team.startingXI[0])

  const startingPlayers = team.startingXI
    .map((id) => team.squad.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined)

  const benchPlayers = team.substitutes
    .map((id) => team.squad.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined)

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
            <h1 className="text-2xl font-black italic tracking-wide">{team.name} — Squad</h1>
            <p className="text-xs text-white/50">Formation: {team.tactics.formation} • Starting XI & Bench</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/match')}
          className="flex items-center gap-2 bg-ui-accent hover:bg-ui-accent/80 text-black px-6 py-2.5 rounded-xl font-extrabold text-sm uppercase tracking-wider transition shadow-lg cursor-pointer"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>Go to Match</span>
        </button>
      </div>

      {/* Main Content: Pitch Lineup + Player Card Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4 flex-1 overflow-hidden">
        {/* Left: Starting XI List */}
        <div className="bg-ui-card/80 border border-white/10 rounded-2xl p-4 overflow-y-auto flex flex-col gap-2">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-ui-accent mb-2">
            Starting XI (11)
          </h2>
          {startingPlayers.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPlayer(p)}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                selectedPlayer.id === p.id
                  ? 'border-ui-accent bg-ui-accent/15'
                  : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-mono font-bold text-xs text-ui-accent">
                  {p.shirtNumber}
                </span>
                <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-white/80">
                  {p.position}
                </span>
                <span className="text-xs font-extrabold truncate">{p.name}</span>
                {captainId === p.id && (
                  <span className="text-[9px] bg-ui-gold text-black font-black px-1.5 py-0.2 rounded">
                    C
                  </span>
                )}
              </div>
              <span className="font-mono font-bold text-xs text-emerald-400">{p.overall}</span>
            </div>
          ))}

          <h2 className="text-xs font-extrabold uppercase tracking-widest text-white/50 mt-4 mb-2">
            Substitutes
          </h2>
          {benchPlayers.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPlayer(p)}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                selectedPlayer.id === p.id
                  ? 'border-ui-accent bg-ui-accent/15'
                  : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-mono font-bold text-xs text-white/50">
                  {p.shirtNumber}
                </span>
                <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-white/80">
                  {p.position}
                </span>
                <span className="text-xs font-medium truncate">{p.name}</span>
              </div>
              <span className="font-mono font-bold text-xs text-white/70">{p.overall}</span>
            </div>
          ))}
        </div>

        {/* Center / Right: Detailed FC27 Player Card Inspector */}
        <div className="lg:col-span-2 bg-ui-card/90 border border-white/10 rounded-2xl p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Top Card Hero */}
            <div className="flex items-start justify-between border-b border-white/10 pb-6 mb-6">
              <div className="flex items-center gap-5">
                <div className="w-20 h-24 bg-gradient-to-br from-ui-accent/30 to-black/60 border-2 border-ui-accent/40 rounded-xl flex flex-col items-center justify-center p-2 shadow-xl">
                  <span className="text-2xl font-black font-mono leading-none text-white">
                    {selectedPlayer.overall}
                  </span>
                  <span className="text-xs font-bold text-ui-accent tracking-widest mt-1">
                    {selectedPlayer.position}
                  </span>
                  <span className="text-[10px] text-white/50 mt-1 font-mono">
                    #{selectedPlayer.shirtNumber}
                  </span>
                </div>

                <div>
                  <h2 className="text-3xl font-black italic tracking-wide">{selectedPlayer.name}</h2>
                  <div className="flex items-center gap-4 text-xs text-white/60 mt-2">
                    <span>Nationality: <strong className="text-white">{selectedPlayer.nationality}</strong></span>
                    <span>Age: <strong className="text-white">{selectedPlayer.age}</strong></span>
                    <span>Foot: <strong className="text-white">{selectedPlayer.preferredFoot}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCaptainId(selectedPlayer.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  captainId === selectedPlayer.id
                    ? 'bg-ui-gold text-black border-ui-gold'
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{captainId === selectedPlayer.id ? 'Captain' : 'Make Captain'}</span>
              </button>
            </div>

            {/* Core Gameplay Attributes Grid */}
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-ui-accent mb-4">
              Core Attributes (Impacts Gameplay In-Engine)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Pace', val: selectedPlayer.attributes.pace },
                { label: 'Shooting', val: selectedPlayer.attributes.shooting },
                { label: 'Passing', val: selectedPlayer.attributes.passing },
                { label: 'Dribbling', val: selectedPlayer.attributes.dribbling },
                { label: 'Defending', val: selectedPlayer.attributes.defending },
                { label: 'Physicality', val: selectedPlayer.attributes.strength },
                { label: 'Sprint Speed', val: selectedPlayer.attributes.sprintSpeed },
                { label: 'Finishing', val: selectedPlayer.attributes.finishing },
                { label: 'Short Passing', val: selectedPlayer.attributes.shortPassing },
                { label: 'Ball Control', val: selectedPlayer.attributes.ballControl },
                { label: 'Stamina', val: selectedPlayer.attributes.stamina },
                { label: 'Vision', val: selectedPlayer.attributes.vision },
              ].map((attr) => (
                <div key={attr.label} className="bg-white/5 border border-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/70">{attr.label}</span>
                    <span className="font-mono font-bold text-sm text-white">{attr.val}</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        attr.val >= 85 ? 'bg-emerald-400' : attr.val >= 75 ? 'bg-ui-accent' : 'bg-ui-gold'
                      }`}
                      style={{ width: `${attr.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 text-xs text-white/40 flex items-center justify-between">
            <span>Player attributes dictate acceleration, shot accuracy, passing curl, and stamina drain.</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-white/50">
        <span>Click player in the left column to inspect and configure roles</span>
        <button
          onClick={() => navigate('/tactics')}
          className="text-ui-accent hover:underline cursor-pointer"
        >
          Adjust Formations & Tactics →
        </button>
      </div>
    </div>
  )
}
