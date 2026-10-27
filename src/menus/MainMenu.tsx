import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Play, Shield, Sliders, Palette, Settings, Compass } from 'lucide-react'

export default function MainMenu() {
  const navigate = useNavigate()

  const modes = [
    {
      id: 'kick-off',
      title: 'Kick Off',
      subtitle: 'Play immediate 3D match',
      icon: Play,
      color: 'from-blue-600/30 to-cyan-500/10 hover:border-cyan-400',
      badge: 'Featured',
      onClick: () => navigate('/team-selection'),
    },
    {
      id: 'squad',
      title: 'Team Management',
      subtitle: 'Lineups, roles & substitutes',
      icon: Shield,
      color: 'from-emerald-600/30 to-green-500/10 hover:border-emerald-400',
      onClick: () => navigate('/squad'),
    },
    {
      id: 'tactics',
      title: 'Tactics & Formations',
      subtitle: 'Pressing, width, defensive depth',
      icon: Sliders,
      color: 'from-amber-600/30 to-yellow-500/10 hover:border-amber-400',
      onClick: () => navigate('/tactics'),
    },
    {
      id: 'kit',
      title: 'Kit Room',
      subtitle: 'Stripes, patterns, clash detection',
      icon: Palette,
      color: 'from-purple-600/30 to-pink-500/10 hover:border-purple-400',
      onClick: () => navigate('/kit'),
    },
    {
      id: 'tournament',
      title: 'Champions Tournament',
      subtitle: 'Knockout cup with top European clubs',
      icon: Trophy,
      color: 'from-yellow-600/30 to-amber-500/10 hover:border-yellow-400',
      onClick: () => navigate('/tournament'),
    },
    {
      id: 'career',
      title: 'Manager Career',
      subtitle: 'Lead your club to glory with saves',
      icon: Compass,
      color: 'from-indigo-600/30 to-blue-500/10 hover:border-indigo-400',
      onClick: () => navigate('/career'),
    },
  ]

  return (
    <div className="relative w-screen h-screen bg-ui-dark text-white font-display overflow-hidden flex flex-col justify-between p-10 select-none">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-ui-accent to-emerald-400">
              FC 27
            </span>
            <span className="text-xs bg-ui-accent/20 border border-ui-accent/40 text-ui-accent font-bold px-2 py-0.5 rounded uppercase tracking-widest">
              Simulator
            </span>
          </div>
          <p className="text-xs text-white/50 tracking-wider uppercase mt-1">
            Browser 3D Football Simulation Engine
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider transition cursor-pointer"
          >
            <Settings className="w-4 h-4 text-ui-accent" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Game Mode Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-auto max-w-6xl w-full mx-auto relative z-10">
        {modes.map((mode) => {
          const Icon = mode.icon
          return (
            <div
              key={mode.id}
              onClick={mode.onClick}
              className={`group relative bg-gradient-to-br ${mode.color} bg-ui-card/90 border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer flex flex-col justify-between min-h-[170px]`}
            >
              <div className="flex items-start justify-between">
                <div className="p-3 bg-white/10 rounded-xl border border-white/15 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {mode.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-ui-accent text-black px-2 py-0.5 rounded-full shadow">
                    {mode.badge}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-xl font-black text-white tracking-wide group-hover:text-ui-accent transition-colors">
                  {mode.title}
                </h3>
                <p className="text-xs text-white/60 mt-1">{mode.subtitle}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Footer & Key Hints */}
      <div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-white/50 relative z-10">
        <div className="flex items-center gap-6">
          <span>Controls: WASD (Move) • Shift (Sprint) • Left-Click (Pass) • E (Shoot)</span>
        </div>
        <div className="font-mono text-white/40">
          v0.1.0 • Rapier & Three.js Engine
        </div>
      </div>
    </div>
  )
}
