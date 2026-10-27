import React from 'react'
import type { SimPlayer } from '../data/types'

interface PlayerIndicatorProps {
  player: SimPlayer | null
}

export const PlayerIndicator: React.FC<PlayerIndicatorProps> = ({ player }) => {
  if (!player) return null

  const { name, shirtNumber, position } = player.playerData
  const stamina = player.stamina

  return (
    <div className="bg-ui-dark/85 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl flex items-center gap-3.5 min-w-[220px] pointer-events-none">
      {/* Position Badge & Number */}
      <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg px-2.5 py-1 min-w-[44px]">
        <span className="text-[10px] font-bold text-ui-accent tracking-wider">{position}</span>
        <span className="text-lg font-black text-white leading-none">{shirtNumber}</span>
      </div>

      {/* Name and Stamina Bar */}
      <div className="flex-1">
        <div className="text-sm font-bold text-white tracking-wide truncate max-w-[150px]">
          {name}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 bg-white/15 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 rounded-full ${
                stamina > 45 ? 'bg-ui-green' : stamina > 20 ? 'bg-ui-gold' : 'bg-ui-red'
              }`}
              style={{ width: `${Math.round(stamina)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-white/60">{Math.round(stamina)}%</span>
        </div>
      </div>
    </div>
  )
}
