import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Clock, Zap, Camera, Sun } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'

export default function MatchSettings() {
  const navigate = useNavigate()
  const { settings, setMatchDuration, setDifficulty } = useSettingsStore()

  const durations = [3, 4, 5, 6, 8, 10]
  const difficulties = ['amateur', 'semi-pro', 'professional', 'world-class', 'legendary'] as const

  return (
    <div className="relative w-screen h-screen bg-ui-dark text-white font-display overflow-hidden flex flex-col justify-between p-8 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/team-selection')}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black italic tracking-wide">Match Settings</h1>
            <p className="text-xs text-white/50">Tune match duration, AI difficulty & presentation</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/match')}
          className="flex items-center gap-2 bg-ui-accent hover:bg-ui-accent/80 text-black px-6 py-2.5 rounded-xl font-extrabold text-sm uppercase tracking-wider transition shadow-lg cursor-pointer"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>Launch Match</span>
        </button>
      </div>

      {/* Main Settings Panel */}
      <div className="bg-ui-card/90 border border-white/10 rounded-2xl p-8 max-w-3xl w-full mx-auto my-auto shadow-2xl flex flex-col gap-6">
        {/* Half Length */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-ui-accent">
            <Clock className="w-4 h-4" />
            <span>Half Length (Minutes)</span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {durations.map((d) => (
              <button
                key={d}
                onClick={() => setMatchDuration(d)}
                className={`py-2.5 rounded-xl text-xs font-mono font-bold border transition cursor-pointer ${
                  settings.matchDuration === d
                    ? 'border-ui-accent bg-ui-accent/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {d} mins
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-ui-accent">
            <Zap className="w-4 h-4" />
            <span>AI Difficulty</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {difficulties.map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`py-2.5 px-1 rounded-xl text-xs font-bold uppercase tracking-wider border transition cursor-pointer ${
                  settings.difficulty === diff
                    ? 'border-ui-accent bg-ui-accent/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {diff.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Stadium Atmosphere & Lighting */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-ui-accent">
            <Sun className="w-4 h-4" />
            <span>Stadium Atmosphere</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {['Night Floodlights', 'Golden Hour Sunset', 'Overcast Afternoon'].map((env, i) => (
              <div
                key={env}
                className={`p-3 rounded-xl border text-center font-bold cursor-pointer transition ${
                  i === 0
                    ? 'border-ui-accent bg-ui-accent/15 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {env}
              </div>
            ))}
          </div>
        </div>

        {/* Camera Preset */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-ui-accent">
            <Camera className="w-4 h-4" />
            <span>Default Camera Perspective</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {['Broadcast Sideline', 'End-to-End Behind Goal', 'Tactical Top-Down'].map((cam, i) => (
              <div
                key={cam}
                className={`p-3 rounded-xl border text-center font-bold cursor-pointer transition ${
                  i === 0
                    ? 'border-ui-accent bg-ui-accent/15 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {cam}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 pt-3 text-xs text-white/50 text-center">
        Settings are saved to IndexedDB / localStorage and persist across sessions.
      </div>
    </div>
  )
}
