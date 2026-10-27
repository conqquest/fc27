import React, { useRef, useEffect } from 'react'
import type { SimPlayer, Vec3 } from '../data/types'

interface RadarProps {
  players: SimPlayer[]
  ballPosition: Vec3
  homeColor: string
  awayColor: string
}

export const Radar: React.FC<RadarProps> = ({
  players,
  ballPosition,
  homeColor,
  awayColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Radar size: 220px width (X: 68m), 320px height (Z: 105m)
  const width = 220
  const height = 150 // landscape mini pitch view

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Pitch background (semi-transparent dark)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1.5

    // Rounded pitch container
    ctx.beginPath()
    ctx.roundRect(4, 4, width - 8, height - 8, 8)
    ctx.fill()
    ctx.stroke()

    // Halfway line (vertical in landscape orientation, or horizontal)
    // Pitch is 105m long in Z -> map Z to X axis (length), X to Y axis (width)
    const midX = width / 2
    const midY = height / 2

    // Half-way line
    ctx.beginPath()
    ctx.moveTo(midX, 4)
    ctx.lineTo(midX, height - 4)
    ctx.stroke()

    // Center circle
    ctx.beginPath()
    ctx.arc(midX, midY, 16, 0, Math.PI * 2)
    ctx.stroke()

    // Penalty boxes
    // Left goal box (Home: Z = -52.5)
    ctx.strokeRect(4, midY - 26, 26, 52)
    // Right goal box (Away: Z = +52.5)
    ctx.strokeRect(width - 30, midY - 26, 26, 52)

    // Mapping helper:
    // Z is [-52.5, 52.5] -> X in [8, width - 8]
    // X is [-34, 34] -> Y in [8, height - 8]
    const mapPos = (pX: number, pZ: number) => {
      const rx = midX + (pZ / 52.5) * (midX - 12)
      const ry = midY + (pX / 34) * (midY - 12)
      return { x: rx, y: ry }
    }

    // Draw players
    for (const p of players) {
      if (!p.isOnPitch) continue
      const { x, y } = mapPos(p.position.x, p.position.z)

      ctx.beginPath()
      ctx.arc(x, y, p.isControlled ? 4.5 : 3.2, 0, Math.PI * 2)
      ctx.fillStyle = p.teamIndex === 0 ? homeColor : awayColor
      ctx.fill()

      if (p.isControlled) {
        ctx.strokeStyle = '#00ffcc'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }

    // Draw ball
    const ballMapped = mapPos(ballPosition.x, ballPosition.z)
    ctx.beginPath()
    ctx.arc(ballMapped.x, ballMapped.y, 3.2, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 0.8
    ctx.stroke()
  }, [players, ballPosition, homeColor, awayColor])

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-xl p-2 border border-white/10 shadow-2xl pointer-events-none">
      <canvas ref={canvasRef} width={width} height={height} className="rounded" />
    </div>
  )
}
