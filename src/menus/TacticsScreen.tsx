import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Save, Check } from 'lucide-react'
import { useTeamStore } from '../store/teamStore'
import { getTeamById } from '../data/teams'
import { FORMATIONS } from '../data/formations'
import type { FormationName, Mentality, PressStyle, Tactics } from '../data/types'

export default function TacticsScreen() {
  const navigate = useNavigate()
  const { homeTeamId } = useTeamStore()
  const team = getTeamById(homeTeamId || 'real-madrid')

  const [tactics, setTactics] = useState<Tactics>(team.tactics)
  const [saved, setSaved] = useState(false)

  const formationKeys = Object.keys(FORMATIONS) as FormationName[]
  const mentalities: Mentality[] = ['ultra-defensive', 'defensive', 'balanced', 'attacking', 'ultra-attacking']
  const pressStyles: PressStyle[] = ['low', 'mid', 'high', 'gegenpressing']

  const activeFormation = FORMATIONS[tactics.formation] || FORMATIONS['4-3-3']

  const handleSave = () => {
    team.tactics = { ...tactics }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
            <h1 className="text-2xl font-black italic tracking-wide">{team.name} — Tactics</h1>
            <p className="text-xs text-white/50">Configure Formation, Team Mentality & Pressing Behavior</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition border cursor-pointer ${
              saved
                ? 'bg-emerald-500 text-black border-emerald-400'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Saved!' : 'Save Tactics'}</span>
          </button>

          <button
            onClick={() => navigate('/match')}
            className="flex items-center gap-2 bg-ui-accent hover:bg-ui-accent/80 text-black px-6 py-2.5 rounded-xl font-extrabold text-sm uppercase tracking-wider transition shadow-lg cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Go to Match</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Pitch on Left, Sliders on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-4 flex-1 overflow-hidden">
        {/* Left: 2D Tactical Pitch Preview */}
        <div className="bg-ui-card/90 border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-ui-accent">
              Formation Pitch Map
            </span>
            <span className="text-xs font-mono text-white/60">Formation: {tactics.formation}</span>
          </div>

          {/* Formations button strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {formationKeys.map((fName) => (
              <button
                key={fName}
                onClick={() => setTactics({ ...tactics, formation: fName })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border cursor-pointer ${
                  tactics.formation === fName
                    ? 'border-ui-accent bg-ui-accent/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {fName}
              </button>
            ))}
          </div>

          {/* 2D Mini Pitch Drawing */}
          <div className="relative flex-1 bg-emerald-950/40 border-2 border-emerald-600/40 rounded-xl my-2 overflow-hidden flex items-center justify-center">
            {/* Center Circle & Lines */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-emerald-500/30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-emerald-500/30" />
            <div className="absolute top-0 bottom-0 left-0 w-16 border-r border-emerald-500/30" />
            <div className="absolute top-0 bottom-0 right-0 w-16 border-l border-emerald-500/30" />

            {/* Players on Pitch */}
            {activeFormation.positions.map((slot) => {
              // defaultX: [-1, 1], defaultZ: [-1, 1]
              // Map defaultZ to horizontal axis (depth), defaultX to vertical axis
              const leftPercent = 50 + slot.defaultZ * 42
              const topPercent = 50 + slot.defaultX * 40

              return (
                <div
                  key={slot.slot}
                  style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                >
                  <div className="w-8 h-8 rounded-full bg-ui-accent text-black font-extrabold text-[11px] flex items-center justify-center shadow-lg border-2 border-white">
                    {slot.position}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-[11px] text-white/40 text-center">
            Formation coordinates define initial player shape on the pitch.
          </div>
        </div>

        {/* Right: Tactical Instructions & Sliders */}
        <div className="bg-ui-card/90 border border-white/10 rounded-2xl p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
          <div className="flex flex-col gap-5">
            {/* Mentality */}
            <div>
              <label className="text-xs font-bold text-white/70 block mb-2 uppercase tracking-wider">
                Team Mentality
              </label>
              <div className="grid grid-cols-3 gap-2">
                {mentalities.map((m) => (
                  <button
                    key={m}
                    onClick={() => setTactics({ ...tactics, mentality: m })}
                    className={`py-2 px-1 rounded-lg text-xs font-semibold capitalize border transition cursor-pointer ${
                      tactics.mentality === m
                        ? 'border-ui-accent bg-ui-accent/20 text-white'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {m.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Pressing Style */}
            <div>
              <label className="text-xs font-bold text-white/70 block mb-2 uppercase tracking-wider">
                Pressing Style
              </label>
              <div className="grid grid-cols-4 gap-2">
                {pressStyles.map((p) => (
                  <button
                    key={p}
                    onClick={() => setTactics({ ...tactics, pressStyle: p })}
                    className={`p-2 rounded-lg text-xs font-semibold capitalize border transition cursor-pointer ${
                      tactics.pressStyle === p
                        ? 'border-ui-accent bg-ui-accent/20 text-white'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Defensive Line Height Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-white/70 uppercase tracking-wider">Defensive Line Depth</span>
                <span className="font-mono text-ui-accent">{tactics.defensiveLineHeight} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={tactics.defensiveLineHeight}
                onChange={(e) =>
                  setTactics({ ...tactics, defensiveLineHeight: parseInt(e.target.value) })
                }
                className="w-full accent-ui-accent cursor-pointer"
              />
            </div>

            {/* Attacking Width Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-white/70 uppercase tracking-wider">Attacking Width</span>
                <span className="font-mono text-ui-accent">{tactics.attackingWidth} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={tactics.attackingWidth}
                onChange={(e) =>
                  setTactics({ ...tactics, attackingWidth: parseInt(e.target.value) })
                }
                className="w-full accent-ui-accent cursor-pointer"
              />
            </div>

            {/* Build-up Speed Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-white/70 uppercase tracking-wider">Build-up Speed</span>
                <span className="font-mono text-ui-accent">{tactics.buildUpSpeed} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={tactics.buildUpSpeed}
                onChange={(e) =>
                  setTactics({ ...tactics, buildUpSpeed: parseInt(e.target.value) })
                }
                className="w-full accent-ui-accent cursor-pointer"
              />
            </div>

            {/* Strategy Toggles */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setTactics({ ...tactics, counterAttack: !tactics.counterAttack })}
                className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  tactics.counterAttack
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                Fast Counter-Attack: {tactics.counterAttack ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={() => setTactics({ ...tactics, possessionFocus: !tactics.possessionFocus })}
                className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  tactics.possessionFocus
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                Possession Focus: {tactics.possessionFocus ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-3 text-xs text-white/40">
            AI players in the match simulation actively evaluate these tactical parameters every frame.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 pt-3 text-xs text-white/50 text-center">
        Tactics are saved per club and loaded into both AI and user-controlled squads.
      </div>
    </div>
  )
}
