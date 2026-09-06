import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { HIGHWAY, fbm, rand, roadProximity, terrainHeight } from '../core/noise';
import { CITIES, WORLD } from '../core/config';

export interface POI {
  id: string;
  kind: 'garage' | 'fuel' | 'warehouse' | 'market' | 'weigh' | 'farm' | 'stop' | 'port';
  name: string;
  x: number;
  z: number;
  heading: number;
  radius: number;
}

export interface RoadPoint {
  x: number;
  z: number;
  y: number;
  tx: number;
  tz: number;
}

export class GameWorld {
  group = new THREE.Group();
  pois: POI[] = [];
  highway: RoadPoint[] = [];
  trees: THREE.InstancedMesh | null = null;
  sun!: THREE.DirectionalLight;
  hemi!: THREE.HemisphereLight;
  ambient!: THREE.AmbientLight;
  fog!: THREE.Fog;
  skyMat!: THREE.MeshBasicMaterial;
  ground!: THREE.Mesh;

  constructor(scene: THREE.Scene, phys: CANNON.World) {
    this.buildTerrain(scene, phys);
    this.buildHighway(scene);
    this.buildCities(scene, phys);
    this.buildVegetation(scene);
    this.buildLighting(scene);
    this.pois = [
      { id: 'mavuno-depot', kind: 'garage', name: 'Kifaru Depot — Mavuno', x: -910, z: -20, heading: 0.2, radius: 18 },
      { id: 'mavuno-silo', kind: 'warehouse', name: 'Mavuno Grain Co-op', x: -740, z: 40, heading: 0, radius: 16 },
      { id: 'jua-west', kind: 'fuel', name: 'Jua Fuel West', x: -430, z: 70, heading: 0.4, radius: 12 },
      { id: 'highland', kind: 'stop', name: 'Highland Truck Stop', x: 50, z: 400, heading: 0, radius: 16 },
      { id: 'weigh', kind: 'weigh', name: 'Rift Weighbridge', x: 200, z: 340, heading: 0, radius: 10 },
      { id: 'jua-east', kind: 'fuel', name: 'Jua Fuel East', x: 560, z: 70, heading: -0.3, radius: 12 },
      { id: 'kijani-market', kind: 'market', name: 'Kijani Fresh Market', x: 960, z: -20, heading: Math.PI, radius: 16 },
      { id: 'tea-farm', kind: 'farm', name: 'Kijani Highlands Tea', x: 780, z: 160, heading: 0, radius: 14 },
      { id: 'mavuno-port', kind: 'port', name: 'Mavuno Inland Depot', x: -860, z: -180, heading: 0, radius: 16 },
    ];
    this.placePOIVisuals(scene);
  }

