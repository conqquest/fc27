import * as THREE from 'three'
import type { Kit } from '../data/types'

const textureCache = new Map<string, THREE.CanvasTexture>()

export class KitGenerator {
  public static createJerseyTexture(
    kit: Kit,
    shirtNumber: number,
    playerName?: string
  ): THREE.CanvasTexture {
    const cacheKey = `${kit.id}-${shirtNumber}-${playerName || ''}`
    if (textureCache.has(cacheKey)) {
      return textureCache.get(cacheKey)!
    }

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      const fallback = new THREE.CanvasTexture(canvas)
      return fallback
    }

    const { primary, secondary, accent, numberColor, numberOutline } = kit.colors

    // 1. Base pattern
    ctx.fillStyle = primary
    ctx.fillRect(0, 0, 512, 512)

    switch (kit.pattern) {
      case 'vertical-stripes': {
        const stripeWidth = 512 / 8
        ctx.fillStyle = secondary
        for (let i = 1; i < 8; i += 2) {
          ctx.fillRect(i * stripeWidth, 0, stripeWidth, 512)
        }
        break
      }
      case 'horizontal-stripes':
      case 'hoops': {
        const stripeHeight = 512 / 8
        ctx.fillStyle = secondary
        for (let i = 1; i < 8; i += 2) {
          ctx.fillRect(0, i * stripeHeight, 512, stripeHeight)
        }
        break
      }
      case 'gradient': {
        const grad = ctx.createLinearGradient(0, 0, 0, 512)
        grad.addColorStop(0, primary)
        grad.addColorStop(1, secondary)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, 512, 512)
        break
      }
      case 'sash': {
        ctx.fillStyle = secondary
        ctx.beginPath()
        ctx.moveTo(80, 0)
        ctx.lineTo(160, 0)
        ctx.lineTo(432, 512)
        ctx.lineTo(352, 512)
        ctx.closePath()
        ctx.fill()
        break
      }
      case 'halved': {
        ctx.fillStyle = secondary
        ctx.fillRect(256, 0, 256, 512)
        break
      }
      case 'solid':
      default:
        // Already filled with primary
        break
    }

    // 2. Collar & trims
    ctx.strokeStyle = accent || secondary
    ctx.lineWidth = 14
    ctx.beginPath()
    if (kit.collarStyle === 'v-neck') {
      ctx.moveTo(180, 0)
      ctx.lineTo(256, 70)
      ctx.lineTo(332, 0)
    } else {
      ctx.arc(256, 10, 60, 0, Math.PI)
    }
    ctx.stroke()

    // 3. Sponsor Chest Text or Stripe
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = 'bold 32px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('EMIRATES', 256, 320)

    // 4. Back Player Name
    if (kit.showPlayerName && playerName) {
      ctx.fillStyle = numberColor
      ctx.font = 'bold 34px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(playerName.toUpperCase(), 256, 120)
    }

    // 5. Back Shirt Number
    const fontName = kit.numberFont === 'block' ? 'Impact, sans-serif' : 'sans-serif'
    ctx.font = `bold 160px ${fontName}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Number outline
    ctx.lineWidth = 10
    ctx.strokeStyle = numberOutline
    ctx.strokeText(shirtNumber.toString(), 256, 230)

    // Number fill
    ctx.fillStyle = numberColor
    ctx.fillText(shirtNumber.toString(), 256, 230)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true

    textureCache.set(cacheKey, texture)
    return texture
  }

  public static isClashing(kitA: Kit, kitB: Kit): boolean {
    const colA = new THREE.Color(kitA.colors.primary)
    const colB = new THREE.Color(kitB.colors.primary)

    const dr = colA.r - colB.r
    const dg = colA.g - colB.g
    const db = colA.b - colB.b
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)

    // If Euclidean distance in RGB is < 0.35, colors clash
    return dist < 0.35
  }
}
