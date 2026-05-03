import { DeckGL } from "@deck.gl/react"
import {
  FirstPersonView,
  FirstPersonController,
  PointCloudLayer,
} from "deck.gl"
import Map, { NavigationControl } from "react-map-gl/mapbox"
import { mapbox } from "@/lib/mapbox"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "./ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

// ── Constants ────────────────────────────────────────────────────────────────

const MAGIC = 0x4c314452 // "L1DR"

// 30 frames * 20k points = 600k accumulated points — enough for surfaces to
// read as surfaces. Only meaningful while the sensor is stationary.
const ACCUMULATION_FRAMES = 30

// Distance fade — points farther than FADE_FAR are dimmed, closer than
// FADE_NEAR are fully opaque. Tuned for a small (~10m) indoor scene.
const FADE_NEAR = 3
const FADE_FAR = 15

// Scroll speed multiplier
const SCROLL_SCALE = 0.05

// Sensor mounting offset: the sensor is mounted about 0.5m above the floor
const INITIAL_HEIGHT = 0.3

// Intensity values from the sensor are 0–255 (raw byte range), not 0–1.
// We normalize before feeding to the color ramp.
const INTENSITY_MAX = 255

// ── Types ────────────────────────────────────────────────────────────────────

type ColorMode = "height" | "intensity" | "distance"

type ViewStatus = "idle" | "connecting" | "connected" | "disconnected"

interface DecodedFrame {
  positions: Float32Array
  intensities: Float32Array
  count: number
  ts: number
}

// ── Decoder (inlined from lidar-view.tsx) ────────────────────────────────────
// Frame layout: [u32 magic][u32 n][f64 ts][f32 x,y,z,intensity] * n

function decodeFrame(buf: ArrayBuffer): DecodedFrame {
  const dv = new DataView(buf)
  if (dv.getUint32(0, true) !== MAGIC) {
    throw new Error("bad magic — frame is not a LiDAR frame")
  }
  const n = dv.getUint32(4, true)
  const ts = dv.getFloat64(8, true)
  const floats = new Float32Array(buf, 16, n * 4)

  const positions = new Float32Array(n * 3)
  const intensities = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    positions[i * 3 + 0] = floats[i * 4 + 0]
    positions[i * 3 + 1] = floats[i * 4 + 1]
    positions[i * 3 + 2] = floats[i * 4 + 2]
    intensities[i] = floats[i * 4 + 3]
  }

  return { positions, intensities, count: n, ts }
}

// ── Custom controller: slower scroll ─────────────────────────────────────────

class SlowFirstPersonController extends FirstPersonController {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleEvent(event: any) {
    if (event.type === "wheel" && event.srcEvent) {
      // Make a shallow copy of the event with the scaled delta so we don't
      // mutate the original DOM event (which other listeners might also see).
      const scaled = {
        ...event,
        delta: (event.delta ?? 0) * SCROLL_SCALE,
      }
      return super.handleEvent(scaled)
    }
    return super.handleEvent(event)
  }
}

// ── Color ramp (viridis) ─────────────────────────────────────────────────────

const VIRIDIS: Array<[number, number, number]> = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
]

function sampleRamp(
  ramp: Array<[number, number, number]>,
  t: number
): [number, number, number] {
  const x = Math.max(0, Math.min(1, t)) * (ramp.length - 1)
  const i = Math.floor(x)
  const f = x - i
  const a = ramp[i]
  const b = ramp[Math.min(i + 1, ramp.length - 1)]
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ]
}

