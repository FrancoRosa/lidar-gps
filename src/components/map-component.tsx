import { DeckGL } from "@deck.gl/react"
import {
  COORDINATE_SYSTEM,
  FirstPersonView,
  PointCloudLayer,
  TextLayer,
} from "deck.gl"
import { PLYLoader } from "@loaders.gl/ply"
import Map, { NavigationControl } from "react-map-gl/mapbox"
import { mapbox } from "@/lib/mapbox"

export function MapComponent() {
  const layers = [
    new TextLayer({
      id: "text-test",
      data: [[0, 0]],

      getPosition: (d) => [d[0] + 0.000005, d[1] + 0.000005],
      getText: () => "Hello",
      // getText: (d) => "TEST",
      getAlignmentBaseline: "center",
      getColor: [255, 128, 0],
      getSize: 32,
      sizeMinPixels: 12,
      getTextAnchor: "end",
      pickable: true,
    }),
    new PointCloudLayer({
      // Data source: Dorit Borrmann, and Hassan Afzal from Jacobs University Bremen
      data: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/thermoscan.ply",
      modelMatrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1],
      coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
      pointSize: 4,
      loaders: [PLYLoader],
    }),
  ]

  return (
    <DeckGL
      views={[
        new FirstPersonView({
          focalDistance: 100,
          fovy: 80,
          // near: 0.1,
          // far: 1000,
        }),
      ]}
      initialViewState={
        {
          position: [0, 0, 43.5],
          bearing: 0,
          pitch: 0,
        } as any
      }
      controller={true}
      layers={layers}
    >
      <Map mapboxAccessToken={mapbox.token} mapStyle={mapbox.styles.light}>
        <NavigationControl
          showCompass={true}
          showZoom={true}
          visualizePitch={true}
        />
      </Map>
    </DeckGL>
  )
}
