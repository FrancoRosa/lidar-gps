import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import {
  type ExcavatorAngles,
  DEFAULT_ANGLES,
  ANGLE_MIN,
  ANGLE_MAX,
  SENSOR_URL,
  SENSOR_EVENT,
  SENSOR_MAPPING,
} from '@/types/excavator'

type SensorPayload = Record<string, { x: number; y: number; z: number }>

export function useSensorAngles(enabled: boolean): ExcavatorAngles | null {
  const [angles, setAngles] = useState<ExcavatorAngles | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!enabled) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setAngles(null)
      return
    }

    const socket = io(SENSOR_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on(SENSOR_EVENT, (data: SensorPayload) => {
      const next: ExcavatorAngles = { ...DEFAULT_ANGLES }
      for (const joint of Object.keys(SENSOR_MAPPING) as (keyof ExcavatorAngles)[]) {
        const { device, axis, negate } = SENSOR_MAPPING[joint]
        const dev = data[device]
        if (!dev) continue
        let val = dev[axis]
        if (negate) val = -val
        next[joint] = Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, val))
      }
      setAngles(next)
    })

    return () => { socket.disconnect() }
  }, [enabled])

  return angles
}
