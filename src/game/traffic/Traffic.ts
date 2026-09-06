import * as THREE from 'three';
import type { GameWorld } from '../world/World';
import { rand, terrainHeight } from '../core/noise';

type Kind = 'car' | 'matatu' | 'bus' | 'bike' | 'truck';

interface AICar {
  kind: Kind;
  mesh: THREE.Group;
  i: number;
  dir: 1 | -1;
  speed: number;
  target: number;
  lateral: number; // extra offset, positive = toward right of travel (overtake side in LHT)
  color: number;
}

function vehicleMesh(kind: Kind, color: number) {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111 });
  let w = 1.7, h = 1.4, l = 4.1;
  if (kind === 'matatu') { w = 2.1; h = 2.4; l = 6.2; }
  if (kind === 'bus') { w = 2.5; h = 3.1; l = 11; }
  if (kind === 'bike') { w = 0.5; h = 1.1; l = 1.8; }
  if (kind === 'truck') { w = 2.4; h = 3.4; l = 8.5; }
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), bodyM);
  body.position.y = h / 2 + 0.2;
  body.castShadow = true;
  g.add(body);
  if (kind !== 'bike') {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.45, l * 0.28), new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.45 }));
    cab.position.set(0, h * 0.85, l * 0.22);
    g.add(cab);
  }
  for (const x of kind === 'bike' ? [0] : [-0.65, 0.65]) {
    for (const z of [-l * 0.32, l * 0.32]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 8), dark);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(x, 0.32, z);
      g.add(wh);
    }
  }
  return g;
}

const KINDS: Kind[] = ['car', 'car', 'matatu', 'car', 'bike', 'bus', 'truck', 'car'];
const COLORS = [0xc45c2a, 0xe8e0c8, 0x2a6b3a, 0x1f3a73, 0xb83a3a, 0xd6b23a, 0x888890, 0x5a2a6a];

export class Traffic {
  cars: AICar[] = [];
  group = new THREE.Group();

  constructor(scene: THREE.Scene, world: GameWorld, count = 18) {
    scene.add(this.group);
    const n = world.highway.length;
    for (let i = 0; i < count; i++) {
      const kind = KINDS[i % KINDS.length];
      const color = COLORS[i % COLORS.length];
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      const idx = Math.floor(rand(i * 11.3) * (n - 4)) + 2;
      const mesh = vehicleMesh(kind, color);
      this.group.add(mesh);
      this.cars.push({
        kind,
        mesh,
        i: idx,
        dir,
        speed: kind === 'bike' ? 22 : kind === 'bus' ? 16 : kind === 'truck' ? 18 : 20 + rand(i) * 8,
        target: 18,
        lateral: 0,
        color,
      });
    }
  }

  update(dt: number, world: GameWorld, px: number, pz: number, pSpeed: number) {
    const n = world.highway.length;
    for (let ci = 0; ci < this.cars.length; ci++) {
      const c = this.cars[ci];
      // Look ahead in own lane (LEFT of centreline for travel dir)
      let blocked = false;
      const look = 18 + c.speed;
      for (let s = 4; s < look; s += 5) {
        const j = c.i + c.dir * s * 0.35;
        const lp = world.lanePoint(Math.round(j), c.dir);
        const dPlayer = Math.hypot(lp.x - px, lp.z - pz);
        if (dPlayer < 10) {
          blocked = true;
          break;
        }
        for (const o of this.cars) {
          if (o === c || o.dir !== c.dir) continue;
          if (Math.abs(o.i - j) < 3 && Math.abs(o.lateral - c.lateral) < 1.2) {
            blocked = true;
            break;
          }
        }
        if (blocked) break;
      }
      if (blocked) {
        // LHT overtaking is on the RIGHT of the vehicle (towards road centre / offside)
        c.lateral += (2.1 - c.lateral) * dt * 1.4;
        c.target = Math.max(8, c.speed * 0.4);
      } else {
        c.lateral += (0 - c.lateral) * dt * 0.8;
        c.target = c.kind === 'bike' ? 24 : c.kind === 'bus' ? 17 : 21;
      }
      c.speed += (c.target - c.speed) * dt * 0.8;
      c.i += c.dir * (c.speed * dt) / 6.2;
      if (c.i > n - 2) c.i = 3;
      if (c.i < 2) c.i = n - 3;
      const p = world.lanePoint(Math.round(c.i), c.dir);
      // extra lateral: + means toward right of travel (overtake)
      const rx = p.tz;
      const rz = -p.tx;
      const x = p.x + rx * c.lateral;
      const z = p.z + rz * c.lateral;
      const y = terrainHeight(x, z);
      c.mesh.position.set(x, y, z);
      c.mesh.rotation.y = Math.atan2(p.tx, p.tz);
    }
  }

  nearest(px: number, pz: number) {
    let d = 1e9;
    for (const c of this.cars) {
      d = Math.min(d, Math.hypot(c.mesh.position.x - px, c.mesh.position.z - pz));
    }
    return d;
  }
}
