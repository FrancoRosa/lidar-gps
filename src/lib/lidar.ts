const MAGIC = 0x4c314452;

export const decodeFrame = (buf:any) => {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error("bad magic");
  const n = dv.getUint32(4, true);
  const ts = dv.getFloat64(8, true);
  const pts = new Float32Array(buf, 16, n * 4);
  return { n, ts, pts };
}

export const pointsToDeckFormat = (pts:any) => {
  const out = new Array(pts.length / 4);

  for (let i = 0, j = 0; i < pts.length; i += 4, j++) {
    const x = pts[i];
    const y = pts[i + 1];
    const z = pts[i + 2];
    const r = pts[i + 3]; // reflectivity

    out[j] = {
      position: [x, y, z],
      color: [r, r, r], // grayscale
    };
  }

  return out;
}