  private buildTerrain(scene: THREE.Scene, phys: CANNON.World) {
    const seg = 96;
    const size = WORLD.size;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors: number[] = [];
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = terrainHeight(x, z);
      pos.setY(i, y);
      const rp = roadProximity(x, z);
      const n = fbm(x * 0.01, z * 0.01, 3, 2);
      if (rp < 9) col.setHex(0x2c2e32);
      else if (rp < 16) col.setRGB(0.38 + n * 0.05, 0.28, 0.16);
      else if (y > 12) col.setRGB(0.28 + n * 0.1, 0.42, 0.22);
      else col.setRGB(0.42 + n * 0.1, 0.32, 0.14);
      colors.push(col.r, col.g, col.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.receiveShadow = true;
    scene.add(this.ground);

    const ground = new CANNON.Body({ mass: 0 });
    ground.addShape(new CANNON.Plane());
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    phys.addBody(ground);
  }

  private buildHighway(scene: THREE.Scene) {
    const pts: THREE.Vector3[] = HIGHWAY.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.08, z));
    this.highway = [];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.12);
    const samples = 280;
    const lefts: THREE.Vector3[] = [];
    const rights: THREE.Vector3[] = [];
    const laneW = 3.6;
    const hw = laneW * 2 + 1.2;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const right = new THREE.Vector3(tan.z, 0, -tan.x).normalize();
      lefts.push(p.clone().addScaledVector(right, -hw / 2));
      rights.push(p.clone().addScaledVector(right, hw / 2));
      this.highway.push({ x: p.x, z: p.z, y: p.y, tx: tan.x, tz: tan.z });
    }
    const roadGeo = ribbon(lefts, rights);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.85 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.receiveShadow = true;
    scene.add(road);

    // Lane markings: dashed white on LEFT of each direction, yellow? Kenya often white.
    // LHT: vehicles keep left. Centre line dashed white, edge solid.
    const dashes = new THREE.Group();
    const dashM = new THREE.MeshStandardMaterial({ color: 0xefefef, roughness: 0.6 });
    const centerM = new THREE.MeshStandardMaterial({ color: 0xf2e36b, roughness: 0.5 });
    for (let i = 0; i < this.highway.length - 1; i += 1) {
      const a = this.highway[i];
      const b = this.highway[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const rx = dz / len;
      const rz = -dx / len;
      if (i % 2 === 0) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, Math.min(4.2, len * 0.9)), dashM);
        m.position.set(a.x, a.y + 0.04, a.z);
        m.lookAt(b.x, a.y + 0.04, b.z);
        dashes.add(m);
      }
      if (i % 3 === 0) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, Math.min(3.2, len),), centerM);
        c.position.set(a.x, a.y + 0.045, a.z);
        c.lookAt(b.x, a.y + 0.045, b.z);
        dashes.add(c);
      }
      void rx;
      void rz;
    }
    scene.add(dashes);

    // Keep-left chevrons near Mavuno on-ramp
    this.addSign(scene, -800, -70, 'KEEP LEFT  ·  RHD', 0x1d5c34);
  }

  private buildCities(scene: THREE.Scene, phys: CANNON.World) {
    this.buildCity(scene, phys, CITIES.mavuno.x, CITIES.mavuno.z, 7, 0xc49a3c, 'MAVUNO CITY');
    this.buildCity(scene, phys, CITIES.kijani.x, CITIES.kijani.z, 5, 0x3d6b3a, 'KIJANI');
    this.buildTown(scene, CITIES.highland.x, CITIES.highland.z, 'HIGHLAND JUNCTION');
    // Roundabout at Highland — clockwise circulation for LHT
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(10, 18, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.85, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(CITIES.highland.x, terrainHeight(CITIES.highland.x, CITIES.highland.z) + 0.12, CITIES.highland.z);
    scene.add(ring);
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 9, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x3e6a32 }),
    );
    island.position.set(CITIES.highland.x, terrainHeight(CITIES.highland.x, CITIES.highland.z) + 0.4, CITIES.highland.z);
    scene.add(island);
  }

  private buildCity(scene: THREE.Scene, phys: CANNON.World, cx: number, cz: number, n: number, accent: number, label: string) {
    const asphalt = new THREE.MeshStandardMaterial({ color: 0x303338, roughness: 0.9 });
    const y = terrainHeight(cx, cz) + 0.06;
    const pad = new THREE.Mesh(new THREE.BoxGeometry(360, 0.12, 360), asphalt);
    pad.position.set(cx, y, cz);
    pad.receiveShadow = true;
    scene.add(pad);
    // Street grid — drive on LEFT: markings offset
    const lineM = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    for (let i = -2; i <= 2; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(320, 0.04, 8.5), asphalt);
      s.position.set(cx, y + 0.08, cz + i * 70);
      scene.add(s);
      const v = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.04, 320), asphalt);
      v.position.set(cx + i * 70, y + 0.08, cz);
      scene.add(v);
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 300), lineM);
      mark.position.set(cx + i * 70 - 1.7, y + 0.12, cz); // left-lane hint
      scene.add(mark);
    }
    const wallMat = [
      new THREE.MeshStandardMaterial({ color: 0xd8cbb0, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.75 }),
      new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 }),
    ];
    for (let i = 0; i < n * 8; i++) {
      const bx = cx + (rand(i * 3.1 + cx) - 0.5) * 280;
      const bz = cz + (rand(i * 7.7 + cz) - 0.5) * 280;
      if (roadProximity(bx, bz) < 12) continue;
      const w = 8 + rand(i + 4) * 14;
      const d = 8 + rand(i + 9) * 14;
      const h = 4 + rand(i + 2) * 14;
      const m = wallMat[i % wallMat.length];
      const bld = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      const by = terrainHeight(bx, bz) + h / 2;
      bld.position.set(bx, by, bz);
      bld.castShadow = true;
      scene.add(bld);
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
      body.position.set(bx, by, bz);
      phys.addBody(body);
    }
    this.addSign(scene, cx, cz - 170, label, accent);
  }

  private buildTown(scene: THREE.Scene, cx: number, cz: number, label: string) {
    const y = terrainHeight(cx, cz);
    for (let i = 0; i < 12; i++) {
      const bx = cx + (rand(i + 40) - 0.5) * 80;
      const bz = cz + (rand(i + 90) - 0.5) * 80;
      const h = 3 + rand(i) * 4;
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(6, h, 8),
        new THREE.MeshStandardMaterial({ color: i % 2 ? 0xcbb896 : 0xa67c52 }),
      );
      b.position.set(bx, y + h / 2, bz);
      scene.add(b);
    }
    this.addSign(scene, cx, cz + 30, label, 0x6b1d2a);
  }

  private buildVegetation(scene: THREE.Scene) {
    const geo = new THREE.SphereGeometry(1, 6, 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2f5a28, roughness: 0.9 });
    const mesh = new THREE.InstancedMesh(geo, mat, 420);
    const dummy = new THREE.Object3D();
    const trunkG = new THREE.CylinderGeometry(0.18, 0.28, 2.2, 5);
    const trunkM = new THREE.MeshStandardMaterial({ color: 0x4a321c });
    const trunks = new THREE.InstancedMesh(trunkG, trunkM, 420);
    let k = 0;
    for (let i = 0; i < 900 && k < 420; i++) {
      const x = (rand(i * 1.7) - 0.5) * 3000;
      const z = (rand(i * 4.3) - 0.5) * 3000;
      if (roadProximity(x, z) < 16) continue;
      if (Math.abs(x) < 200 && Math.abs(z) < 200) continue;
      const y = terrainHeight(x, z);
      const s = 2 + rand(i + 3) * 4;
      dummy.position.set(x, y + 2.4 + s * 0.2, z);
      dummy.scale.set(s, s * 0.45, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
      dummy.position.set(x, y + 1.1, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      trunks.setMatrixAt(k, dummy.matrix);
      k++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    trunks.instanceMatrix.needsUpdate = true;
    scene.add(mesh, trunks);
    this.trees = mesh;

    // Maize fields near Mavuno
    const maize = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.12, 1.1, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xc2b24a }),
      600,
    );
    let m = 0;
    for (let i = 0; i < 600; i++) {
      const x = -640 + (i % 30) * 2.2 + rand(i) * 0.4;
      const z = 90 + Math.floor(i / 30) * 2.2;
      dummy.position.set(x, terrainHeight(x, z) + 0.55, z);
      dummy.scale.set(1, 0.8 + rand(i) * 0.5, 1);
      dummy.updateMatrix();
      maize.setMatrixAt(i, dummy.matrix);
      m++;
    }
    scene.add(maize);
  }

  private placePOIVisuals(scene: THREE.Scene) {
    for (const p of this.pois) {
      const y = terrainHeight(p.x, p.z);
      if (p.kind === 'fuel') {
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(14, 0.3, 10),
          new THREE.MeshStandardMaterial({ color: 0xe0a020, emissive: 0x332200, emissiveIntensity: 0.2 }),
        );
        canopy.position.set(p.x, y + 4.2, p.z);
        scene.add(canopy);
        for (const ox of [-3, 3]) {
          const pump = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.6, 0.6),
            new THREE.MeshStandardMaterial({ color: 0xcc2222 }),
          );
          pump.position.set(p.x + ox, y + 1.0, p.z);
          scene.add(pump);
        }
        this.addSign(scene, p.x, p.z + 8, 'JUA FUEL', 0xe0a020);
      }
      if (p.kind === 'garage') {
        const hall = new THREE.Mesh(
          new THREE.BoxGeometry(28, 8, 18),
          new THREE.MeshStandardMaterial({ color: 0x4a5060, metalness: 0.3, roughness: 0.6 }),
        );
        hall.position.set(p.x, y + 4, p.z - 16);
        scene.add(hall);
        this.addSign(scene, p.x, p.z + 10, 'KIFARU DEPOT', 0xc49a3c);
      }
      if (p.kind === 'warehouse' || p.kind === 'market' || p.kind === 'port') {
        const hall = new THREE.Mesh(
          new THREE.BoxGeometry(22, 7, 16),
          new THREE.MeshStandardMaterial({ color: 0xb8a078 }),
        );
        hall.position.set(p.x, y + 3.6, p.z - 12);
        scene.add(hall);
        const bay = new THREE.Mesh(
          new THREE.BoxGeometry(4, 0.06, 14),
          new THREE.MeshStandardMaterial({ color: 0xf2e36b }),
        );
        bay.position.set(p.x, y + 0.2, p.z + 6);
        scene.add(bay);
        this.addSign(scene, p.x, p.z + 14, p.name, 0x6b1d2a);
      }
      if (p.kind === 'weigh') {
        const plat = new THREE.Mesh(
          new THREE.BoxGeometry(4, 0.3, 18),
          new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 }),
        );
        plat.position.set(p.x, y + 0.2, p.z);
        scene.add(plat);
      }
    }
  }

  private addSign(scene: THREE.Scene, x: number, z: number, text: string, color: number) {
    const y = terrainHeight(x, z);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x333333 }),
    );
    pole.position.set(x, y + 1.6, z);
    scene.add(pole);
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#fff8e8';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 78);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 1.15),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }),
    );
    board.position.set(x, y + 3.4, z);
    scene.add(board);
  }

  private buildLighting(scene: THREE.Scene) {
    this.hemi = new THREE.HemisphereLight(0xffe6b0, 0x3a2a18, 0.7);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xfff0c8, 1.15);
    this.sun.position.set(120, 180, 80);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 400;
    this.sun.shadow.camera.left = -80;
    this.sun.shadow.camera.right = 80;
    this.sun.shadow.camera.top = 80;
    this.sun.shadow.camera.bottom = -80;
    scene.add(this.sun);
    scene.add(this.sun.target);
    this.fog = new THREE.Fog(0xc8b48a, WORLD.fogNear, WORLD.fogFar);
    scene.fog = this.fog;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1400, 16, 10),
      (this.skyMat = new THREE.MeshBasicMaterial({ color: 0x7eb6e0, side: THREE.BackSide })),
    );
    scene.add(sky);
  }

  setTime(hours: number, weather: string) {
    const t = ((hours % 24) + 24) % 24;
    const day = Math.max(0, Math.sin(((t - 6) / 12) * Math.PI));
    const dusk = Math.max(0, 1 - Math.abs(t - 18) / 2.5);
    const dawn = Math.max(0, 1 - Math.abs(t - 6.5) / 2);
    this.sun.intensity = 0.08 + day * 1.15;
    this.hemi.intensity = 0.18 + day * 0.55;
    const sunAng = ((t - 6) / 12) * Math.PI;
    this.sun.position.set(Math.cos(sunAng) * 180, Math.sin(sunAng) * 200 + 10, 90);
    let sky = new THREE.Color().setHSL(0.58, 0.45, 0.15 + day * 0.45);
    if (dusk || dawn) sky = new THREE.Color(0xe07a3a).lerp(sky, 1 - Math.max(dusk, dawn) * 0.7);
    if (weather === 'rain' || weather === 'storm' || weather === 'fog') sky.multiplyScalar(0.55);
    this.skyMat.color.copy(sky);
    this.fog.color.copy(sky);
    this.sun.color.set(dusk || dawn ? 0xffbb77 : 0xfff3d0);
    if (weather === 'fog') {
      this.fog.near = 40;
      this.fog.far = 160;
    } else if (weather === 'rain' || weather === 'storm') {
      this.fog.near = 80;
      this.fog.far = 340;
    } else {
      this.fog.near = WORLD.fogNear;
      this.fog.far = WORLD.fogFar;
    }
    return { night: day < 0.15, grip: weather === 'rain' || weather === 'storm' ? 0.72 : weather === 'fog' ? 0.9 : 1 };
  }

  nearestPOI(x: number, z: number, kind?: POI['kind']) {
    let best: POI | null = null;
    let bd = 1e9;
    for (const p of this.pois) {
      if (kind && p.kind !== kind) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return { poi: best, dist: bd };
  }

  /** Lane-center for LEFT-HAND traffic travelling along highway index direction. */
  lanePoint(i: number, direction: 1 | -1) {
    const a = this.highway[Math.max(0, Math.min(this.highway.length - 1, i))];
    const b = this.highway[Math.max(0, Math.min(this.highway.length - 1, i + direction))];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    // Right perpendicular of travel dir: (dz, -dx); LEFT is opposite.
    const lx = -dz / len;
    const lz = dx / len;
    const offset = 1.85; // left of centreline
    return { x: a.x + lx * offset, z: a.z + lz * offset, y: a.y, tx: dx / len, tz: dz / len };
  }
}

function ribbon(left: THREE.Vector3[], right: THREE.Vector3[]) {
  const geo = new THREE.BufferGeometry();
  const verts: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < left.length; i++) {
    verts.push(left[i].x, left[i].y, left[i].z, right[i].x, right[i].y, right[i].z);
    nrm.push(0, 1, 0, 0, 1, 0);
    if (i < left.length - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  return geo;
}
