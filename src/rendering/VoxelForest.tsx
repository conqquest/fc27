import React, { useMemo } from 'react'
import * as THREE from 'three'

interface VoxelForestProps {
  pitchWidth?: number
  pitchLength?: number
}

export const VoxelForest: React.FC<VoxelForestProps> = ({
  pitchWidth = 68,
  pitchLength = 105,
}) => {
  // Safe clearance margin around pitch
  const clearX = pitchWidth / 2 + 7 // ~41m
  const clearZ = pitchLength / 2 + 7 // ~59.5m

  // Deterministic PRNG
  const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed++) * 10000
    return x - Math.floor(x)
  }

  // Generate procedural tree and foliage instance matrices
  const {
    woodMatrices,
    oakLeafMatrices,
    pineLeafMatrices,
    birchWoodMatrices,
    flowerMatrices,
  } = useMemo(() => {
    const woodMats: THREE.Matrix4[] = []
    const oakLeafMats: THREE.Matrix4[] = []
    const pineLeafMats: THREE.Matrix4[] = []
    const birchWoodMats: THREE.Matrix4[] = []
    const flowerMats: THREE.Matrix4[] = []

    const dummy = new THREE.Object3D()
    let seed = 42

    // Clusters of trees surrounding the pitch between clearance boundary and roads
    // Ranges: X from 42 to 75, -75 to -42; Z from 60 to 95, -95 to -60; and corners
    const treePositions: Array<{ x: number; z: number; type: 'oak' | 'pine' | 'birch'; scale: number }> = []

    // Side clusters (East & West)
    for (let i = 0; i < 40; i++) {
      const side = pseudoRandom(seed++) > 0.5 ? 1 : -1
      const x = side * (clearX + 4 + pseudoRandom(seed++) * 24)
      const z = (pseudoRandom(seed++) - 0.5) * (pitchLength + 20)
      const scale = 0.85 + pseudoRandom(seed++) * 0.35
      const type = pseudoRandom(seed++) > 0.6 ? 'oak' : pseudoRandom(seed++) > 0.5 ? 'birch' : 'pine'
      treePositions.push({ x, z, type, scale })
    }

    // Behind Goal clusters (North & South)
    for (let i = 0; i < 35; i++) {
      const side = pseudoRandom(seed++) > 0.5 ? 1 : -1
      const x = (pseudoRandom(seed++) - 0.5) * (pitchWidth + 30)
      const z = side * (clearZ + 4 + pseudoRandom(seed++) * 22)
      const scale = 0.85 + pseudoRandom(seed++) * 0.35
      const type = pseudoRandom(seed++) > 0.5 ? 'oak' : 'pine'
      treePositions.push({ x, z, type, scale })
    }

    // Corner Groves
    const corners = [
      [1, 1], [-1, 1], [1, -1], [-1, -1]
    ]
    for (const [cx, cz] of corners) {
      for (let i = 0; i < 15; i++) {
        const x = cx * (clearX + 2 + pseudoRandom(seed++) * 26)
        const z = cz * (clearZ + 2 + pseudoRandom(seed++) * 26)
        const scale = 0.9 + pseudoRandom(seed++) * 0.35
        const type = pseudoRandom(seed++) > 0.6 ? 'pine' : 'oak'
        treePositions.push({ x, z, type, scale })
      }
    }

    // Construct block matrices for each tree
    for (const tree of treePositions) {
      const { x, z, type, scale } = tree

      if (type === 'oak') {
        const trunkHeight = Math.round(4 * scale)
        // Oak Trunk blocks
        for (let y = 0; y < trunkHeight; y++) {
          dummy.position.set(x, y + 0.5, z)
          dummy.scale.set(0.9, 1.0, 0.9)
          dummy.rotation.set(0, 0, 0)
          dummy.updateMatrix()
          woodMats.push(dummy.matrix.clone())
        }

        // Oak Leaves: 3-layer block canopy
        for (let ly = -1; ly <= 1; ly++) {
          const radius = ly === 1 ? 1 : 2
          for (let lx = -radius; lx <= radius; lx++) {
            for (let lz = -radius; lz <= radius; lz++) {
              if (Math.abs(lx) === radius && Math.abs(lz) === radius && pseudoRandom(seed++) > 0.4) {
                continue // rounded corners
              }
              dummy.position.set(x + lx, trunkHeight + ly + 0.5, z + lz)
              dummy.scale.set(1.0, 1.0, 1.0)
              dummy.rotation.set(0, 0, 0)
              dummy.updateMatrix()
              oakLeafMats.push(dummy.matrix.clone())
            }
          }
        }
      } else if (type === 'birch') {
        const trunkHeight = Math.round(5 * scale)
        // Birch Trunk blocks (white with black spots)
        for (let y = 0; y < trunkHeight; y++) {
          dummy.position.set(x, y + 0.5, z)
          dummy.scale.set(0.85, 1.0, 0.85)
          dummy.rotation.set(0, 0, 0)
          dummy.updateMatrix()
          birchWoodMats.push(dummy.matrix.clone())
        }

        // Birch Leaves
        for (let ly = -1; ly <= 1; ly++) {
          const radius = ly === 1 ? 1 : 2
          for (let lx = -radius; lx <= radius; lx++) {
            for (let lz = -radius; lz <= radius; lz++) {
              if (Math.abs(lx) === radius && Math.abs(lz) === radius) continue
              dummy.position.set(x + lx, trunkHeight + ly + 0.5, z + lz)
              dummy.scale.set(0.98, 0.98, 0.98)
              dummy.rotation.set(0, 0, 0)
              dummy.updateMatrix()
              oakLeafMats.push(dummy.matrix.clone())
            }
          }
        }
      } else {
        // Pine / Spruce Tree: Tapered pyramid layers
        const trunkHeight = Math.round(6 * scale)
        for (let y = 0; y < trunkHeight; y++) {
          dummy.position.set(x, y + 0.5, z)
          dummy.scale.set(0.9, 1.0, 0.9)
          dummy.rotation.set(0, 0, 0)
          dummy.updateMatrix()
          woodMats.push(dummy.matrix.clone())
        }

        // Tier 1 (bottom wide)
        for (let lx = -2; lx <= 2; lx++) {
          for (let lz = -2; lz <= 2; lz++) {
            if (Math.abs(lx) === 2 && Math.abs(lz) === 2) continue
            dummy.position.set(x + lx, trunkHeight - 2 + 0.5, z + lz)
            dummy.scale.set(1, 1, 1)
            dummy.updateMatrix()
            pineLeafMats.push(dummy.matrix.clone())
          }
        }
        // Tier 2 (middle)
        for (let lx = -1; lx <= 1; lx++) {
          for (let lz = -1; lz <= 1; lz++) {
            dummy.position.set(x + lx, trunkHeight + 0.5, z + lz)
            dummy.scale.set(1, 1, 1)
            dummy.updateMatrix()
            pineLeafMats.push(dummy.matrix.clone())
          }
        }
        // Tier 3 (tip)
        dummy.position.set(x, trunkHeight + 1.5, z)
        dummy.scale.set(0.8, 1.2, 0.8)
        dummy.updateMatrix()
        pineLeafMats.push(dummy.matrix.clone())
      }

      // Small flower / grass tuft near tree
      if (pseudoRandom(seed++) > 0.4) {
        dummy.position.set(x + (pseudoRandom(seed++) - 0.5) * 3, 0.2, z + (pseudoRandom(seed++) - 0.5) * 3)
        dummy.scale.set(0.25, 0.4, 0.25)
        dummy.updateMatrix()
        flowerMats.push(dummy.matrix.clone())
      }
    }

    return {
      woodMatrices: woodMats,
      oakLeafMatrices: oakLeafMats,
      pineLeafMatrices: pineLeafMats,
      birchWoodMatrices: birchWoodMats,
      flowerMatrices: flowerMats,
    }
  }, [clearX, clearZ, pitchLength, pitchWidth])

  // Instanced Mesh ref helpers
  const woodInstancedRef = React.useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    for (let i = 0; i < woodMatrices.length; i++) {
      mesh.setMatrixAt(i, woodMatrices[i])
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [woodMatrices])

  const birchInstancedRef = React.useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    for (let i = 0; i < birchWoodMatrices.length; i++) {
      mesh.setMatrixAt(i, birchWoodMatrices[i])
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [birchWoodMatrices])

  const oakLeafInstancedRef = React.useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    for (let i = 0; i < oakLeafMatrices.length; i++) {
      mesh.setMatrixAt(i, oakLeafMatrices[i])
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [oakLeafMatrices])

  const pineLeafInstancedRef = React.useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    for (let i = 0; i < pineLeafMatrices.length; i++) {
      mesh.setMatrixAt(i, pineLeafMatrices[i])
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [pineLeafMatrices])

  const flowerInstancedRef = React.useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    for (let i = 0; i < flowerMatrices.length; i++) {
      mesh.setMatrixAt(i, flowerMatrices[i])
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [flowerMatrices])

  return (
    <group name="voxel-forest">
      {/* Oak & Pine Wood Trunks */}
      {woodMatrices.length > 0 && (
        <instancedMesh
          ref={woodInstancedRef}
          args={[undefined, undefined, woodMatrices.length]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.9} />
        </instancedMesh>
      )}

      {/* Birch Wood Trunks */}
      {birchWoodMatrices.length > 0 && (
        <instancedMesh
          ref={birchInstancedRef}
          args={[undefined, undefined, birchWoodMatrices.length]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#e2dcd2" roughness={0.85} />
        </instancedMesh>
      )}

      {/* Oak & Birch Leaves (Vibrant Forest Green) */}
      {oakLeafMatrices.length > 0 && (
        <instancedMesh
          ref={oakLeafInstancedRef}
          args={[undefined, undefined, oakLeafMatrices.length]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#3b7a24" roughness={0.8} />
        </instancedMesh>
      )}

      {/* Pine / Spruce Leaves (Deep Evergreen) */}
      {pineLeafMatrices.length > 0 && (
        <instancedMesh
          ref={pineLeafInstancedRef}
          args={[undefined, undefined, pineLeafMatrices.length]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#235327" roughness={0.85} />
        </instancedMesh>
      )}

      {/* Small Flowers and Ground Plants */}
      {flowerMatrices.length > 0 && (
        <instancedMesh
          ref={flowerInstancedRef}
          args={[undefined, undefined, flowerMatrices.length]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.7} />
        </instancedMesh>
      )}
    </group>
  )
}