// Build per-point RGBA. Alpha encodes the distance fade (atmospheric depth).
function buildColorsRGBA(
  positions: Float32Array,
  intensities: Float32Array,
  count: number,
  mode: ColorMode
): Uint8Array {
  const colors = new Uint8Array(count * 4)
  const tBuf = new Float32Array(count)

  if (mode === "intensity") {
    // Raw values are 0–255 (byte range). Normalize before sampling the ramp.
    for (let i = 0; i < count; i++) {
      tBuf[i] = Math.min(1, Math.max(0, intensities[i] / INTENSITY_MAX))
    }
  } else if (mode === "height") {
    let zMin = Infinity
    let zMax = -Infinity
    for (let i = 0; i < count; i++) {
      const z = positions[i * 3 + 2]
      if (z < zMin) zMin = z
      if (z > zMax) zMax = z
    }
    const zRange = zMax - zMin || 1
    for (let i = 0; i < count; i++) {
      tBuf[i] = (positions[i * 3 + 2] - zMin) / zRange
    }
  } else {
    // distance from sensor
    let dMax = 0
    const dBuf = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3 + 0]
      const y = positions[i * 3 + 1]
      const z = positions[i * 3 + 2]
      const d = Math.sqrt(x * x + y * y + z * z)
      dBuf[i] = d
      if (d > dMax) dMax = d
    }
    dMax = dMax || 1
    for (let i = 0; i < count; i++) {
      tBuf[i] = 1 - dBuf[i] / dMax
    }
  }

  const fadeRange = FADE_FAR - FADE_NEAR
  for (let i = 0; i < count; i++) {
    const c = sampleRamp(VIRIDIS, tBuf[i])
    colors[i * 4 + 0] = c[0]
    colors[i * 4 + 1] = c[1]
    colors[i * 4 + 2] = c[2]

    const x = positions[i * 3 + 0]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]
    const d = Math.sqrt(x * x + y * y + z * z)
    let a = 1
    if (d > FADE_NEAR) {
      a = 1 - (d - FADE_NEAR) / fadeRange
      if (a < 0.15) a = 0.15
      if (a > 1) a = 1
    }
    colors[i * 4 + 3] = Math.round(a * 255)
  }

  return colors
}

// ── Initial view state ───────────────────────────────────────────────────────

const INITIAL_VIEW_STATE = {
  position: [0, 0, INITIAL_HEIGHT] as [number, number, number],
  bearing: 0,
  pitch: 0,
  maxPitch: 89,
  minPitch: -89,
}

// ── Component ────────────────────────────────────────────────────────────────

