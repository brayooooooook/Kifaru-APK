/** Seeded value-noise. Deterministic world generation, no third-party assets. */

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hash2(x: number, y: number, seed: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

export function noise2(x: number, y: number, seed = 17) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = fade(xf);
  const v = fade(yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x: number, y: number, octaves = 4, seed = 17) {
  let v = 0;
  let a = 0.5;
  let f = 1;
  let s = 0;
  for (let i = 0; i < octaves; i++) {
    v += a * noise2(x * f, y * f, seed + i * 19);
    s += a;
    a *= 0.5;
    f *= 2;
  }
  return v / s;
}

/** World height in metres. Flattened near the highway corridor. */
export function terrainHeight(x: number, z: number): number {
  const nx = x * 0.0016;
  const nz = z * 0.0016;
  let h = fbm(nx, nz, 5, 3) * 28 - 8;
  h += fbm(x * 0.006, z * 0.006, 3, 9) * 4;
  // Rift escarpment: drop south of Highland Junction
  const rift = 1 / (1 + Math.exp((z - 280) * 0.012));
  h -= rift * 10;
  // Flatten road corridors (highway roughly z-curve and city grids)
  const road = roadProximity(x, z);
  const flatten = Math.max(0, 1 - road / 28);
  h *= 1 - flatten * 0.92;
  h += flatten * 0.15;
  return h;
}

/** Approximate distance to the main sealed-road network. */
export function roadProximity(x: number, z: number): number {
  // Highway polyline: Mavuno -> Highland -> Kijani, plus city grids
  const dHighway = distToPolyline(x, z, HIGHWAY);
  const dMavuno = distToGrid(x + 820, z + 80, 180, 90);
  const dKijani = distToGrid(x - 920, z + 60, 140, 80);
  const dDepot = Math.hypot(x + 900, z + 40);
  return Math.min(dHighway, dMavuno, dKijani, dDepot);
}

export const HIGHWAY: [number, number][] = [
  [-980, -40],
  [-820, -80],
  [-640, -20],
  [-420, 80],
  [-220, 220],
  [-40, 380],
  [40, 420],
  [180, 360],
  [380, 220],
  [560, 80],
  [740, -10],
  [920, -60],
  [1080, -40],
];

function distToPolyline(x: number, z: number, pts: [number, number][]) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / l2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const pz = az + t * dz;
    best = Math.min(best, Math.hypot(x - px, z - pz));
  }
  return best;
}

function distToGrid(lx: number, lz: number, half: number, spacing: number) {
  if (Math.abs(lx) > half + 20 || Math.abs(lz) > half + 20) {
    return Math.hypot(Math.max(0, Math.abs(lx) - half), Math.max(0, Math.abs(lz) - half)) + 40;
  }
  const gx = Math.abs(lx % spacing);
  const gz = Math.abs(lz % spacing);
  const dx = Math.min(gx, spacing - gx);
  const dz = Math.min(gz, spacing - gz);
  return Math.min(dx, dz);
}

export function rand(seed: number) {
  const n = Math.sin(seed * 9999.13) * 43758.5453;
  return n - Math.floor(n);
}
