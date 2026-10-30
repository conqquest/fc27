import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Monitor, Keyboard, Volume2 } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import type { KeyBindings } from '../data/types'

export default function SettingsScreen() {
  const navigate = useNavigate()
  const { settings, updateKeys, updateGraphics, setVolume, reset } = useSettingsStore()

  const [activeRemap, setActiveRemap] = useState<keyof KeyBindings | null>(null)

  const handleKeyListen = (action: keyof KeyBindings) => {
    setActiveRemap(action)

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      updateKeys({ [action]: e.key.toLowerCase() })
      setActiveRemap(null)
      window.removeEventListener('keydown', onKeyDown)
    }

    window.addEventListener('keydown', onKeyDown)
  }

  const keyLabels: Record<keyof KeyBindings, string> = {
    moveForward: 'Move Forward',
    moveBackward: 'Move Backward',
    moveLeft: 'Move Left',
    moveRight: 'Move Right',
    sprint: 'Sprint',
    shoot: 'Shoot',
    throughBall: 'Through Ball',
    crossOrLoft: 'Cross / Lofted Pass',
    tackle: 'Tackle (Defending)',
    switchPlayer: 'Switch Defender (Defending)',
    teammatePressure: 'Teammate Pressure (Defending)',
    toggleRadar: 'Toggle Tactical Radar',
    pause: 'Pause Match',
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
            <h1 className="text-2xl font-black italic tracking-wide">Game Settings & Controls</h1>
            <p className="text-xs text-white/50">Remap keys, adjust graphics & audio preferences</p>
          </div>
        </div>

        <button
          onClick={reset}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition border border-white/15 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-ui-accent" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Main Settings Tabs / Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-4 flex-1 overflow-y-auto">
        {/* Left Column: Key Remapping */}
        <div className="bg-ui-card/90 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-y-auto flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ui-accent mb-2">
            <Keyboard className="w-4 h-4" />
            <span>Keyboard & Mouse Controls Remapping</span>
          </div>

          <div className="flex flex-col gap-2">
            {(Object.keys(settings.keys) as Array<keyof KeyBindings>).map((action) => (
              <div
                key={action}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs"
              >
                <span className="text-white/80 font-medium">{keyLabels[action]}</span>
                <button
                  onClick={() => handleKeyListen(action)}
                  className={`px-4 py-1.5 rounded-lg font-mono font-bold uppercase transition cursor-pointer border ${
                    activeRemap === action
                      ? 'bg-ui-accent text-black border-ui-accent animate-pulse'
                      : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/20'
                  }`}
                >
                  {activeRemap === action ? 'Press Key...' : settings.keys[action]}
                </button>
              </div>
            ))}

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs flex items-center justify-between text-white/50">
              <span>Ground Pass</span>
              <span className="font-mono font-bold text-white/80">Left Mouse Click</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs flex items-center justify-between text-white/50">
              <span>Player Switch</span>
              <span className="font-mono font-bold text-white/80">Right Mouse Click</span>
            </div>
          </div>
        </div>

        {/* Right Column: Graphics & Audio Settings */}
        <div className="bg-ui-card/90 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
          {/* Graphics Quality */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ui-accent mb-4">
              <Monitor className="w-4 h-4" />
              <span>Graphics & Rendering Quality</span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              {/* Shadows */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <div className="font-bold text-white">Dynamic Stadium Shadows</div>
                  <div className="text-white/50 text-[11px]">Real-time floodlight shadow maps</div>
                </div>
                <button
                  onClick={() => updateGraphics({ shadows: !settings.graphics.shadows })}
                  className={`px-4 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
                    settings.graphics.shadows
                      ? 'bg-ui-accent text-black border-ui-accent'
                      : 'bg-white/10 text-white/60 border-white/15'
                  }`}
                >
                  {settings.graphics.shadows ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Target FPS */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <div className="font-bold text-white">Target Simulation Rate</div>
                  <div className="text-white/50 text-[11px]">Render frame rate target</div>
                </div>
                <div className="flex items-center gap-2">
                  {[30, 60].map((fps) => (
                    <button
                      key={fps}
                      onClick={() => updateGraphics({ targetFps: fps as 30 | 60 })}
                      className={`px-3 py-1 rounded-lg font-mono font-bold border transition cursor-pointer ${
                        settings.graphics.targetFps === fps
                          ? 'border-ui-accent bg-ui-accent/20 text-white'
                          : 'border-white/10 bg-white/5 text-white/50'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* Crowd Density */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <div className="font-bold text-white">Crowd Density</div>
                  <div className="text-white/50 text-[11px]">Stadium atmosphere geometry</div>
                </div>
                <div className="flex items-center gap-2">
                  {(['low', 'medium', 'high'] as const).map((density) => (
                    <button
                      key={density}
                      onClick={() => updateGraphics({ crowdDensity: density })}
                      className={`px-3 py-1 rounded-lg font-bold capitalize border transition cursor-pointer ${
                        settings.graphics.crowdDensity === density
                          ? 'border-ui-accent bg-ui-accent/20 text-white'
                          : 'border-white/10 bg-white/5 text-white/50'
                      }`}
                    >
                      {density}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Audio Volume */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ui-accent mb-3">
              <Volume2 className="w-4 h-4" />
              <span>Audio & Match Volume</span>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-white/70">Master Volume</span>
                <span className="font-mono text-ui-accent">{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-ui-accent cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 pt-3 text-xs text-white/50 text-center">
        Settings are automatically saved and will apply immediately to all matches.
      </div>
    </div>
  )
}
