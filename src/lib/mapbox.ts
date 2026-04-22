export const mapbox = {
  token: import.meta.env.MAPBOX_KEY,
  styles: {
    standard: "mapbox://styles/mapbox/standard",
    light: "mapbox://styles/mapbox/light-v11",
    dark: "mapbox://styles/mapbox/navigation-night-v1",
    satellite: "mapbox://styles/mapbox/satellite-v9",
  },
} as const
