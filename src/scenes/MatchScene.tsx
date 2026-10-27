import React, { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import { Stadium } from '../rendering/Stadium'
import { BallMesh } from '../rendering/BallMesh'
import { PlayerMesh } from '../rendering/PlayerMesh'
import { Camera } from '../rendering/Camera'
import { MatchHUD } from '../hud/MatchHUD'
import { PauseModal } from '../menus/PauseModal'
import { HalfTimeModal } from '../menus/HalfTimeModal'
import { FullTimeModal } from '../menus/FullTimeModal'
import { SimulationLoop } from '../engine/SimulationLoop'
import { useCamera } from '../hooks/useCamera'
import { useInput, isKeyHeld } from '../hooks/useInput'
import { useTeamStore } from '../store/teamStore'
import { useSettingsStore } from '../store/settingsStore'
import { useMatchStore } from '../store/matchStore'
import { getTeamById } from '../data/teams'
import type { Vec3 } from '../data/types'

// Internal canvas controller to drive the SimulationLoop inside the R3F loop
const MatchEngineBridge: React.FC<{
  sim: SimulationLoop
  inputState: ReturnType<typeof useInput>
  keyBindings: ReturnType<typeof useSettingsStore.getState>['settings']['keys']
  onUpdate: () => void
}> = ({ sim, inputState, keyBindings, onUpdate }) => {
  const lastShotTime = useRef(0)
  const lastPassTime = useRef(0)
  const lastSwitchTime = useRef(0)
  const lastTackleTime = useRef(0)

  useFrame((_, delta) => {
    // 1. Process movement inputs
    const moveVector: Vec3 = { x: 0, y: 0, z: 0 }
    if (isKeyHeld(inputState, keyBindings.moveForward)) moveVector.z += 1
    if (isKeyHeld(inputState, keyBindings.moveBackward)) moveVector.z -= 1
    if (isKeyHeld(inputState, keyBindings.moveLeft)) moveVector.x -= 1
    if (isKeyHeld(inputState, keyBindings.moveRight)) moveVector.x += 1

    const isSprinting = isKeyHeld(inputState, keyBindings.sprint)

    // Normalize diagonal movement
    const len = Math.hypot(moveVector.x, moveVector.z)
    if (len > 0.001) {
      moveVector.x /= len
      moveVector.z /= len
    }

    const now = Date.now()

    // 2. Action: Pass (Left Click or bound key)
    const isLeftClick = inputState.mouseButtons.has(0)
    if (isLeftClick && now - lastPassTime.current > 350) {
      sim.performPass(false, false)
      lastPassTime.current = now
    }

    // 3. Action: Through Ball (Q)
    if (isKeyHeld(inputState, keyBindings.throughBall) && now - lastPassTime.current > 350) {
      sim.performPass(true, false)
      lastPassTime.current = now
    }

    // 4. Action: Cross / Lofted (F)
    if (isKeyHeld(inputState, keyBindings.crossOrLoft) && now - lastPassTime.current > 350) {
      sim.performPass(false, true)
      lastPassTime.current = now
    }

    // 5. Action: Shoot (E)
    if (isKeyHeld(inputState, keyBindings.shoot) && now - lastShotTime.current > 400) {
      sim.performShot(80)
      lastShotTime.current = now
    }

    // 6. Action: Player Switch (Right Click)
    const isRightClick = inputState.mouseButtons.has(2)
    if (isRightClick && now - lastSwitchTime.current > 300) {
      sim.switchControlledPlayer()
      lastSwitchTime.current = now
    }

    // 7. Action: Tackle (Space)
    if (isKeyHeld(inputState, keyBindings.tackle) && now - lastTackleTime.current > 400) {
      sim.performTackle()
      lastTackleTime.current = now
    }

    // 8. Step the simulation loop
    sim.update(delta, moveVector, isSprinting)
    onUpdate()
  })

  return null
}

export default function MatchScene() {
  const navigate = useNavigate()
  const inputState = useInput()

  const { homeTeamId, awayTeamId } = useTeamStore()
  const { settings } = useSettingsStore()
  const {
    phase,
    score,
    minute,
    half,
    stats,
    showRadar,
    setPhase,
    setMinute,
    setHalf,
    updateStats,
    toggleRadar,
    resetMatch,
  } = useMatchStore()

  const homeTeam = useMemo(() => getTeamById(homeTeamId || 'real-madrid'), [homeTeamId])
  const awayTeam = useMemo(() => getTeamById(awayTeamId || 'manchester-city'), [awayTeamId])

  const { config: cameraConfig } = useCamera()
  const [renderTrigger, setRenderTrigger] = useState(0)

  // Instantiate the SimulationLoop
  const sim = useMemo(() => {
    return new SimulationLoop(homeTeam, awayTeam, settings.matchDuration || 5, {
      onPhaseChange: (p) => setPhase(p),
      onClockTick: (m, h) => {
        setMinute(m)
        setHalf(h)
      },
      onStatsUpdate: (s) => updateStats(s),
    })
  }, [homeTeam, awayTeam, settings.matchDuration, setPhase, setMinute, setHalf, updateStats])

  const handleUpdate = () => {
    setRenderTrigger((prev) => (prev + 1) % 100000)
  }

  // Handle Tab for radar toggle and Escape for pause
  const lastEscPress = useRef(0)
  const lastTabPress = useRef(0)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      if (e.key === 'Escape' && now - lastEscPress.current > 300) {
        lastEscPress.current = now
        const curPhase = sim.stateMachine.getPhase()
        if (curPhase !== 'PAUSED') {
          sim.stateMachine.transition('PAUSED')
          setPhase('PAUSED')
        } else {
          const prev = sim.stateMachine.getPrevPhaseBeforePause()
          sim.stateMachine.transition(prev || 'PLAYING')
          setPhase(prev || 'PLAYING')
        }
      }

      if (e.key === 'Tab' && now - lastTabPress.current > 300) {
        lastTabPress.current = now
        toggleRadar()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, sim, setPhase, toggleRadar])

  const controlledPlayer = sim.simPlayers.find((p) => p.id === sim.controlledPlayerId) || null
  const ballPos = sim.ballPhysics.getPosition()
  const ballVel = sim.ballPhysics.getVelocity()

  return (
    <div className="relative w-screen h-screen bg-[#0a0a0f] overflow-hidden select-none">
      {/* ─── 3D WebGL Canvas ─── */}
      <Canvas
        shadows={settings.graphics.shadows}
        camera={{ position: [38, 22, 0], fov: 42 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.65} />
        <directionalLight
          position={[25, 45, 25]}
          intensity={1.2}
          castShadow={settings.graphics.shadows}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
        />

        {/* 3D Pitch and Stadium architecture */}
        <Stadium />

        {/* 22 3D Animated Players with dynamic kits */}
        {sim.simPlayers.map((player) => (
          <PlayerMesh
            key={player.id}
            player={player}
            kit={
              player.role === 'goalkeeper'
                ? player.teamIndex === 0
                  ? homeTeam.gkKit
                  : awayTeam.gkKit
                : player.teamIndex === 0
                ? homeTeam.homeKit
                : awayTeam.awayKit
            }
          />
        ))}

        {/* 3D Ball */}
        <BallMesh position={ballPos} velocity={ballVel} />

        {/* Smooth Broadcast Camera */}
        <Camera ballPosition={ballPos} config={cameraConfig} />

        {/* Drive Simulation Loop on each frame */}
        <MatchEngineBridge
          sim={sim}
          inputState={inputState}
          keyBindings={settings.keys}
          onUpdate={handleUpdate}
        />
      </Canvas>

      {/* ─── Modern Broadcast HUD Overlay ─── */}
      <MatchHUD
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        score={sim.score}
        minute={minute}
        half={half}
        phase={phase}
        stats={sim.stats}
        controlledPlayer={controlledPlayer}
        players={sim.simPlayers}
        ballPosition={ballPos}
        showRadar={showRadar}
        onPauseToggle={() => {
          const curPhase = sim.stateMachine.getPhase()
          if (curPhase !== 'PAUSED') {
            sim.stateMachine.transition('PAUSED')
            setPhase('PAUSED')
          } else {
            const prev = sim.stateMachine.getPrevPhaseBeforePause()
            sim.stateMachine.transition(prev || 'PLAYING')
            setPhase(prev || 'PLAYING')
          }
        }}
      />

      {/* ─── Pause Menu Modal ─── */}
      {phase === 'PAUSED' && (
        <PauseModal
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          score={sim.score}
          minute={minute}
          stats={sim.stats}
          onResume={() => {
            const prev = sim.stateMachine.getPrevPhaseBeforePause()
            sim.stateMachine.transition(prev || 'PLAYING')
            setPhase(prev || 'PLAYING')
          }}
          onRestart={() => {
            sim.reset()
            resetMatch()
            setPhase('PLAYING')
          }}
          onQuit={() => {
            resetMatch()
            navigate('/')
          }}
        />
      )}

      {/* ─── Half-Time Modal ─── */}
      {phase === 'HALF_TIME' && (
        <HalfTimeModal
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          score={sim.score}
          stats={sim.stats}
          onStartSecondHalf={() => {
            sim.resumeSecondHalf()
            setPhase('PLAYING')
          }}
          onQuit={() => {
            resetMatch()
            navigate('/')
          }}
        />
      )}

      {/* ─── Full-Time Modal ─── */}
      {phase === 'FULL_TIME' && (
        <FullTimeModal
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          score={sim.score}
          stats={sim.stats}
          onRematch={() => {
            sim.reset()
            resetMatch()
            setPhase('PLAYING')
          }}
          onQuit={() => {
            resetMatch()
            navigate('/')
          }}
        />
      )}
    </div>
  )
}
