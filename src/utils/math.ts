import type { Vec3 } from '../data/types'

export const vec3 = {
  add: (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  scale: (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  dot: (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z,
  cross: (a: Vec3, b: Vec3): Vec3 => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  length: (a: Vec3): number => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z),
  lengthSq: (a: Vec3): number => a.x * a.x + a.y * a.y + a.z * a.z,
  normalize: (a: Vec3): Vec3 => {
    const len = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
    if (len < 1e-6) return { x: 0, y: 0, z: 0 }
    return { x: a.x / len, y: a.y / len, z: a.z / len }
  },
  lerp: (a: Vec3, b: Vec3, t: number): Vec3 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }),
  distance: (a: Vec3, b: Vec3): number => {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  },
  distanceSq: (a: Vec3, b: Vec3): number => {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
    return dx * dx + dy * dy + dz * dz
  },
  clone: (a: Vec3): Vec3 => ({ x: a.x, y: a.y, z: a.z }),
  fromArray: (arr: [number, number, number]): Vec3 => ({ x: arr[0], y: arr[1], z: arr[2] }),
  toArray: (v: Vec3): [number, number, number] => [v.x, v.y, v.z],
  zero: (): Vec3 => ({ x: 0, y: 0, z: 0 }),
  negate: (a: Vec3): Vec3 => ({ x: -a.x, y: -a.y, z: -a.z }),
  project2D: (a: Vec3): Vec3 => ({ x: a.x, y: 0, z: a.z }),
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function angleToVec3(angle: number): Vec3 {
  return { x: Math.sin(angle), y: 0, z: Math.cos(angle) }
}

export function vec3ToAngle(v: Vec3): number {
  return Math.atan2(v.x, v.z)
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function randomNormal(stddev = 1.0): number {
  // Box-Muller transform
  const u1 = Math.random(), u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * stddev
}

/** Signed angle from a to b in xz plane */
export function signedAngleTo(a: Vec3, b: Vec3): number {
  return Math.atan2(b.x * a.z - b.z * a.x, b.x * a.x + b.z * a.z)
}
