import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, CheckCircle2, Moon, Sun, Trees, Waves, Building2 } from 'lucide-react'
import { STADIUM_LIST, type StadiumId } from '../data/stadiums'
import { useStadiumStore } from '../store/stadiumStore'
import { useTeamStore } from '../store/teamStore'
import { TEAMS } from '../data/teams'

export default function StadiumSelection() {
  const navigate = useNavigate()
  const { selectedStadiumId, selectStadium } = useStadiumStore()
  const { homeTeamId, awayTeamId } = useTeamStore()

  const currentHome = TEAMS.find((t) => t.id === homeTeamId) || TEAMS[0]
  const currentAway = TEAMS.find((t) => t.id === awayTeamId) || TEAMS[1]

  const getAtmosphereIcon = (atmosphere: 'night' | 'day', id: StadiumId) => {
    if (atmosphere === 'night') return <Moon className="w-4 h-4 text-purple-400" />
    if (id === 'tropical-beach') return <Waves className="w-4 h-4 text-cyan-400" />
    return <Trees className="w-4 h-4 text-emerald-400" />
  }

  // Visual SVG preview artwork tailored to each stadium's aesthetic
  const renderStadiumPreview = (id: StadiumId) => {
    switch (id) {
      case 'neon-metropolis':
        return (
          <div className="relative w-full h-48 bg-gradient-to-b from-[#090a1a] via-[#0f172a] to-[#020617] rounded-xl overflow-hidden border border-purple-500/30 flex items-end justify-center shadow-inner">
            {/* Twinkling Stars & Moon */}
            <div className="absolute top-4 right-6 w-7 h-7 rounded-full bg-yellow-200/90 shadow-[0_0_16px_rgba(254,240,138,0.8)]" />
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#090a1a]" />
            <div className="absolute top-8 left-12 w-1.5 h-1.5 bg-white/80 rounded-full animate-pulse" />
            <div className="absolute top-5 left-36 w-1 h-1 bg-cyan-300/80 rounded-full" />
            <div className="absolute top-12 right-28 w-1 h-1 bg-purple-300/80 rounded-full animate-pulse" />

            {/* Distant Skyscrapers Silhouette with Glowing Windows */}
            <div className="absolute bottom-16 inset-x-0 flex items-end justify-between px-2 gap-1.5 opacity-90">
              <div className="w-10 h-28 bg-[#090d16] border-t-2 border-cyan-400 relative">
                <div className="w-2 h-2 bg-cyan-400/80 m-1 rounded-sm" />
                <div className="w-2 h-2 bg-pink-500/80 m-1 rounded-sm" />
              </div>
              <div className="w-12 h-36 bg-[#0f172a] border-t-2 border-pink-500 relative">
                <div className="absolute top-0 right-1 w-0.5 h-6 bg-red-500 -translate-y-full" />
                <div className="grid grid-cols-2 gap-1 p-1">
                  <div className="w-2 h-1.5 bg-yellow-300/70" />
                  <div className="w-2 h-1.5 bg-cyan-400/80" />
                  <div className="w-2 h-1.5 bg-purple-400/80" />
                  <div className="w-2 h-1.5 bg-yellow-300/70" />
                </div>
              </div>
              <div className="w-14 h-44 bg-[#050814] border-t-2 border-purple-400 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-8 bg-cyan-400 -translate-y-full" />
                <div className="grid grid-cols-3 gap-1 p-1 mt-2">
                  <div className="w-2 h-1 bg-cyan-400" />
                  <div className="w-2 h-1 bg-pink-500" />
                  <div className="w-2 h-1 bg-cyan-400" />
                  <div className="w-2 h-1 bg-yellow-300" />
                  <div className="w-2 h-1 bg-purple-400" />
                  <div className="w-2 h-1 bg-pink-500" />
                </div>
              </div>
              <div className="w-12 h-32 bg-[#111827] border-t-2 border-cyan-400">
                <div className="w-2 h-2 bg-cyan-400/80 m-1.5" />
                <div className="w-2 h-2 bg-yellow-300/80 m-1.5" />
              </div>
              <div className="w-10 h-24 bg-[#090d16] border-t-2 border-pink-400">
                <div className="w-2 h-2 bg-pink-500/80 m-1" />
              </div>
            </div>

            {/* Center Football Ground (Identical Green Pitch illuminated at night) */}
            <div className="relative z-10 w-44 h-14 bg-[#2c8332] border-2 border-white/80 rounded-sm mb-2 shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center justify-center">
              <div className="w-0.5 h-full bg-white/70" />
              <div className="absolute w-8 h-8 border border-white/70 rounded-full" />
              {/* Corner Floodlight Glow */}
              <div className="absolute -top-3 -left-3 w-3 h-3 bg-white rounded-full shadow-[0_0_12px_#ffffff]" />
              <div className="absolute -top-3 -right-3 w-3 h-3 bg-white rounded-full shadow-[0_0_12px_#ffffff]" />
            </div>

            {/* Highway Traffic Stream */}
            <div className="absolute bottom-1 inset-x-0 h-1 bg-gradient-to-r from-cyan-500/40 via-yellow-400/60 to-red-500/50" />
          </div>
        )

      case 'tropical-beach':
        return (
          <div className="relative w-full h-48 bg-gradient-to-b from-[#38bdf8] via-[#7dd3fc] to-[#0284c7] rounded-xl overflow-hidden border border-cyan-500/30 flex items-end justify-center shadow-inner">
            {/* Bright Tropical Sun */}
            <div className="absolute top-4 left-6 w-9 h-9 rounded-full bg-yellow-300 shadow-[0_0_24px_rgba(253,224,71,0.9)]" />
            {/* Fluffy Clouds */}
            <div className="absolute top-6 right-10 w-16 h-5 bg-white/90 rounded-full" />
            <div className="absolute top-8 right-16 w-10 h-4 bg-white/90 rounded-full" />

            {/* Distant Volcanic Island */}
            <div className="absolute bottom-20 right-4 w-28 h-10 bg-[#334155] rounded-t-full border-t border-emerald-500/60" />

            {/* Distant Sailboat */}
            <div className="absolute bottom-20 left-10 flex flex-col items-center">
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-b-[8px] border-b-white border-r-[4px] border-r-transparent" />
              <div className="w-5 h-1 bg-white rounded-sm mt-0.5" />
            </div>

            {/* Sandy Beach Ground */}
            <div className="absolute bottom-0 inset-x-0 h-18 bg-[#eab308] border-t border-yellow-300/40" />

            {/* Palm Trees flanking ground */}
            <div className="absolute bottom-8 left-4 flex flex-col items-center">
              <div className="w-8 h-4 bg-emerald-600 rounded-t-full" />
              <div className="w-1.5 h-10 bg-amber-800" />
            </div>
            <div className="absolute bottom-8 right-6 flex flex-col items-center">
              <div className="w-9 h-5 bg-emerald-600 rounded-t-full" />
              <div className="w-1.5 h-12 bg-amber-800" />
            </div>

            {/* Center Football Ground (Identical Green Pitch on Beach) */}
            <div className="relative z-10 w-44 h-14 bg-[#2c8332] border-2 border-white/90 rounded-sm mb-2 shadow-lg flex items-center justify-center">
              <div className="w-0.5 h-full bg-white/80" />
              <div className="absolute w-8 h-8 border border-white/80 rounded-full" />
            </div>
          </div>
        )

      case 'mountain-valley':
        return (
          <div className="relative w-full h-48 bg-gradient-to-b from-[#60a5fa] via-[#93c5fd] to-[#15803d] rounded-xl overflow-hidden border border-emerald-500/30 flex items-end justify-center shadow-inner">
            {/* Alpine Sky & Birds */}
            <div className="absolute top-5 left-12 w-3 h-1 bg-slate-800 rounded-full rotate-12" />
            <div className="absolute top-6 left-16 w-3 h-1 bg-slate-800 rounded-full -rotate-12" />

            {/* Snow-Capped Mountain Range */}
            <div className="absolute bottom-16 inset-x-0 flex items-end justify-around px-1">
              <div className="w-20 h-32 bg-[#334155] relative overflow-hidden" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}>
                <div className="absolute top-0 inset-x-0 h-10 bg-white" />
              </div>
              <div className="w-28 h-40 bg-[#475569] -mx-4 relative overflow-hidden z-0" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}>
                <div className="absolute top-0 inset-x-0 h-14 bg-white" />
              </div>
              <div className="w-24 h-36 bg-[#334155] relative overflow-hidden" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}>
                <div className="absolute top-0 inset-x-0 h-12 bg-white" />
              </div>
            </div>

            {/* Valley Pine Trees */}
            <div className="absolute bottom-14 inset-x-4 flex justify-between z-10 opacity-90">
              <div className="flex gap-1 items-end">
                <div className="w-3 h-8 bg-emerald-950" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                <div className="w-4 h-10 bg-emerald-900" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
              </div>
              <div className="flex gap-1 items-end">
                <div className="w-4 h-11 bg-emerald-900" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                <div className="w-3 h-7 bg-emerald-950" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
              </div>
            </div>

            {/* Center Football Ground (Identical Green Pitch in Valley) */}
            <div className="relative z-20 w-44 h-14 bg-[#2c8332] border-2 border-white/90 rounded-sm mb-2 shadow-lg flex items-center justify-center">
              <div className="w-0.5 h-full bg-white/80" />
              <div className="absolute w-8 h-8 border border-white/80 rounded-full" />
            </div>
          </div>
        )
    }
  }

  return (
    <div className="relative w-screen h-screen bg-ui-dark text-white font-display overflow-hidden flex flex-col justify-between p-8 select-none">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/team-selection')}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer border border-white/10"
            title="Back to Team Selection"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black italic tracking-wide">Select Stadium</h1>
              <span className="text-[11px] bg-ui-accent/20 border border-ui-accent/40 text-ui-accent font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Step 2 of 2
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Choose the surrounding 3D voxel environment for your match
            </p>
          </div>
        </div>

        {/* Start Match CTA */}
        <button
          onClick={() => navigate('/match')}
          className="flex items-center gap-2 bg-ui-accent hover:bg-ui-accent/80 text-black px-7 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg cursor-pointer"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>Start Match</span>
        </button>
      </div>

      {/* 3 Stadium Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto max-w-6xl w-full mx-auto relative z-10">
        {STADIUM_LIST.map((stadium) => {
          const isSelected = selectedStadiumId === stadium.id

          return (
            <div
              key={stadium.id}
              onClick={() => selectStadium(stadium.id)}
              className={`group relative bg-ui-card/90 rounded-2xl p-5 border-2 transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'border-ui-accent shadow-[0_0_30px_rgba(0,212,255,0.35)] scale-[1.02] bg-gradient-to-b from-ui-accent/10 to-ui-card'
                  : 'border-white/10 hover:border-white/30 hover:scale-[1.01]'
              }`}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute -top-3 -right-3 z-30 bg-ui-accent text-black font-black text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SELECTED</span>
                </div>
              )}

              {/* Top Card Section: Preview & Header */}
              <div>
                {/* 3D Voxel Preview Window */}
                <div className="mb-4">{renderStadiumPreview(stadium.id)}</div>

                {/* Header & Atmosphere Tag */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-xl font-black text-white group-hover:text-ui-accent transition-colors">
                      {stadium.name}
                    </h3>
                    <p className="text-xs text-ui-accent font-semibold tracking-wide">
                      {stadium.subtitle}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${stadium.badgeColor}`}
                  >
                    {getAtmosphereIcon(stadium.atmosphere, stadium.id)}
                    <span>{stadium.timeOfDay}</span>
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-white/60 leading-relaxed mb-4">
                  {stadium.description}
                </p>

                {/* Feature Chips */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {stadium.features.map((feat, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-white/5 border border-white/10 text-white/70 px-2 py-0.5 rounded-md font-mono"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selection Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  selectStadium(stadium.id)
                }}
                className={`w-full py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'bg-ui-accent text-black shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Selected Environment</span>
                  </>
                ) : (
                  <span>Select Stadium</span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Bottom Bar: Matchup Info & Quick Start */}
      <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs relative z-10 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-4 text-white/70">
          <span>Matchup:</span>
          <span className="font-bold text-white text-sm">
            {currentHome.name} <span className="text-ui-accent font-mono">VS</span> {currentAway.name}
          </span>
          <span className="text-white/40">|</span>
          <span className="text-white/60">
            Selected Venue:{' '}
            <strong className="text-ui-accent">
              {STADIUM_LIST.find((s) => s.id === selectedStadiumId)?.name}
            </strong>
          </span>
        </div>

        <button
          onClick={() => navigate('/match')}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition shadow cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-black" />
          <span>Play Match</span>
        </button>
      </div>
    </div>
  )
}
