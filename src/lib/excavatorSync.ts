// Mutable box shared between DeckGL's onViewStateChange and R3F's useFrame.
// Written synchronously on every DeckGL view update — no React re-render cycle.
// R3F reads this directly on each frame so the camera sync has less lag.
export const liveViewState = {
  position: [0, 0, 0.2] as [number, number, number],
  bearing: 0,
  pitch: 0,
}
