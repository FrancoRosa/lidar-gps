// LidarView.jsx — optimized for real-time updates
import React, { useEffect, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { PointCloudLayer } from "@deck.gl/layers";
import { OrbitView, COORDINATE_SYSTEM } from "@deck.gl/core";

const MAGIC = 0x4c314452;

function decodeFrame(buf) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error("bad magic");
  const n = dv.getUint32(4, true);
  const ts = dv.getFloat64(8, true);
  const floats = new Float32Array(buf, 16, n * 4);

  const positions = new Float32Array(n * 3);
  const colors = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) {
    positions[i * 3 + 0] = floats[i * 4 + 0];
    positions[i * 3 + 1] = floats[i * 4 + 1];
    positions[i * 3 + 2] = floats[i * 4 + 2];
    const r = Math.min(255, floats[i * 4 + 3]) / 255;
    colors[i * 3 + 0] = Math.round(255 * Math.min(1, r * 2));
    colors[i * 3 + 1] = Math.round(255 * Math.min(1, 0.3 + r));
    colors[i * 3 + 2] = Math.round(255 * (1 - r));
  }
  return { positions, colors, count: n, ts };
}

const INITIAL_VIEW_STATE = {
  target: [0, 0, 0],
  rotationX: 30,
  rotationOrbit: 30,
  zoom: 4,
};

export default function LidarView({ wsUrl = "ws://localhost:8000/lidar" }) {
  const frameRef = useRef(null);
  const versionRef = useRef(0);

  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState("connecting");
  const [stats, setStats] = useState({ fps: 0, count: 0 });

  const lastTRef = useRef(performance.now());
  const fpsEmaRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let retryDelay = 500;
    let pendingFrame = false;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setStatus("connected");
        retryDelay = 500;
      };

      ws.onmessage = (ev) => {
        try {
          const f = decodeFrame(ev.data);
          frameRef.current = f;

          const now = performance.now();
          const dt = (now - lastTRef.current) / 1000;
          lastTRef.current = now;
          if (dt > 0) fpsEmaRef.current = fpsEmaRef.current * 0.8 + (1 / dt) * 0.2;

          if (!pendingFrame) {
            pendingFrame = true;
            requestAnimationFrame(() => {
              pendingFrame = false;
              versionRef.current += 1;
              setVersion(versionRef.current);
              setStats({ fps: fpsEmaRef.current, count: f.count });
            });
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        setStatus("disconnected");
        if (!cancelled) {
          setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 5000);
        }
      };
      ws.onerror = () => ws.close();
    }
    connect();
    return () => { cancelled = true; };
  }, [wsUrl]);

  const frame = frameRef.current;
  const layers = frame
    ? [
        new PointCloudLayer({
          id: "lidar",
          coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          data: {
            length: frame.count,
            attributes: {
              getPosition: { value: frame.positions, size: 3 },
              getColor: { value: frame.colors, size: 3 },
            },
          },
          pointSize: 2,
          updateTriggers: {
            getPosition: version,
            getColor: version,
          },
        }),
      ]
    : [];

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: "#0b0d12" }}>
      <DeckGL
        views={new OrbitView({ orbitAxis: "Z", fov: 50 })}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
      />
      <div style={overlay}>
        <div>status: {status}</div>
        <div>points: {stats.count.toLocaleString()}</div>
        <div>fps: {stats.fps.toFixed(1)}</div>
      </div>
    </div>
  );
}

const overlay = {
  position: "absolute", top: 12, left: 12, padding: "8px 12px",
  background: "rgba(0,0,0,0.6)", color: "#cde",
  fontFamily: "monospace", fontSize: 12, borderRadius: 6,
};