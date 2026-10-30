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
import { useStadiumStore } from '../store/stadiumStore'
import { getStadiumConfig } from '../data/stadiums'
import { getTeamById } from '../data/teams'
import type { Vec3 } from '../data/types'

// Internal canvas controller to drive the SimulationLoop inside the R3F loop
const MatchEngineBridge: React.FC<{
  sim: SimulationLoop
  inputState: ReturnType<typeof useInput>
  keyBindings: ReturnType<typeof useSettingsStore.getState>['settings']['keys']
  virtualMoveRef: React.MutableRefObject<Vec3>
  virtualSprint: boolean
  onUpdate: () => void
}> = ({ sim, inputState, keyBindings, virtualMoveRef, virtualSprint, onUpdate }) => {
  const lastShotTime = useRef(0)
  const lastPassTime = useRef(0)
  const lastSwitchTime = useRef(0)
  const lastTackleTime = useRef(0)
  const wasShootPressed = useRef(false)
  const lastMoveMethod = useRef<'arrows' | 'wasd'>('arrows')

  useFrame((_, delta) => {
    // 1. Process movement inputs
    // Screen orientation relative to broadcast camera (Camera is at +X looking along -X):
    // Up on screen: -X (towards far sideline)
    // Down on screen: +X (towards near sideline)
    // Left on screen: -Z (towards Home goal on left)
    // Right on screen: +Z (towards Away goal on right)
    const moveVector: Vec3 = { x: 0, y: 0, z: 0 }

    const isArrowUp = isKeyHeld(inputState, 'arrowup')
    const isArrowDown = isKeyHeld(inputState, 'arrowdown')
    const isArrowLeft = isKeyHeld(inputState, 'arrowleft')
    const isArrowRight = isKeyHeld(inputState, 'arrowright')
    const isArrowMovement = isArrowUp || isArrowDown || isArrowLeft || isArrowRight

    const isW = isKeyHeld(inputState, keyBindings.moveForward) || isKeyHeld(inputState, 'w')
    const isS = isKeyHeld(inputState, keyBindings.moveBackward) || isKeyHeld(inputState, 's')
    const isA = isKeyHeld(inputState, keyBindings.moveLeft) || isKeyHeld(inputState, 'a')
    const isD = isKeyHeld(inputState, keyBindings.moveRight) || isKeyHeld(inputState, 'd')

    if (isArrowMovement) {
      lastMoveMethod.current = 'arrows'
    } else if (isS || (isW && !isA && !isD)) {
      lastMoveMethod.current = 'wasd'
    }

    if (lastMoveMethod.current === 'arrows' || isArrowMovement) {
      if (isArrowUp) moveVector.x -= 1
      if (isArrowDown) moveVector.x += 1
      if (isArrowLeft) moveVector.z -= 1
      if (isArrowRight) moveVector.z += 1
    } else {
      if (isW) moveVector.x -= 1
      if (isS) moveVector.x += 1
      if (isA) moveVector.z -= 1
      if (isD) moveVector.z += 1
    }

    // Add virtual joystick move vector
    if (Math.abs(virtualMoveRef.current.x) > 0.05 || Math.abs(virtualMoveRef.current.z) > 0.05) {
      moveVector.x += virtualMoveRef.current.x
      moveVector.z += virtualMoveRef.current.z
    }

    const isSprinting =
      isKeyHeld(inputState, keyBindings.sprint) ||
      isKeyHeld(inputState, 'shift') ||
      virtualSprint

    // Normalize diagonal movement
    const len = Math.hypot(moveVector.x, moveVector.z)
    if (len > 0.001) {
      moveVector.x /= len
      moveVector.z /= len
    }

    // Aim angle computed from movement direction if moving
    const aimAngle = len > 0.001 ? Math.atan2(moveVector.x, moveVector.z) : undefined

    const now = Date.now()
    const controlled = sim.simPlayers.find((p) => p.id === sim.controlledPlayerId)
    const hasPossession = controlled?.hasBall || false

    // 2. Action: Pass (A key, J key, Left-Click on grass / HUD)
    const isPassPressed =
      inputState.mouseButtons.has(0) ||
      isKeyHeld(inputState, 'j') ||
      (lastMoveMethod.current === 'arrows' && isKeyHeld(inputState, 'a')) ||
      (isKeyHeld(inputState, 'a') && hasPossession && !isW && !isS && !isD)

    if (isPassPressed && now - lastPassTime.current > 280) {
      sim.performPass(false, false, aimAngle)
      lastPassTime.current = now
    }

    // 3. Action: Through Ball (W key when using arrow keys, Q key, or keyBindings)
    const isThroughPressed =
      isKeyHeld(inputState, keyBindings.throughBall) ||
      isKeyHeld(inputState, 'q') ||
      (lastMoveMethod.current === 'arrows' && isKeyHeld(inputState, 'w'))

    if (isThroughPressed && now - lastPassTime.current > 300) {
      sim.performPass(true, false, aimAngle)
      lastPassTime.current = now
    }

    // 4. Action: Cross / Lofted Pass (D key, F key, or Right-Click when in possession)
    const isCrossPressed =
      isKeyHeld(inputState, keyBindings.crossOrLoft) ||
      isKeyHeld(inputState, 'f') ||
      (lastMoveMethod.current === 'arrows' && isKeyHeld(inputState, 'd')) ||
      (hasPossession && inputState.mouseButtons.has(2))

    if (isCrossPressed && now - lastPassTime.current > 300) {
      sim.performPass(false, true, aimAngle)
      lastPassTime.current = now
    }

    // 5. Action: Shoot with Hold-to-Charge (Spacebar when in possession, E, K)
    const isShootKeyHeld =
      (hasPossession && isKeyHeld(inputState, ' ')) ||
      isKeyHeld(inputState, keyBindings.shoot) ||
      isKeyHeld(inputState, 'k')

    if (isShootKeyHeld) {
      if (!wasShootPressed.current) {
        sim.startChargingShot()
        wasShootPressed.current = true
      }
    } else {
      if (wasShootPressed.current) {
        sim.releaseShot(aimAngle)
        wasShootPressed.current = false
        lastShotTime.current = now
      }
    }

    // 6. Action: Player Switch (Q when defending, Tab, Right-Click when defending, L)
    const isSwitchPressed =
      (!hasPossession && inputState.mouseButtons.has(2)) ||
      isKeyHeld(inputState, 'tab') ||
      isKeyHeld(inputState, 'l') ||
      (!hasPossession && isKeyHeld(inputState, 'q'))

    if (isSwitchPressed && now - lastSwitchTime.current > 250) {
      sim.switchControlledPlayer()
      lastSwitchTime.current = now
    }

    // 7. Action: Tackle (E key when defending, Space when defending)
    const isTacklePressed =
      (!hasPossession && isKeyHeld(inputState, ' ')) ||
      (!hasPossession && isKeyHeld(inputState, keyBindings.tackle)) ||
      (!hasPossession && isKeyHeld(inputState, 'e'))

    if (isTacklePressed && now - lastTackleTime.current > 350) {
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
    announcement,
    shotPower,
    setPhase,
    setMinute,
    setHalf,
    updateStats,
    toggleRadar,
    setAnnouncement,
    setShotPower,
    resetMatch,
  } = useMatchStore()

  const homeTeam = useMemo(() => getTeamById(homeTeamId || 'real-madrid'), [homeTeamId])
  const awayTeam = useMemo(() => getTeamById(awayTeamId || 'manchester-city'), [awayTeamId])
  const { selectedStadiumId } = useStadiumStore()
  const stadiumConfig = useMemo(() => getStadiumConfig(selectedStadiumId), [selectedStadiumId])

  const { config: cameraConfig } = useCamera()
  const [renderTrigger, setRenderTrigger] = useState(0)
  const [virtualSprint, setVirtualSprint] = useState(false)
  const [showOffsideLine, setShowOffsideLine] = useState(false)
  const virtualMoveRef = useRef<Vec3>({ x: 0, y: 0, z: 0 })

  // Instantiate the SimulationLoop
  const sim = useMemo(() => {
    return new SimulationLoop(homeTeam, awayTeam, settings.matchDuration || 5, {
      onPhaseChange: (p) => setPhase(p),
      onClockTick: (m, h) => {
        setMinute(m)
        setHalf(h)
      },
      onStatsUpdate: (s) => updateStats(s),
      onAnnouncement: (a) => setAnnouncement(a),
      onShotCharge: (ratio) => setShotPower(Math.round(ratio * 100)),
    })
  }, [homeTeam, awayTeam, settings.matchDuration, setPhase, setMinute, setHalf, updateStats, setAnnouncement, setShotPower])

  const handleUpdate = () => {
    setRenderTrigger((prev) => (prev + 1) % 100000)
  }

  // Handle Tab for radar toggle and Escape for pause
  const lastEscPress = useRef(0)
  const lastTabPress = useRef(0)

  // Resume immediately on user interaction
  const handleResumeFromGoal = () => {
    const curPhase = sim.stateMachine.getPhase()
    if (curPhase === 'GOAL_CELEBRATION' || curPhase === 'KICK_OFF') {
      sim.resumeFromGoal()
      setPhase('PLAYING')
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      const curPhase = sim.stateMachine.getPhase()

      // Any key press resumes from goal celebration or kick-off immediately
      if (curPhase === 'GOAL_CELEBRATION' || curPhase === 'KICK_OFF') {
        if (e.key !== 'Escape') {
          sim.resumeFromGoal()
          setPhase('PLAYING')
          return
        }
      }

      if (e.key === 'Escape' && now - lastEscPress.current > 300) {
        lastEscPress.current = now
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

    const onPointerDown = () => {
      const curPhase = sim.stateMachine.getPhase()
      if (curPhase === 'GOAL_CELEBRATION' || curPhase === 'KICK_OFF') {
        sim.resumeFromGoal()
        setPhase('PLAYING')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [phase, sim, setPhase, toggleRadar])

  const controlledPlayer = sim.simPlayers.find((p) => p.id === sim.controlledPlayerId) || null
  const ballPos = sim.ballPhysics.getPosition()
  const ballVel = sim.ballPhysics.getVelocity()

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ backgroundColor: stadiumConfig.skyColor }}
    >
      {/* ─── 3D WebGL Canvas ─── */}
      <Canvas
        shadows={settings.graphics.shadows}
        camera={{ position: [28, 16, 0], fov: 40 }}
        className="w-full h-full"
      >
        {/* Voxel Sky and Soft Horizon Distance Fog based on selected Stadium */}
        <color attach="background" args={[stadiumConfig.skyColor]} />
        <fog attach="fog" args={[stadiumConfig.fogColor, stadiumConfig.fogNear, stadiumConfig.fogFar]} />

        {/* Ambient & Daylight Sunlight / Stadium Floodlights for Voxel Colors */}
        <ambientLight intensity={stadiumConfig.ambientLightIntensity} color={stadiumConfig.ambientLightColor} />
        <directionalLight
          position={stadiumConfig.sunPosition}
          intensity={stadiumConfig.sunIntensity}
          color={stadiumConfig.sunColor}
          castShadow={settings.graphics.shadows}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-70}
          shadow-camera-right={70}
          shadow-camera-top={70}
          shadow-camera-bottom={-70}
          shadow-camera-near={10}
          shadow-camera-far={200}
          shadow-bias={-0.0003}
        />

        {/* 3D Voxel Pitch and Selected Stadium Environment */}
        <Stadium stadiumId={selectedStadiumId} />

        {/* 3D IFAB Offside Debug Line */}
        {showOffsideLine && sim.getOffsideLineZ() !== null && (
          <mesh
            position={[0, 0.05, sim.getOffsideLineZ()!]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[68, 0.3]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.7} side={2} />
          </mesh>
        )}

        {/* 22 3D Animated Voxel Players with dynamic kits & pass target highlights */}
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
            isPassTarget={player.id === sim.intendedPassTargetId}
            onSelect={(playerId) => {
              if (player.teamIndex === 0) {
                sim.performPassToTeammate(playerId)
              }
            }}
          />
        ))}

        {/* 3D Ball */}
        <BallMesh position={ballPos} velocity={ballVel} />

        {/* Smooth Broadcast Camera */}
        <Camera ballPosition={ballPos} player={controlledPlayer} config={cameraConfig} />

        {/* Drive Simulation Loop on each frame */}
        <MatchEngineBridge
          sim={sim}
          inputState={inputState}
          keyBindings={settings.keys}
          virtualMoveRef={virtualMoveRef}
          virtualSprint={virtualSprint}
          onUpdate={handleUpdate}
        />
      </Canvas>

      {/* ─── Modern Broadcast HUD Overlay with Virtual Controls ─── */}
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
        announcement={announcement}
        shotPower={shotPower}
        isSprinting={virtualSprint}
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
        onResumeFromGoal={handleResumeFromGoal}
        onPass={() => {
          handleResumeFromGoal()
          sim.performPass(false, false)
        }}
        onShootStart={() => {
          handleResumeFromGoal()
          sim.startChargingShot()
        }}
        onShootEnd={() => sim.releaseShot()}
        onThroughBall={() => {
          handleResumeFromGoal()
          sim.performPass(true, false)
        }}
        onCross={() => {
          handleResumeFromGoal()
          sim.performPass(false, true)
        }}
        onSwitchPlayer={() => {
          handleResumeFromGoal()
          sim.switchControlledPlayer()
        }}
        onTackle={() => {
          handleResumeFromGoal()
          sim.performTackle()
        }}
        onSprintToggle={() => setVirtualSprint((prev) => !prev)}
        onVirtualMove={(move) => {
          if (phase === 'GOAL_CELEBRATION' || phase === 'KICK_OFF') {
            handleResumeFromGoal()
          }
          virtualMoveRef.current = move
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
