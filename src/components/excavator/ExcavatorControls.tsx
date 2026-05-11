import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { ANGLE_MIN, ANGLE_MAX, ANGLE_STEP, type ExcavatorAngles } from '@/types/excavator'

interface Props {
  angles: ExcavatorAngles
  onChange: (angles: ExcavatorAngles) => void
  sensorEnabled: boolean
  onSensorToggle: () => void
}

const JOINTS = [
  { key: 'boom' as const, label: 'Boom' },
  { key: 'stick' as const, label: 'Stick' },
  { key: 'bucket' as const, label: 'Bucket' },
  { key: 'base' as const, label: 'Base' },
]

export function ExcavatorControls({ angles, onChange, sensorEnabled, onSensorToggle }: Props) {
  const [open, setOpen] = useState(true)

  const setJoint = (joint: keyof ExcavatorAngles) => (val: number[]) =>
    onChange({ ...angles, [joint]: val[0] })

  return (
    // data-no-deck: signals SlowFirstPersonController to ignore events from
    // inside this panel, so DeckGL's camera stays still during slider drags.
    <div
      data-no-deck
      className="absolute bottom-4 right-4 z-20 w-64 overflow-hidden rounded-lg bg-black/80 text-white ring-1 ring-white/10 backdrop-blur"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-widest text-cyan-300 transition-colors hover:bg-white/5"
      >
        <span>Excavator Control</span>
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {open && (
        <div className="flex flex-col gap-3 px-3 pb-3">
          {/* Sensor Control toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Sensor Control</span>
            <button
              onClick={onSensorToggle}
              className={`min-w-[3rem] rounded px-2 py-0.5 text-right font-mono text-xs transition-colors ${
                sensorEnabled ? "text-cyan-400 bg-cyan-400/10" : "text-zinc-500 hover:text-white"
              }`}
            >
              {sensorEnabled ? "ON" : "OFF"}
            </button>
          </div>

          {/* Joint sliders — read-only while sensor is driving */}
          <div className={sensorEnabled ? "pointer-events-none opacity-50" : ""}>
            <div className="flex flex-col gap-3">
              {JOINTS.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>{label}</span>
                    <span className="min-w-[3rem] text-right font-mono text-cyan-400">
                      {angles[key]}°
                    </span>
                  </div>
                  <Slider
                    value={[angles[key]]}
                    onValueChange={setJoint(key)}
                    min={ANGLE_MIN}
                    max={ANGLE_MAX}
                    step={ANGLE_STEP}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
