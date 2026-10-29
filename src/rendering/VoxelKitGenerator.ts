import * as THREE from 'three'
import type { Kit } from '../data/types'

const jerseyTextureCache = new Map<string, THREE.CanvasTexture>()
const faceTextureCache = new Map<string, THREE.CanvasTexture>()

export class VoxelKitGenerator {
  /**
   * Generates a crisp pixel-art jersey texture with front/back numbers, stripes, and team colors.
   */
  public static createVoxelJerseyTexture(
    kit: Kit,
    shirtNumber: number,
    playerName?: string
  ): THREE.CanvasTexture {
    const cacheKey = `voxel-${kit.id}-${shirtNumber}-${playerName || ''}`
    if (jerseyTextureCache.has(cacheKey)) {
      return jerseyTextureCache.get(cacheKey)!
    }

    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return new THREE.CanvasTexture(canvas)
    }

    // Crisp pixelated rendering
    ctx.imageSmoothingEnabled = false

    const { primary, secondary, accent, numberColor, numberOutline } = kit.colors

    // 1. Fill base primary color
    ctx.fillStyle = primary
    ctx.fillRect(0, 0, 128, 128)

    // 2. Pixel stripes or pattern
    switch (kit.pattern) {
      case 'vertical-stripes': {
        const stripeWidth = 16
        ctx.fillStyle = secondary
        for (let x = 16; x < 128; x += 32) {
          ctx.fillRect(x, 0, stripeWidth, 128)
        }
        break
      }
      case 'horizontal-stripes':
      case 'hoops': {
        const stripeHeight = 16
        ctx.fillStyle = secondary
        for (let y = 16; y < 128; y += 32) {
          ctx.fillRect(0, y, 128, stripeHeight)
        }
        break
      }
      case 'halved': {
        ctx.fillStyle = secondary
        ctx.fillRect(64, 0, 64, 128)
        break
      }
      case 'sash': {
        ctx.fillStyle = secondary
        ctx.beginPath()
        ctx.moveTo(16, 0)
        ctx.lineTo(48, 0)
        ctx.lineTo(112, 128)
        ctx.lineTo(80, 128)
        ctx.closePath()
        ctx.fill()
        break
      }
      default:
        // Solid with subtle pixel noise/checkers
        ctx.fillStyle = secondary
        ctx.globalAlpha = 0.12
        for (let x = 0; x < 128; x += 8) {
          for (let y = 0; y < 128; y += 8) {
            if ((x / 8 + y / 8) % 2 === 0) {
              ctx.fillRect(x, y, 8, 8)
            }
          }
        }
        ctx.globalAlpha = 1.0
        break
    }

    // 3. Pixel collar trim
    ctx.fillStyle = accent || secondary
    ctx.fillRect(40, 0, 48, 8)
    ctx.fillRect(52, 8, 24, 8)

    // 4. Team Badge on left chest
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(24, 28, 16, 16)
    ctx.fillStyle = accent || secondary
    ctx.fillRect(26, 30, 12, 12)
    ctx.fillStyle = primary
    ctx.fillRect(28, 32, 8, 8)

    // 5. Pixel Shirt Number (Center Chest)
    ctx.fillStyle = numberOutline || '#000000'
    ctx.font = 'bold 36px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${shirtNumber}`, 64, 62)

    ctx.fillStyle = numberColor || '#ffffff'
    ctx.fillText(`${shirtNumber}`, 64, 60)

    // 6. Pixel Sponsor Banner
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(16, 88, 96, 18)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px monospace'
    ctx.fillText('VOXEL FC', 64, 100)

    // 7. Player Name on upper back / bottom border
    if (playerName) {
      ctx.fillStyle = numberColor || '#ffffff'
      ctx.font = 'bold 10px monospace'
      ctx.fillText(playerName.slice(0, 10).toUpperCase(), 64, 118)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.generateMipmaps = false

    jerseyTextureCache.set(cacheKey, texture)
    return texture
  }

  /**
   * Generates a sharp pixel-art face texture for voxel characters.
   */
  public static createVoxelFaceTexture(
    skinTone: string = '#d6a374',
    eyeColor: string = '#2563eb',
    hairColor: string = '#1f1610'
  ): THREE.CanvasTexture {
    const cacheKey = `face-${skinTone}-${eyeColor}-${hairColor}`
    if (faceTextureCache.has(cacheKey)) {
      return faceTextureCache.get(cacheKey)!
    }

    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return new THREE.CanvasTexture(canvas)
    }

    ctx.imageSmoothingEnabled = false

    // 1. Skin background
    ctx.fillStyle = skinTone
    ctx.fillRect(0, 0, 64, 64)

    // Subtle skin shading pixels
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)'
    for (let x = 0; x < 64; x += 8) {
      for (let y = 0; y < 64; y += 8) {
        if ((x + y) % 16 === 0) {
          ctx.fillRect(x, y, 8, 8)
        }
      }
    }

    // 2. Hair fringe along top of forehead
    ctx.fillStyle = hairColor
    ctx.fillRect(0, 0, 64, 16)
    ctx.fillRect(8, 16, 16, 8)
    ctx.fillRect(40, 16, 16, 8)

    // 3. Eyebrows
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    ctx.fillRect(12, 24, 16, 4)
    ctx.fillRect(36, 24, 16, 4)

    // 4. Pixel Eyes (Left eye & Right eye)
    // Sclera (White)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(12, 30, 16, 10)
    ctx.fillRect(36, 30, 16, 10)

    // Iris (eye color)
    ctx.fillStyle = eyeColor
    ctx.fillRect(16, 32, 8, 8)
    ctx.fillRect(40, 32, 8, 8)

    // Pupil (Dark)
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(18, 34, 4, 6)
    ctx.fillRect(42, 34, 4, 6)

    // Eye catchlight (white glint)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(16, 32, 4, 4)
    ctx.fillRect(40, 32, 4, 4)

    // 5. Nose shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
    ctx.fillRect(28, 42, 8, 6)

    // 6. Determined sports mouth / smile
    ctx.fillStyle = '#8b4513'
    ctx.fillRect(24, 52, 16, 4)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(28, 52, 8, 2) // teeth glint

    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.generateMipmaps = false

    faceTextureCache.set(cacheKey, texture)
    return texture
  }
}
