import { Button } from "@/components/ui/button"
import { Fullscreen } from "lucide-react"

export function ScreenToggle() {
  const handleFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.body.requestFullscreen()
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleFullScreen}
    >
      <Fullscreen />
    </Button>
  )
}