export function LidarFpv() {
  const [viewState, setViewState] =
    useState<typeof INITIAL_VIEW_STATE>(INITIAL_VIEW_STATE)

  const [isAcquiring, setIsAcquiring] = useState(false)
  const [colorMode, setColorMode] = useState<ColorMode>("height")
  const [accumulate, setAccumulate] = useState(false)
  const [status, setStatus] = useState<ViewStatus>("idle")
  const [stats, setStats] = useState<{ fps: number; count: number }>({
    fps: 0,
    count: 0,
  })

  const liveFrameRef = useRef<DecodedFrame | null>(null)
  const frameRingRef = useRef<DecodedFrame[]>([])
  const versionRef = useRef(0)
  const [version, setVersion] = useState(0)
  const [ringSize, setRingSize] = useState(0)

  const accumulateRef = useRef(accumulate)
  useEffect(() => {
    accumulateRef.current = accumulate
  }, [accumulate])

  const lastTRef = useRef(performance.now())
  const fpsEmaRef = useRef(0)

  useEffect(() => {
    versionRef.current += 1
    setVersion(versionRef.current)
  }, [colorMode, accumulate])

  useEffect(() => {
    if (!accumulate) {
      frameRingRef.current = []
      setRingSize(0)
    }
  }, [accumulate])

  // ── WebSocket lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAcquiring) {
      setStatus("idle")
      return
    }

    let cancelled = false
    let pendingFrame = false
    setStatus("connecting")

    const ws = new WebSocket("ws://100.85.213.115:8000/lidar")
    ws.binaryType = "arraybuffer"

    ws.onopen = () => {
      if (!cancelled) setStatus("connected")
    }

    ws.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      try {
        const frame = decodeFrame(event.data)
        liveFrameRef.current = frame

        let nextRingSize = 0
        if (accumulateRef.current) {
          const ring = frameRingRef.current
          ring.push(frame)
          while (ring.length > ACCUMULATION_FRAMES) ring.shift()
          nextRingSize = ring.length
        }

        const now = performance.now()
        const dt = (now - lastTRef.current) / 1000
        lastTRef.current = now
        if (dt > 0) {
          fpsEmaRef.current = fpsEmaRef.current * 0.8 + (1 / dt) * 0.2
        }

        if (!pendingFrame) {
          pendingFrame = true
          requestAnimationFrame(() => {
            pendingFrame = false
            if (cancelled) return
            versionRef.current += 1
            setVersion(versionRef.current)
            setStats({ fps: fpsEmaRef.current, count: frame.count })
            if (accumulateRef.current) setRingSize(nextRingSize)
          })
        }
      } catch (err) {
        console.error("frame decode failed:", err)
      }
    }

    ws.onclose = () => {
      if (!cancelled) setStatus("disconnected")
    }

    ws.onerror = () => {
      ws.close()
    }

    return () => {
      cancelled = true
      ws.close()
    }
  }, [isAcquiring])

  // ── Build the layer's data ─────────────────────────────────────────────
  const layerData = useMemo(() => {
    const useRing = accumulate && frameRingRef.current.length > 0
    if (useRing) {
      const ring = frameRingRef.current
      let total = 0
      for (const f of ring) total += f.count

      const positions = new Float32Array(total * 3)
      const intensities = new Float32Array(total)
      let off = 0
      for (const f of ring) {
        positions.set(f.positions, off * 3)
        intensities.set(f.intensities, off)
        off += f.count
      }
      const colors = buildColorsRGBA(positions, intensities, total, colorMode)
      return { positions, colors, count: total }
    }

    const f = liveFrameRef.current
    if (!f) return null
    const colors = buildColorsRGBA(
      f.positions,
      f.intensities,
      f.count,
      colorMode
    )
    return { positions: f.positions, colors, count: f.count }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, colorMode, accumulate])

  // ── Layers ─────────────────────────────────────────────────────────────
  const layers = layerData
    ? [
        new PointCloudLayer({
          id: "lidar",
          coordinateSystem: "cartesian",
          data: {
            length: layerData.count,
            attributes: {
              getPosition: { value: layerData.positions, size: 3 },
              getColor: { value: layerData.colors, size: 4 },
            },
          },
          pointSize: 0.02,
          pickable: false,
          opacity: 1,
          updateTriggers: {
            getPosition: version,
            getColor: version,
          },
        }),
      ]
    : []

  const onViewStateChange = useCallback(({ viewState: next }: any) => {
    setViewState(next)
  }, [])

  const resetCamera = useCallback(() => {
    setViewState(INITIAL_VIEW_STATE)
  }, [])

  return (
    <DeckGL
      views={[
        new FirstPersonView({
          focalDistance: 100,
          fovy: 80,
          near: 0.1,
        }),
      ]}
      viewState={viewState as any}
      onViewStateChange={onViewStateChange}
      // subclassed controller for scaled-down scroll
      controller={{ type: SlowFirstPersonController }}
      layers={layers}
    >
      <Map mapboxAccessToken={mapbox.token} mapStyle={mapbox.styles.light}>
        <NavigationControl
          showCompass={true}
          showZoom={true}
          visualizePitch={true}
        />
      </Map>

      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <Button
          onClick={() => setIsAcquiring((v) => !v)}
          variant={isAcquiring ? "destructive" : "default"}
        >
          {isAcquiring ? "Stop Acquisition" : "Start Acquisition"}
        </Button>

        <div className="flex items-center gap-2 rounded-md bg-background/80 p-2 backdrop-blur">
          <span className="text-xs font-medium">Color</span>
          <Select
            value={colorMode}
            onValueChange={(v) => setColorMode(v as ColorMode)}
          >
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="height">Height (Z)</SelectItem>
              <SelectItem value="intensity">Intensity</SelectItem>
              <SelectItem value="distance">Distance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setAccumulate((v) => !v)}
          variant={accumulate ? "secondary" : "outline"}
          title={
            accumulate
              ? `Accumulating last ${ACCUMULATION_FRAMES} frames — only meaningful if the sensor is stationary`
              : "Click to accumulate frames (sensor must be stationary)"
          }
        >
          {accumulate
            ? `Freeze: ON (${ringSize}/${ACCUMULATION_FRAMES})`
            : "Freeze & Accumulate"}
        </Button>

        <Button onClick={resetCamera} variant="outline" size="sm">
          Reset Camera
        </Button>
      </div>

      {/* Status overlay */}
      <div className="absolute top-4 right-4 z-10 rounded-md bg-black/60 px-3 py-2 font-mono text-xs text-cyan-100">
        <div>status: {status}</div>
        <div>points: {stats.count.toLocaleString()}</div>
        <div>fps: {stats.fps.toFixed(1)}</div>
        <div>mode: {colorMode}</div>
      </div>
    </DeckGL>
  )
}