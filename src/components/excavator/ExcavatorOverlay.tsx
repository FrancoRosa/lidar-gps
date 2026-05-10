import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ExcavatorModel } from './ExcavatorModel'
import type { ExcavatorAngles } from '@/types/excavator'

interface Props {
  angles: ExcavatorAngles
}

export function ExcavatorOverlay({ angles }: Props) {
  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      camera={{ fov: 80, near: 0.1, far: 2000 }}
      gl={{ alpha: true, antialias: true }}
    >
      <Suspense fallback={null}>
        <ExcavatorModel angles={angles} />
      </Suspense>
    </Canvas>
  )
}
