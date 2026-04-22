import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface GlobalState {
  authenticated: boolean
  hOffset: number
  fpv: boolean
  view: object
  project: any
  vehicle: {
    targets: any[]
    name: string
    antX: number
    antY: number
    antZ: number
    model: string
    length: number
    width: number
  }
  style: string
  authenticate: () => void
  logout: () => void
  togglefpv: () => void
  resetView: () => void
  setStyle: (style: string) => void
  setProject: (proj: object) => void
  setVehicle: (v: any) => void
  setHOffset: (v: any) => void
}

const initialView = {
  longitude: -120.18597336,
  latitude: 36.51219435,
  zoom: 20,
  maxZoom: 25,
  pitch: 0,
  bearing: 0,
}

const initialVehicle = {
  name: "bron585",
  model: "plow",
  antX: 5.9,
  antY: 6.9,
  antZ: 7,
  length: 33,
  width: 11,
  targets: [
    {
      name: "E1",
      color: "#ff7300",
      x: -1,
      y: 8,
      z: 10,
    },
    {
      name: "E2",
      color: "#00FF00",
      x: 1,
      y: 8,
      z: 10,
    },
    {
      name: "MV",
      color: "#002aff",
      x: 0,
      y: 8,
      z: 9,
    },
    {
      name: "OF",
      color: "#ff00f7",
      x: 0,
      y: 8,
      z: 10,
    },
  ],
}

const calProj4 =
  "+proj=lcc +lat_0=35.3333333333333 +lon_0=-119 +lat_1=37.25 +lat_2=36 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs"

export const useGlobal = create<GlobalState>()(
  persist(
    (set, get) => ({
      hOffset: 0,
      authenticated: false,
      fpv: true,
      view: initialView,
      style: "light",
      vehicle: initialVehicle,

      project: { name: "", proj4: calProj4 },
      setStyle: (stl) => set(() => ({ style: stl })),
      setVehicle: (veh) => set(() => ({ vehicle: veh })),
      setProject: (proj) => set(() => ({ project: proj })),
      authenticate: () => set(() => ({ authenticated: true })),
      logout: () => set(() => ({ authenticated: false })),
      togglefpv: () => {
        set(() => ({ fpv: !get().fpv }))
        if (get().fpv) {
          set(() => ({ view: initialView }))
        }
      },
      resetView: () => set(() => ({ view: initialView })),
      setHOffset: (hOffset) => set(() => ({ hOffset })),
    }),
    {
      name: "mort-storage", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
)
