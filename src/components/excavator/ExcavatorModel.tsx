import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Grid } from '@react-three/drei'
import * as THREE from 'three'
import type { ExcavatorAngles } from '@/types/excavator'
import { liveViewState } from '@/lib/excavatorSync'

interface Props {
  angles: ExcavatorAngles
}

// DeckGL position is in metres; the GLB model's internal coordinates
// are much larger (the model appears at scale=0.8 but spans many Three.js units)
const POSITION_SCALE = 50

function CameraSync() {
  useFrame(({ camera }) => {
    const { position, bearing, pitch } = liveViewState
    const [px, py, pz] = position
    // DeckGL CARTESIAN (X=East, Y=North, Z=Up) > Three.js (X=East, Y=Up, Z=backward)
    // Horizontal axes are scaled so 1 m of walking ≈ meaningful parallax on the model.
    camera.position.set(px * POSITION_SCALE, pz, -py * POSITION_SCALE)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = THREE.MathUtils.degToRad(-bearing)
    camera.rotation.x = THREE.MathUtils.degToRad(-pitch)
  })
  return null
}

export function ExcavatorModel({ angles }: Props) {
  const { scene } = useGLTF('/excavator.glb')

  const boomRef = useRef<THREE.Object3D | null>(null)
  const stickRef = useRef<THREE.Object3D | null>(null)
  const bucketRef = useRef<THREE.Object3D | null>(null)
  const baseRef = useRef<THREE.Object3D | null>(null)

  useEffect(() => {
    scene.traverse((child) => {
      if (child.name === 'Boom0') boomRef.current = child
      if (child.name === 'Stick') stickRef.current = child
      if (child.name === 'Bucket') bucketRef.current = child
      if (child.name === 'Bone') baseRef.current = child
    })
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    console.log('[ExcavatorModel] natural size:', size, 'center:', center)
  }, [scene])

  useEffect(() => {
    const toRad = THREE.MathUtils.degToRad
    if (boomRef.current) boomRef.current.rotation.x = toRad(angles.boom)
    if (stickRef.current) stickRef.current.rotation.x = toRad(angles.stick)
    if (bucketRef.current) bucketRef.current.rotation.x = toRad(angles.bucket)
    if (baseRef.current) baseRef.current.rotation.z = toRad(angles.base)
  }, [angles])

  return (
    <>
      <CameraSync />
      <hemisphereLight args={[0xffffff, 0x444444, 1]} />
      <directionalLight position={[5, 5, 5]} intensity={4} />
      <group position={[7.5, -10, -3.5]} scale={0.8}> {/* ext model's coordinates and scale*/}
        <primitive object={scene} />
      </group>
      {/* Ground grid y value matching with ext model's y value */}
      <Grid
        position={[0, -10, 0]}
        infiniteGrid
        cellSize={5}
        cellThickness={0.4}
        cellColor="#555555"
        sectionSize={25}
        sectionThickness={0.9}
        sectionColor="#888888"
        fadeDistance={1000}
        fadeStrength={2}
      />
    </>
  )
}

useGLTF.preload('/excavator.glb')
