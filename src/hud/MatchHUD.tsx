import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { Team, MatchPhase, MatchStats, SimPlayer, Vec3, MatchAnnouncement } from '../data/types'
import { Radar } from './Radar'
import { PlayerIndicator } from './PlayerIndicator'

interface MatchHUDProps {
  homeTeam: Team
  awayTeam: Team
  score: [number, number]
  minute: number
  half: 1 | 2 | 3 | 4
  phase: MatchPhase
  stats: MatchStats
  controlledPlayer: SimPlayer | null
  players: SimPlayer[]
  ballPosition: Vec3
  showRadar: boolean
  announcement?: MatchAnnouncement | null
  shotPower?: number // 0-100
  isSprinting?: boolean
  showOffsideLine?: boolean
  onPauseToggle: () => void
  onToggleOffsideLine?: () => void
  onPass?: () => void
  onShootStart?: () => void
  onShootEnd?: () => void
  onThroughBall?: () => void
  onCross?: () => void
  onSwitchPlayer?: () => void
  onTackle?: () => void
  onSprintToggle?: () => void
  onVirtualMove?: (moveVector: Vec3) => void
  onResumeFromGoal?: () => void
}

export const MatchHUD: React.FC<MatchHUDProps> = ({
  homeTeam,
  awayTeam,
  score,
  minute,
  half,
  phase,
  stats,
  controlledPlayer,
  players,
  ballPosition,
  showRadar,
  announcement,
  shotPower = 0,
  isSprinting = false,
  showOffsideLine = false,
  onPauseToggle,
  onToggleOffsideLine,
  onPass,
  onShootStart,
  onShootEnd,
  onThroughBall,
  onCross,
  onSwitchPlayer,
  onTackle,
  onSprintToggle,
  onVirtualMove,
  onResumeFromGoal,
}) => {
  const [showControlsGuide, setShowControlsGuide] = useState(false)
  const hasPossession = controlledPlayer?.hasBall ?? false

  // ─── Virtual Joystick Logic ───
  const joystickBaseRef = useRef<HTMLDivElement>(null)
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 })
  const isDraggingJoystick = useRef(false)
  const joystickTouchId = useRef<number | null>(null)

  const handleJoystickMove = useCallback((clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return
    const rect = joystickBaseRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const maxRadius = rect.width / 2 - 10

    let deltaX = clientX - centerX
    let deltaY = clientY - centerY
    const dist = Math.hypot(deltaX, deltaY)

    if (dist > maxRadius) {
      deltaX = (deltaX / dist) * maxRadius
      deltaY = (deltaY / dist) * maxRadius
    }

    setJoystickPos({ x: deltaX, y: deltaY })

    // Normalize -1 to +1
    const normX = deltaX / maxRadius
    const normY = deltaY / maxRadius

    // Camera mapping:
    // Screen Up is -X pitch
    // Screen Down is +X pitch
    // Screen Left is -Z pitch
    // Screen Right is +Z pitch
    onVirtualMove?.({
      x: normY, // moving down on screen increases X
      y: 0,
      z: normX, // moving right on screen increases Z
    })
  }, [onVirtualMove])

  const handleJoystickEnd = useCallback(() => {
    isDraggingJoystick.current = false
    joystickTouchId.current = null
    setJoystickPos({ x: 0, y: 0 })
    onVirtualMove?.({ x: 0, y: 0, z: 0 })
  }, [onVirtualMove])

  useEffect(() => {
    const onWindowPointerMove = (e: PointerEvent) => {
      if (isDraggingJoystick.current) {
        handleJoystickMove(e.clientX, e.clientY)
      }
    }
    const onWindowPointerUp = () => {
      if (isDraggingJoystick.current) {
        handleJoystickEnd()
      }
    }

    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', onWindowPointerUp)
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
    }
  }, [handleJoystickMove, handleJoystickEnd])

  // Get color for announcement banner
  const getBannerColor = (type?: MatchAnnouncement['type']) => {
    switch (type) {
      case 'goal':
        return 'from-amber-500/95 via-yellow-400/90 to-amber-600/95 border-amber-300 text-amber-950'
      case 'offside':
        return 'from-rose-600/95 via-red-500/90 to-rose-700/95 border-rose-300 text-white'
      case 'corner':
        return 'from-sky-600/95 via-cyan-500/90 to-sky-700/95 border-sky-300 text-white'
      case 'throw_in':
        return 'from-emerald-600/95 via-teal-500/90 to-emerald-700/95 border-emerald-300 text-white'
      case 'goal_kick':
        return 'from-indigo-600/95 via-blue-500/90 to-indigo-700/95 border-indigo-300 text-white'
      case 'penalty':
      case 'foul':
        return 'from-orange-600/95 via-amber-500/90 to-orange-700/95 border-orange-300 text-white'
      case 'advantage':
        return 'from-amber-600/95 via-yellow-500/90 to-amber-700/95 border-yellow-300 text-black'
      case 'card':
        return announcement?.card === 'red'
          ? 'from-red-700/95 via-rose-600/90 to-red-800/95 border-red-400 text-white'
          : 'from-amber-400/95 via-yellow-300/90 to-amber-500/95 border-yellow-200 text-black'
      case 'save':
        return 'from-teal-600/95 via-cyan-500/90 to-teal-700/95 border-teal-300 text-white'
      default:
        return 'from-cyan-600/95 via-blue-500/90 to-cyan-700/95 border-cyan-300 text-white'
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-display">
      {/* ─── Top Left: Broadcast Scoreboard ─── */}
      <div className="absolute top-5 left-6 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center bg-ui-dark/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden text-white">
          {/* Home team */}
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            <span
              className="w-3 h-3 rounded-full border border-white/30"
              style={{ backgroundColor: homeTeam.colors.primary }}
            />
            <span className="font-extrabold text-sm tracking-wider">{homeTeam.shortName}</span>
            {stats.redCards[0] > 0 && (
              <span className="px-1.5 py-0.5 bg-red-600/90 text-[10px] font-bold rounded text-white flex items-center gap-0.5 shadow">
                <span>🟥</span>
                <span>{11 - stats.redCards[0]}</span>
              </span>
            )}
          </div>

          {/* Live Score */}
          <div className="bg-black/60 px-4 py-2.5 font-mono font-black text-lg text-ui-accent flex items-center gap-2 border-x border-white/10">
            <span>{score[0]}</span>
            <span className="text-white/40">-</span>
            <span>{score[1]}</span>
          </div>

          {/* Away team */}
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            <span className="font-extrabold text-sm tracking-wider">{awayTeam.shortName}</span>
            {stats.redCards[1] > 0 && (
              <span className="px-1.5 py-0.5 bg-red-600/90 text-[10px] font-bold rounded text-white flex items-center gap-0.5 shadow">
                <span>🟥</span>
                <span>{11 - stats.redCards[1]}</span>
              </span>
            )}
            <span
              className="w-3 h-3 rounded-full border border-white/30"
              style={{ backgroundColor: awayTeam.colors.primary }}
            />
          </div>

          {/* Minute & Half */}
          <div className="bg-white/10 px-3 py-2.5 text-xs font-mono font-bold text-white/90 border-l border-white/10 flex items-center gap-1.5">
            <span>{minute}'</span>
            <span className="text-[10px] text-white/50">{half === 1 ? '1H' : half === 2 ? '2H' : 'ET'}</span>
          </div>
        </div>

        {/* Offside Line Debug Toggle Button */}
        <button
          onClick={onToggleOffsideLine}
          className={`px-3 py-2.5 rounded-xl border text-xs font-semibold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95 ${
            showOffsideLine
              ? 'bg-amber-400 text-black border-amber-300 font-bold'
              : 'bg-ui-dark/85 backdrop-blur-md hover:bg-white/20 text-white/80 hover:text-white border-white/10'
          }`}
          title="Toggle IFAB Offside Line (Debug Mode)"
        >
          <span>📏</span>
          <span>OFFSIDE LINE</span>
        </button>

        {/* Controls Guide Button */}
        <button
          onClick={() => setShowControlsGuide(true)}
          className="bg-ui-dark/85 backdrop-blur-md hover:bg-white/20 text-white/80 hover:text-white px-3 py-2.5 rounded-xl border border-white/10 text-xs font-semibold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95"
          title="Open Controls Guide"
        >
          <span>🎮</span>
          <span>GUIDE</span>
        </button>

        {/* Pause Button */}
        <button
          onClick={onPauseToggle}
          className="bg-ui-dark/85 backdrop-blur-md hover:bg-white/20 text-white/80 hover:text-white px-3 py-2.5 rounded-xl border border-white/10 text-xs font-semibold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95"
        >
          <span>ESC</span>
          <span>PAUSE</span>
        </button>
      </div>

      {/* ─── Top Center: Possession Bar ─── */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-ui-dark/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 shadow-xl flex items-center gap-3 pointer-events-none">
        <span className="text-xs font-bold font-mono" style={{ color: homeTeam.colors.primary }}>
          {stats.possession[0]}%
        </span>
        <div className="w-28 h-2 bg-white/15 rounded-full overflow-hidden flex">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${stats.possession[0]}%`, backgroundColor: homeTeam.colors.primary }}
          />
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${stats.possession[1]}%`, backgroundColor: awayTeam.colors.primary }}
          />
        </div>
        <span className="text-xs font-bold font-mono" style={{ color: awayTeam.colors.primary }}>
          {stats.possession[1]}%
        </span>
      </div>

      {/* ─── Dynamic Match Announcement Banner ─── */}
      {announcement && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce">
          <div
            className={`bg-gradient-to-r ${getBannerColor(
              announcement.type
            )} border-2 rounded-2xl px-8 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-center flex flex-col items-center backdrop-blur-md min-w-[260px]`}
          >
            {announcement.card && (
              <div
                className={`w-6 h-9 rounded mb-1.5 shadow-lg border-2 ${
                  announcement.card === 'red' ? 'bg-red-600 border-white/60' : 'bg-yellow-400 border-black/40'
                }`}
              />
            )}
            <span className="text-2xl font-black italic tracking-widest uppercase drop-shadow-md flex items-center gap-2">
              {announcement.type === 'advantage' && <span>⚡</span>}
              {announcement.title}
            </span>
            {announcement.subtitle && (
              <span className="text-xs font-bold tracking-wider opacity-90 mt-0.5">
                {announcement.subtitle}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── Goal Celebration Full Banner ─── */}
      {phase === 'GOAL_CELEBRATION' && (
        <div
          onClick={onResumeFromGoal}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in cursor-pointer z-50 select-none"
        >
          <div className="bg-gradient-to-r from-ui-dark via-ui-accent/20 to-ui-dark border-y-2 border-ui-accent py-8 px-24 text-center transform scale-110 shadow-2xl mb-6">
            <h1 className="text-6xl font-black italic tracking-widest text-white drop-shadow-[0_4px_16px_rgba(0,212,255,0.8)] animate-pulse">
              GOAL!
            </h1>
            <p className="text-lg text-ui-accent font-bold mt-2 tracking-widest uppercase">
              {announcement?.subtitle || 'What a strike!'}
            </p>
          </div>
          <div className="flex items-center space-x-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full backdrop-blur-md text-white font-bold tracking-widest text-xs uppercase transition-all shadow-lg animate-bounce">
            <span>Click or press any button to resume</span>
          </div>
        </div>
      )}

      {/* ─── Shot Power Gauge Meter ─── */}
      {shotPower > 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30">
          <div className="flex items-center justify-between w-52 mb-1 px-1">
            <span className="text-[11px] font-black tracking-widest text-ui-accent uppercase drop-shadow">
              Shot Power
            </span>
            <span className="text-[11px] font-mono font-bold text-white drop-shadow">
              {shotPower}%
            </span>
          </div>
          <div className="w-52 h-4 bg-black/80 rounded-full border border-white/20 p-0.5 shadow-2xl overflow-hidden backdrop-blur-md">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                shotPower > 80
                  ? 'bg-gradient-to-r from-amber-400 to-rose-500 animate-pulse'
                  : shotPower > 50
                  ? 'bg-gradient-to-r from-emerald-400 to-amber-400'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${shotPower}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── Bottom Left: Player Card & Virtual Joystick ─── */}
      <div className="absolute bottom-6 left-6 flex items-end gap-5">
        <PlayerIndicator player={controlledPlayer} />

        {/* On-Screen Virtual Touch Joystick */}
        <div
          ref={joystickBaseRef}
          onPointerDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            isDraggingJoystick.current = true
            handleJoystickMove(e.clientX, e.clientY)
          }}
          className="relative w-28 h-28 rounded-full bg-ui-dark/70 backdrop-blur-md border-2 border-white/20 shadow-2xl flex items-center justify-center cursor-pointer pointer-events-auto touch-none select-none"
          title="Virtual Directional Joystick"
        >
          {/* Outer ring guide markings */}
          <div className="absolute inset-2 rounded-full border border-dashed border-white/15 pointer-events-none" />
          <div className="absolute top-1 text-[9px] font-bold text-white/30">▲</div>
          <div className="absolute bottom-1 text-[9px] font-bold text-white/30">▼</div>
          <div className="absolute left-1 text-[9px] font-bold text-white/30">◀</div>
          <div className="absolute right-1 text-[9px] font-bold text-white/30">▶</div>

          {/* Draggable Knob */}
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-ui-accent to-blue-600 border border-white/40 shadow-xl flex items-center justify-center text-ui-dark font-black text-xs transition-transform duration-75 pointer-events-none"
            style={{
              transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* ─── Bottom Center: Tactical Radar ─── */}
      {showRadar && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <Radar
            players={players}
            ballPosition={ballPosition}
            homeColor={homeTeam.colors.primary}
            awayColor={awayTeam.colors.primary}
          />
        </div>
      )}

      {/* ─── Bottom Right: Interactive Action Buttons + Keyboard Legend ─── */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* Compact Desktop Controls Legend Pill */}
        <div className="flex items-center gap-2 bg-ui-dark/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-white/75 shadow-lg">
          <span className="font-bold text-white">W A S D</span>
          <span className="text-white/30">/</span>
          <span className="font-bold text-white">↑↓←→</span>
          <span className="text-white/50">Move</span>
          <span className="text-white/30">•</span>
          <span className="font-bold text-emerald-400">A</span>
          <span className="text-white/50">Pass</span>
          <span className="text-white/30">•</span>
          <span className="font-bold text-rose-400">Space</span>
          <span className="text-white/50">Shoot</span>
        </div>

        {/* Clickable Action Buttons Grid (For Mouse and Touch Gameplay) */}
        <div className="grid grid-cols-3 gap-2.5 bg-ui-dark/85 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shadow-2xl">
          {/* PASS Button */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onPass?.()
            }}
            className="group relative flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 hover:from-emerald-400 hover:to-teal-600 active:scale-95 transition-all shadow-lg border border-emerald-300/30 cursor-pointer"
          >
            <span className="text-sm font-black text-white tracking-wider">PASS</span>
            <span className="text-[10px] font-mono font-bold text-emerald-200">A / L-CLK</span>
          </button>

          {/* SHOOT Button with Hold-to-Charge */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onShootStart?.()
            }}
            onPointerUp={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onShootEnd?.()
            }}
            onPointerLeave={(e) => {
              e.stopPropagation()
              if (shotPower > 0) onShootEnd?.()
            }}
            className="group relative flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 active:scale-95 transition-all shadow-lg border border-rose-300/30 cursor-pointer"
          >
            <span className="text-sm font-black text-white tracking-wider">SHOOT</span>
            <span className="text-[10px] font-mono font-bold text-rose-200">SPACE / E</span>
            {shotPower > 0 && (
              <div
                className="absolute inset-0 rounded-xl bg-white/25 animate-pulse"
                style={{ opacity: shotPower / 100 }}
              />
            )}
          </button>

          {/* THROUGH BALL Button */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onThroughBall?.()
            }}
            className="group flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-700 hover:from-indigo-400 hover:to-purple-600 active:scale-95 transition-all shadow-lg border border-indigo-300/30 cursor-pointer"
          >
            <span className="text-xs font-black text-white tracking-wider">THROUGH</span>
            <span className="text-[10px] font-mono font-bold text-indigo-200">W / Q</span>
          </button>

          {/* CROSS / LOFTED PASS Button */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onCross?.()
            }}
            className="group flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 hover:from-blue-400 hover:to-cyan-600 active:scale-95 transition-all shadow-lg border border-blue-300/30 cursor-pointer"
          >
            <span className="text-sm font-black text-white tracking-wider">CROSS</span>
            <span className="text-[10px] font-mono font-bold text-blue-200">D / F</span>
          </button>

          {/* SWITCH PLAYER Button */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onSwitchPlayer?.()
            }}
            className="group flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-800 hover:from-cyan-500 hover:to-teal-700 active:scale-95 transition-all shadow-lg border border-cyan-300/30 cursor-pointer"
          >
            <span className="text-xs font-black text-white tracking-wider">SWITCH</span>
            <span className="text-[10px] font-mono font-bold text-cyan-200">TAB / R-CLK</span>
          </button>

          {/* TACKLE Button */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onTackle?.()
            }}
            className={`group flex flex-col items-center justify-center w-16 h-16 rounded-xl ${
              !hasPossession
                ? 'bg-gradient-to-br from-orange-500 to-red-700 border-orange-300 ring-2 ring-orange-400/50'
                : 'bg-gradient-to-br from-gray-700 to-gray-800 border-white/10 opacity-70'
            } active:scale-95 transition-all shadow-lg cursor-pointer`}
          >
            <span className="text-xs font-black text-white tracking-wider">TACKLE</span>
            <span className="text-[10px] font-mono font-bold text-orange-200">E / SPACE</span>
          </button>
        </div>

        {/* SPRINT Toggle Pill */}
        <button
          onClick={onSprintToggle}
          className={`px-4 py-2 rounded-xl border text-xs font-bold tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            isSprinting
              ? 'bg-amber-500 border-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)]'
              : 'bg-ui-dark/80 hover:bg-white/15 border-white/20 text-white/80'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-current animate-pulse" />
          <span>SPRINT (SHIFT): {isSprinting ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* ─── Interactive Controls & Rules Guide Modal ─── */}
      {showControlsGuide && (
        <div
          className="absolute inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-6 z-50 pointer-events-auto"
          onClick={() => setShowControlsGuide(false)}
        >
          <div
            className="bg-ui-dark/95 border border-ui-accent/40 rounded-3xl p-8 max-w-2xl w-full text-white shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/15">
              <h2 className="text-2xl font-black italic tracking-wider text-ui-accent flex items-center gap-2">
                <span>🎮</span>
                <span>FC27 CONTROLS & RULES GUIDE</span>
              </h2>
              <button
                onClick={() => setShowControlsGuide(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 my-6 text-sm">
              {/* Keyboard Schemes */}
              <div className="space-y-3">
                <h3 className="font-bold text-ui-accent uppercase tracking-wider text-xs">
                  Keyboard & Mouse
                </h3>
                <div className="bg-white/5 rounded-xl p-3 space-y-2 border border-white/10 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/60">Move Player:</span>
                    <span className="font-bold text-white">W A S D or ↑ ↓ ← →</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Sprint:</span>
                    <span className="font-bold text-white">Left Shift</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Ground Pass:</span>
                    <span className="font-bold text-emerald-400">A / J / Left-Click</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Through Ball:</span>
                    <span className="font-bold text-indigo-300">W / Q key</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Shoot (Hold for Power):</span>
                    <span className="font-bold text-rose-400">Spacebar / E / K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Cross / Lofted:</span>
                    <span className="font-bold text-blue-300">D / F key</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Switch Player:</span>
                    <span className="font-bold text-cyan-300">Q / Tab / Right-Click</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Tackle / Slide:</span>
                    <span className="font-bold text-orange-400">E / Space (Defending)</span>
                  </div>
                </div>
              </div>

              {/* On-Screen & Mouse Controls */}
              <div className="space-y-3">
                <h3 className="font-bold text-ui-accent uppercase tracking-wider text-xs">
                  Mouse & Touch / Rules
                </h3>
                <div className="bg-white/5 rounded-xl p-3 space-y-2 border border-white/10 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/60">Pass to Teammate:</span>
                    <span className="font-bold text-white">Left-click teammate directly</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Touch Movement:</span>
                    <span className="font-bold text-white">Drag Bottom-Left Joystick</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Touch Actions:</span>
                    <span className="font-bold text-white">Tap Bottom-Right Buttons</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Offside Rule:</span>
                    <span className="font-bold text-amber-300">Evaluated on pass release</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Set Pieces:</span>
                    <span className="font-bold text-white">Throw-ins, Corners, Penaltys</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Active Player:</span>
                    <span className="font-bold text-ui-accent">Surrounded by Cyan Ring</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Pass Target:</span>
                    <span className="font-bold text-yellow-400">Highlighted Yellow Ring</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowControlsGuide(false)}
              className="w-full py-3 rounded-xl bg-ui-accent text-ui-dark font-black tracking-wider hover:bg-cyan-300 transition-all cursor-pointer text-center"
            >
              RESUME PLAY
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
