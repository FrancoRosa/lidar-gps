export interface ExcavatorAngles {
  boom: number   // degrees → rotation.x on Boom0 node
  stick: number  // degrees → rotation.x on Stick node
  bucket: number // degrees → rotation.x on Bucket node
  base: number   // degrees → rotation.z on Bone node
}

export interface DeckViewState {
  position: [number, number, number]
  bearing: number
  pitch: number
}

export const DEFAULT_ANGLES: ExcavatorAngles = {
  boom: 0,
  stick: 0,
  bucket: 0,
  base: 0,
}

export const ANGLE_MIN = -180
export const ANGLE_MAX = 180
export const ANGLE_STEP = 1

export const LS_KEYS = {
  boom: 'excavator_boom',
  stick: 'excavator_stick',
  bucket: 'excavator_bucket',
  base: 'excavator_base',
} as const

export function loadExcavatorAngles(): ExcavatorAngles {
  const parse = (key: string) => {
    const v = parseFloat(localStorage.getItem(key) ?? '')
    return isNaN(v) ? 0 : Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, v))
  }
  return {
    boom: parse(LS_KEYS.boom),
    stick: parse(LS_KEYS.stick),
    bucket: parse(LS_KEYS.bucket),
    base: parse(LS_KEYS.base),
  }
}
