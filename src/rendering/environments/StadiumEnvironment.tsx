import React from 'react'
import type { StadiumId } from '../../data/stadiums'
import { NeonMetropolisEnvironment } from './NeonMetropolisEnvironment'
import { TropicalBeachEnvironment } from './TropicalBeachEnvironment'
import { MountainValleyEnvironment } from './MountainValleyEnvironment'

interface StadiumEnvironmentProps {
  stadiumId: StadiumId
  pitchWidth: number
  pitchLength: number
}

export const StadiumEnvironment: React.FC<StadiumEnvironmentProps> = ({
  stadiumId,
  pitchWidth,
  pitchLength,
}) => {
  switch (stadiumId) {
    case 'neon-metropolis':
      return <NeonMetropolisEnvironment pitchWidth={pitchWidth} pitchLength={pitchLength} />
    case 'tropical-beach':
      return <TropicalBeachEnvironment pitchWidth={pitchWidth} pitchLength={pitchLength} />
    case 'mountain-valley':
      return <MountainValleyEnvironment pitchWidth={pitchWidth} pitchLength={pitchLength} />
    default:
      return <NeonMetropolisEnvironment pitchWidth={pitchWidth} pitchLength={pitchLength} />
  }
}
