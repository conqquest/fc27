import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, AlertTriangle, CheckCircle } from 'lucide-react'
import { useTeamStore } from '../store/teamStore'
import { getTeamById } from '../data/teams'
import { KitGenerator } from '../rendering/KitGenerator'
import type { KitPattern, CollarStyle } from '../data/types'

export default function KitSelection() {
  const navigate = useNavigate()
  const { homeTeamId, awayTeamId } = useTeamStore()

  const homeTeam = getTeamById(homeTeamId || 'real-madrid')
  const awayTeam = getTeamById(awayTeamId || 'manchester-city')

  const [homeKit, setHomeKit] = useState(homeTeam.homeKit)
  const [awayKit, setAwayKit] = useState(awayTeam.awayKit)

  const patterns: KitPattern[] = [
    'solid',
    'vertical-stripes',
    'horizontal-stripes',
    'hoops',
    'gradient',
    'sash',
    'halved',
  ]

  const collars: CollarStyle[] = ['round', 'v-neck', 'polo', 'mandarin']

  const isClash = KitGenerator.isClashing(homeKit, awayKit)

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
            <h1 className="text-2xl font-black italic tracking-wide">Kit Room & Clash Detection</h1>
            <p className="text-xs text-white/50">Procedural 3D Jersey Patterns & Color Contrast Check</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/match')}
          className="flex items-center gap-2 bg-ui-accent hover:bg-ui-accent/80 text-black px-6 py-2.5 rounded-xl font-extrabold text-sm uppercase tracking-wider transition shadow-lg cursor-pointer"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>Confirm & Play</span>
        </button>
      </div>

      {/* Clash Alert Banner */}
      <div className="my-3">
        {isClash ? (
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 flex items-center gap-3 text-amber-300 text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
            <div>
              <strong>Kit Clash Warning!</strong> Both teams are wearing similar primary colors. Consider switching Away kit or modifying patterns for better visual clarity.
            </div>
          </div>
        ) : (
          <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-3 text-emerald-300 text-xs">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <div>
              <strong>Kits are Distinct!</strong> High color contrast detected between Home and Away kits.
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Home Kit vs Away Kit Customizer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-auto max-w-5xl w-full mx-auto overflow-y-auto">
        {/* Home Kit Customizer */}
        <div className="bg-ui-card/90 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black">{homeTeam.name} (Home)</h2>
            <span
              className="w-5 h-5 rounded-full border border-white/40"
              style={{ backgroundColor: homeKit.colors.primary }}
            />
          </div>

          {/* Pattern selector */}
          <div className="mb-4">
            <label className="text-xs font-bold text-white/70 block mb-2 uppercase tracking-wider">
              Pattern Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {patterns.map((pat) => (
                <button
                  key={pat}
                  onClick={() => setHomeKit({ ...homeKit, pattern: pat })}
                  className={`p-2 rounded-lg text-xs font-semibold capitalize border transition cursor-pointer ${
                    homeKit.pattern === pat
                      ? 'border-ui-accent bg-ui-accent/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {pat}
                </button>
              ))}
            </div>
          </div>

          {/* Collar style */}
          <div className="mb-4">
            <label className="text-xs font-bold text-white/70 block mb-2 uppercase tracking-wider">
              Collar Style
            </label>
            <div className="grid grid-cols-4 gap-2">
              {collars.map((c) => (
                <button
                  key={c}
                  onClick={() => setHomeKit({ ...homeKit, collarStyle: c })}
                  className={`p-2 rounded-lg text-xs font-semibold capitalize border transition cursor-pointer ${
                    homeKit.collarStyle === c
                      ? 'border-ui-accent bg-ui-accent/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-white/60 block mb-1">Primary Color</span>
              <input
                type="color"
                value={homeKit.colors.primary}
                onChange={(e) =>
                  setHomeKit({
                    ...homeKit,
                    colors: { ...homeKit.colors, primary: e.target.value },
                  })
                }
                className="w-full h-9 bg-transparent rounded cursor-pointer"
              />
            </div>
            <div>
              <span className="text-white/60 block mb-1">Secondary Color</span>
              <input
                type="color"
                value={homeKit.colors.secondary}
                onChange={(e) =>
                  setHomeKit({
                    ...homeKit,
                    colors: { ...homeKit.colors, secondary: e.target.value },
                  })
                }
                className="w-full h-9 bg-transparent rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Away Kit Customizer */}
        <div className="bg-ui-card/90 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black">{awayTeam.name} (Away)</h2>
            <span
              className="w-5 h-5 rounded-full border border-white/40"
              style={{ backgroundColor: awayKit.colors.primary }}
            />
          </div>

          {/* Pattern selector */}
          <div className="mb-4">
            <label className="text-xs font-bold text-white/70 block mb-2 uppercase tracking-wider">
              Pattern Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {patterns.map((pat) => (
                <button
                  key={pat}
                  onClick={() => setAwayKit({ ...awayKit, pattern: pat })}
                  className={`p-2 rounded-lg text-xs font-semibold capitalize border transition cursor-pointer ${
                    awayKit.pattern === pat
                      ? 'border-ui-accent bg-ui-accent/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {pat}
                </button>
              ))}
            </div>
          </div>

          {/* Collar style */}
          <div className="mb-4">
            <label className="text-xs font-bold text-white/70 block mb-2 uppercase tracking-wider">
              Collar Style
            </label>
            <div className="grid grid-cols-4 gap-2">
              {collars.map((c) => (
                <button
                  key={c}
                  onClick={() => setAwayKit({ ...awayKit, collarStyle: c })}
                  className={`p-2 rounded-lg text-xs font-semibold capitalize border transition cursor-pointer ${
                    awayKit.collarStyle === c
                      ? 'border-ui-accent bg-ui-accent/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-white/60 block mb-1">Primary Color</span>
              <input
                type="color"
                value={awayKit.colors.primary}
                onChange={(e) =>
                  setAwayKit({
                    ...awayKit,
                    colors: { ...awayKit.colors, primary: e.target.value },
                  })
                }
                className="w-full h-9 bg-transparent rounded cursor-pointer"
              />
            </div>
            <div>
              <span className="text-white/60 block mb-1">Secondary Color</span>
              <input
                type="color"
                value={awayKit.colors.secondary}
                onChange={(e) =>
                  setAwayKit({
                    ...awayKit,
                    colors: { ...awayKit.colors, secondary: e.target.value },
                  })
                }
                className="w-full h-9 bg-transparent rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 pt-3 text-xs text-white/50 text-center">
        Kit customizations update procedural Three.js textures in real-time during 3D match gameplay.
      </div>
    </div>
  )
}
