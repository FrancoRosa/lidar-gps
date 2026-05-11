import { ThemeProvider } from "./components/theme-provider"
// import { LidarFpv } from "./components/lidar-fpv"
import { LidarFpv } from "./components/lidar-fpv-trench-3d-excavator"
import "mapbox-gl/dist/mapbox-gl.css"

export function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="my-app-theme">
      <div className="relative w-screen h-screen">
        <LidarFpv />
      </div>
    </ThemeProvider>
  )
}

export default App