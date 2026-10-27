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
    // Screen orientation relative to broadcast camera (Camera is at +X looking along -X):
    // Up on screen: -X (towards far sideline)
    // Down on screen: +X (towards near sideline)
    // Left on screen: -Z (towards Home goal on left)
    // Right on screen: +Z (towards Away goal on right)
    const moveVector: Vec3 = { x: 0, y: 0, z: 0 }

    const isUp =
      isKeyHeld(inputState, keyBindings.moveForward) ||
      isKeyHeld(inputState, 'arrowup')
    const isDown =
      isKeyHeld(inputState, keyBindings.moveBackward) ||
      isKeyHeld(inputState, 'arrowdown')
    const isLeft =
      isKeyHeld(inputState, keyBindings.moveLeft) ||
      isKeyHeld(inputState, 'arrowleft')
    const isRight =
      isKeyHeld(inputState, keyBindings.moveRight) ||
      isKeyHeld(inputState, 'arrowright')

    if (isUp) moveVector.x -= 1
    if (isDown) moveVector.x += 1
    if (isLeft) moveVector.z -= 1
    if (isRight) moveVector.z += 1

    const isSprinting =
      isKeyHeld(inputState, keyBindings.sprint) ||
      isKeyHeld(inputState, 'shift')

    // Normalize diagonal movement
    const len = Math.hypot(moveVector.x, moveVector.z)
    if (len > 0.001) {
      moveVector.x /= len
      moveVector.z /= len
    }

    // Aim angle computed from movement direction if moving
    const aimAngle = len > 0.001 ? Math.atan2(moveVector.x, moveVector.z) : undefined

    const now = Date.now()

    // 2. Action: Pass (Left Click or J or Space when in possession)
    const controlled = sim.simPlayers.find((p) => p.id === sim.controlledPlayerId)
    const hasPossession = controlled?.hasBall || false

    const isPassPressed =
      inputState.mouseButtons.has(0) ||
      isKeyHeld(inputState, 'j') ||
      (hasPossession && isKeyHeld(inputState, ' '))

    if (isPassPressed && now - lastPassTime.current > 280) {
      sim.performPass(false, false, aimAngle)
      lastPassTime.current = now
    }

    // 3. Action: Through Ball (Q)
    if (isKeyHeld(inputState, keyBindings.throughBall) && now - lastPassTime.current > 300) {
      sim.performPass(true, false, aimAngle)
      lastPassTime.current = now
    }

    // 4. Action: Cross / Lofted (F)
    if (isKeyHeld(inputState, keyBindings.crossOrLoft) && now - lastPassTime.current > 300) {
      sim.performPass(false, true, aimAngle)
      lastPassTime.current = now
    }

    // 5. Action: Shoot (E or K)
    const isShootPressed = isKeyHeld(inputState, keyBindings.shoot) || isKeyHeld(inputState, 'k')
    if (isShootPressed && now - lastShotTime.current > 350) {
      sim.performShot(85, aimAngle)
      lastShotTime.current = now
    }

    // 6. Action: Player Switch (Right Click or L)
    const isSwitchPressed = inputState.mouseButtons.has(2) || isKeyHeld(inputState, 'l')
    if (isSwitchPressed && now - lastSwitchTime.current > 250) {
      sim.switchControlledPlayer()
      lastSwitchTime.current = now
    }

    // 7. Action: Tackle (Space when defending)
    if (!hasPossession && isKeyHeld(inputState, keyBindings.tackle) && now - lastTackleTime.current > 350) {
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
        camera={{ position: [28, 15, 0], fov: 38 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.75} />
        <directionalLight
          position={[20, 35, 20]}
          intensity={1.5}
          castShadow={settings.graphics.shadows}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-55}
          shadow-camera-right={55}
          shadow-camera-top={55}
          shadow-camera-bottom={55}
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
