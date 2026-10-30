export type StadiumId = 'neon-metropolis' | 'tropical-beach' | 'mountain-valley'

export interface StadiumConfig {
  id: StadiumId
  name: string
  subtitle: string
  description: string
  atmosphere: 'night' | 'day'
  timeOfDay: string
  skyColor: string
  fogColor: string
  fogNear: number
  fogFar: number
  ambientLightColor: string
  ambientLightIntensity: number
  sunColor: string
  sunIntensity: number
  sunPosition: [number, number, number]
  features: string[]
  badgeColor: string
}

export const STADIUMS: Record<StadiumId, StadiumConfig> = {
  'neon-metropolis': {
    id: 'neon-metropolis',
    name: 'Neon Metropolis',
    subtitle: 'Cyber Voxel City by Night',
    description:
      'A high-octane stadium enveloped by futuristic neon skyscrapers, illuminated broadcast spires, glowing holographic towers, and animated highway traffic beneath a deep twilight sky.',
    atmosphere: 'night',
    timeOfDay: 'Night • 21:00',
    skyColor: '#090a1a',
    fogColor: '#0c0e24',
    fogNear: 95,
    fogFar: 300,
    ambientLightColor: '#c084fc',
    ambientLightIntensity: 0.82,
    sunColor: '#ffffff',
    sunIntensity: 1.45,
    sunPosition: [15, 85, 20],
    features: ['Neon Skyscrapers', 'Animated Highway Traffic', 'Night Twilight Sky', 'Floodlight Pylons'],
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  'tropical-beach': {
    id: 'tropical-beach',
    name: 'Tropical Beach Arena',
    subtitle: 'Coastal Island Paradise',
    description:
      'An open-air coastal arena framed by swaying voxel palm trees, golden sand beaches, gentle turquoise ocean waves, beach cabanas, and volcanic horizon islands under warm tropical sun.',
    atmosphere: 'day',
    timeOfDay: 'Day • 14:00 Sunny',
    skyColor: '#38bdf8',
    fogColor: '#7dd3fc',
    fogNear: 110,
    fogFar: 340,
    ambientLightColor: '#fef3c7',
    ambientLightIntensity: 0.95,
    sunColor: '#fffbeb',
    sunIntensity: 1.5,
    sunPosition: [25, 85, 25],
    features: ['Voxel Palm Trees', 'Animated Ocean Waves', 'Golden Beach & Cabanas', 'Distant Sailboats'],
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  'mountain-valley': {
    id: 'mountain-valley',
    name: 'Mountain Valley Arena',
    subtitle: 'Snow-Capped Alpine Valley',
    description:
      'A breathtaking arena carved inside an expansive alpine valley, surrounded by cascading waterfalls, massive snow-peaked mountains, dense pine forests, and drifting alpine mist.',
    atmosphere: 'day',
    timeOfDay: 'Day • 11:00 Clear Alpine',
    skyColor: '#60a5fa',
    fogColor: '#bfdbfe',
    fogNear: 105,
    fogFar: 350,
    ambientLightColor: '#f1f5f9',
    ambientLightIntensity: 0.92,
    sunColor: '#ffffff',
    sunIntensity: 1.45,
    sunPosition: [20, 85, 20],
    features: ['Snow-Capped Peaks', 'Dense Pine Forests', 'Cascading Waterfall', 'High Alpine Mist'],
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
}

export const STADIUM_LIST: StadiumConfig[] = Object.values(STADIUMS)

export function getStadiumConfig(id: StadiumId): StadiumConfig {
  return STADIUMS[id] || STADIUMS['neon-metropolis']
}
