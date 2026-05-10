import { ThemeProvider } from "./components/theme-provider"
// import { LidarFpv } from "./components/lidar-fpv"
import { LidarFpv } from "./components/lidar-fpv-trench-3d-excavator"
import { ScreenToggle } from "./components/screen-toggle"
import "mapbox-gl/dist/mapbox-gl.css"

export function App() {
  return (
    // ThemeProvider wraps everything so all components can access theme
    <ThemeProvider defaultTheme="dark" storageKey="my-app-theme">

      {/* Full-screen container */}
      <div className="relative w-screen h-screen">

        {/* The main 3D map view */}
        <LidarFpv />

        {/* Fullscreen button — positioned top-right */}
        <div className="absolute top-4 right-4 z-20">
          <ScreenToggle />
        </div>

      </div>

    </ThemeProvider>
  )
}

export default App