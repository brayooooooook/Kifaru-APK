import * as THREE from 'three';
import { COLORS, TRUCK } from '../core/config';

function mat(color: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.18, ...extra });
}

function chrome(color = COLORS.chrome) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.18, metalness: 0.92 });
}

function box(g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

export interface TruckParts {
  group: THREE.Group;
  wheelMeshes: THREE.Group[];
  steerWheel: THREE.Group;
  needles: { speed: THREE.Mesh; rpm: THREE.Mesh };
  dashLight: THREE.MeshStandardMaterial;
  headlights: THREE.SpotLight[];
  headMats: THREE.MeshStandardMaterial[];
  indicators: { l: THREE.MeshStandardMaterial; r: THREE.MeshStandardMaterial };
  gaugeTex: THREE.CanvasTexture;
  gaugeCtx: CanvasRenderingContext2D;
  mirrors: { left: THREE.Object3D; right: THREE.Object3D };
  cabinAnchor: THREE.Object3D;
  passengerAnchor: THREE.Object3D;
  hoodAnchor: THREE.Object3D;
}

export function buildKifaruTembo(paint = COLORS.gold): TruckParts {
  const g = new THREE.Group();
  g.name = 'KifaruTembo680';

  const paintM = mat(paint, { roughness: 0.35, metalness: 0.28 });
  const maroon = mat(COLORS.maroon, { roughness: 0.38, metalness: 0.22 });
  const black = mat(0x111111, { roughness: 0.7, metalness: 0.2 });
  const rubber = mat(0x1a1a1a, { roughness: 0.9, metalness: 0.05 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x87a0b4,
    roughness: 0.05,
    metalness: 0.3,
    transparent: true,
    opacity: 0.38,
  });
  const interior = mat(COLORS.cabInterior, { roughness: 0.85, metalness: 0.05 });
  const ch = chrome();
  const steel = mat(0x55585e, { metalness: 0.7, roughness: 0.35 });

  // Frame rails — long conventional chassis
  box(g, 0.18, 0.22, 8.2, 0.85, 0.72, 0.1, steel);
  box(g, 0.18, 0.22, 8.2, -0.85, 0.72, 0.1, steel);

  // Bumper & airdam
  box(g, 2.55, 0.38, 0.32, 0, 0.62, 4.42, ch);
  box(g, 2.4, 0.16, 0.2, 0, 0.38, 4.36, black);

  // Long bonnet / engine compartment (engine IN FRONT of cab)
  box(g, 2.05, 1.05, 2.55, 0, 1.35, 3.05, paintM);
  box(g, 2.12, 0.08, 2.6, 0, 1.9, 3.05, maroon);
  // Hood taper / fenders
  box(g, 2.5, 0.55, 1.7, 0, 1.05, 3.55, paintM);
  box(g, 0.55, 0.7, 1.8, 1.15, 1.05, 3.4, maroon);
  box(g, 0.55, 0.7, 1.8, -1.15, 1.05, 3.4, maroon);

  // Unique stacked 3-piece grille + rhino badge (original, not a copy)
  box(g, 1.55, 1.15, 0.12, 0, 1.28, 4.28, ch);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.95, 0.06), black);
  grille.position.set(0, 1.28, 4.35);
  g.add(grille);
  for (let i = 0; i < 7; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.05, 0.04), ch);
    bar.position.set(0, 0.88 + i * 0.13, 4.38);
    g.add(bar);
  }
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), maroon);
  badge.position.set(0, 1.55, 4.4);
  g.add(badge);

  // Headlights
  const headMats: THREE.MeshStandardMaterial[] = [];
  const headlights: THREE.SpotLight[] = [];
  for (const x of [-0.82, 0.82]) {
    const hm = new THREE.MeshStandardMaterial({
      color: 0xfff4d2,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    headMats.push(hm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.08), hm);
    lamp.position.set(x, 0.95, 4.4);
    g.add(lamp);
    const spot = new THREE.SpotLight(0xffe8b0, 0, 55, Math.PI / 7, 0.4, 1);
    spot.position.set(x, 1.0, 4.5);
    spot.target.position.set(x, 0.4, 18);
    g.add(spot);
    g.add(spot.target);
    headlights.push(spot);
    box(g, 0.16, 0.1, 0.08, x, 0.72, 4.4, mat(0xffaa33, { emissive: 0x331100 }));
  }

  const indL = new THREE.MeshStandardMaterial({ color: 0xff9100, emissive: 0x000000 });
  const indR = new THREE.MeshStandardMaterial({ color: 0xff9100, emissive: 0x000000 });
  const il = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.08), indL);
  il.position.set(-1.18, 0.95, 4.32);
  const ir = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.08), indR);
  ir.position.set(1.18, 0.95, 4.32);
  g.add(il, ir);

  // Cab sits BEHIND the engine, conventional
  box(g, 2.5, 1.55, 2.15, 0, 2.15, 0.55, paintM);
  box(g, 2.52, 0.12, 2.18, 0, 2.95, 0.55, maroon);
  // Sleeper
  box(g, 2.5, 1.7, 1.55, 0, 2.25, -1.15, paintM);
  box(g, 2.2, 0.35, 1.4, 0, 3.15, -1.15, maroon);
  // Roof fairing
  box(g, 2.3, 0.35, 2.4, 0, 3.35, -0.2, paintM);

  // Windscreen — split, sitting behind hood
  const ws = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.85, 0.06), glass);
  ws.position.set(0, 2.35, 1.62);
  ws.rotation.x = -0.12;
  g.add(ws);
  box(g, 0.06, 0.85, 0.08, 0, 2.35, 1.64, black);

  // Doors (RHD: driver door is +X)
  box(g, 0.08, 1.2, 1.3, 1.28, 1.95, 0.5, paintM);
  box(g, 0.08, 1.2, 1.3, -1.28, 1.95, 0.5, paintM);
  box(g, 0.04, 0.45, 0.7, 1.33, 2.25, 0.55, glass);
  box(g, 0.04, 0.45, 0.7, -1.33, 2.25, 0.55, glass);

  // Exhaust stacks
  for (const x of [-1.15, 1.15]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 2.4, 8), ch);
    stack.position.set(x, 2.5, -0.55);
    g.add(stack);
  }

  // Fuel tanks
  for (const x of [-1.15, 1.15]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.5, 10), ch);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(x, 0.85, -0.15);
    g.add(tank);
  }

  // Fifth wheel
  const fifth = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 12), steel);
  fifth.position.set(0, 1.05, TRUCK.fifthWheelZ);
  g.add(fifth);

  // Steps under RIGHT (driver) door
  box(g, 0.45, 0.08, 0.7, 1.2, 0.55, 0.7, steel);
  box(g, 0.45, 0.08, 0.7, 1.2, 0.78, 0.7, steel);

  // Interior
  const cabin = new THREE.Group();
  cabin.position.set(0, 0, 0);
  g.add(cabin);
  box(cabin, 2.2, 0.08, 2.0, 0, 1.55, 0.5, interior);
  // Seats — driver RIGHT
  const seatM = mat(0x2a1c14, { roughness: 0.9 });
  box(cabin, 0.52, 0.45, 0.5, TRUCK.driverSeat.x, 1.72, TRUCK.driverSeat.z - 0.15, seatM);
  box(cabin, 0.52, 0.7, 0.12, TRUCK.driverSeat.x, 2.15, TRUCK.driverSeat.z - 0.38, seatM);
  box(cabin, 0.52, 0.45, 0.5, TRUCK.passengerSeat.x, 1.72, TRUCK.passengerSeat.z - 0.15, seatM);
  box(cabin, 0.52, 0.7, 0.12, TRUCK.passengerSeat.x, 2.15, TRUCK.passengerSeat.z - 0.38, seatM);

  // Dash wrapping the RIGHT cluster
  const dashM = mat(0x1a1614, { roughness: 0.7 });
  box(cabin, 2.15, 0.35, 0.45, 0, 1.95, 1.28, dashM);
  const dashLight = mat(0x0b1a12, { emissive: 0x16301c, emissiveIntensity: 0.2 });
  box(cabin, 0.72, 0.22, 0.08, TRUCK.driverSeat.x, 2.05, 1.12, dashLight);

  // Gauge canvas
  const gcanvas = document.createElement('canvas');
  gcanvas.width = 256;
  gcanvas.height = 128;
  const gctx = gcanvas.getContext('2d')!;
  const gaugeTex = new THREE.CanvasTexture(gcanvas);
  const gaugeMat = new THREE.MeshBasicMaterial({ map: gaugeTex });
  const gaugeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.32), gaugeMat);
  gaugeMesh.position.set(TRUCK.driverSeat.x, 2.08, 1.08);
  cabin.add(gaugeMesh);
  const speedNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.01), mat(0xffcc33));
  speedNeedle.position.set(TRUCK.driverSeat.x - 0.16, 2.05, 1.07);
  cabin.add(speedNeedle);
  const rpmNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.01), mat(0xff6644));
  rpmNeedle.position.set(TRUCK.driverSeat.x + 0.16, 2.05, 1.07);
  cabin.add(rpmNeedle);

  // Steering wheel — RIGHT
  const steerWheel = new THREE.Group();
  steerWheel.position.set(TRUCK.driverSeat.x, 2.12, 0.95);
  steerWheel.rotation.x = -1.15;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 18), mat(0x111111, { roughness: 0.6 }));
  steerWheel.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8), ch);
  hub.rotation.x = Math.PI / 2;
  steerWheel.add(hub);
  cabin.add(steerWheel);

  // Gear selector to the LEFT of the driver (center console) — RHD layout
  box(cabin, 0.18, 0.08, 0.4, 0.15, 1.62, 0.55, black);
  box(cabin, 0.05, 0.22, 0.05, 0.15, 1.75, 0.45, ch);

  // GPS in dash
  const gps = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x0a2a18 }),
  );
  gps.position.set(0.1, 2.02, 1.08);
  cabin.add(gps);

  // Pedals under right footwell
  box(cabin, 0.12, 0.04, 0.18, TRUCK.driverSeat.x, 1.52, 0.95, black);
  box(cabin, 0.12, 0.04, 0.18, TRUCK.driverSeat.x - 0.18, 1.52, 0.95, black);

  // West-coast mirrors
  const mkMirror = (x: number) => {
    const m = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), ch);
    arm.position.set(x * 0.2, 0, -0.1);
    m.add(arm);
    const glassM = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.42, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x89a, metalness: 0.8, roughness: 0.1 }),
    );
    glassM.position.set(x * 0.05, 0, 0.18);
    m.add(glassM);
    m.position.set(x * 1.45, 2.15, 1.35);
    g.add(m);
    return m;
  };
  const mirrors = { left: mkMirror(-1), right: mkMirror(1) };

  // Wheels
  const wheelMeshes: THREE.Group[] = [];
  const addWheel = (x: number, z: number, dual = false) => {
    const grp = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(TRUCK.wheelRadius, TRUCK.wheelRadius, TRUCK.wheelWidth, 16), rubber);
    tyre.rotation.z = Math.PI / 2;
    tyre.castShadow = true;
    grp.add(tyre);
    const hubm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 12), ch);
    hubm.rotation.z = Math.PI / 2;
    grp.add(hubm);
    if (dual) {
      const tyre2 = new THREE.Mesh(new THREE.CylinderGeometry(TRUCK.wheelRadius, TRUCK.wheelRadius, TRUCK.wheelWidth, 16), rubber);
      tyre2.rotation.z = Math.PI / 2;
      tyre2.position.x = x > 0 ? 0.32 : -0.32;
      grp.add(tyre2);
    }
    grp.position.set(x, TRUCK.wheelRadius, z);
    g.add(grp);
    wheelMeshes.push(grp);
  };
  addWheel(-1.05, TRUCK.frontAxleZ, false);
  addWheel(1.05, TRUCK.frontAxleZ, false);
  for (const z of TRUCK.driveAxleZ) {
    addWheel(-1.05, z, true);
    addWheel(1.05, z, true);
  }

  const cabinAnchor = new THREE.Object3D();
  cabinAnchor.position.set(TRUCK.driverSeat.x, TRUCK.driverSeat.y, TRUCK.driverSeat.z);
  g.add(cabinAnchor);
  const passengerAnchor = new THREE.Object3D();
  passengerAnchor.position.set(TRUCK.passengerSeat.x, TRUCK.passengerSeat.y, TRUCK.passengerSeat.z);
  g.add(passengerAnchor);
  const hoodAnchor = new THREE.Object3D();
  hoodAnchor.position.set(0, 1.7, 4.6);
  g.add(hoodAnchor);

  return {
    group: g,
    wheelMeshes,
    steerWheel,
    needles: { speed: speedNeedle, rpm: rpmNeedle },
    dashLight,
    headlights,
    headMats,
    indicators: { l: indL, r: indR },
    gaugeTex,
    gaugeCtx: gctx,
    mirrors,
    cabinAnchor,
    passengerAnchor,
    hoodAnchor,
  };
}

export function drawGauges(ctx: CanvasRenderingContext2D, tex: THREE.CanvasTexture, kph: number, rpm: number, fuel: number, gear: string, night: boolean) {
  ctx.fillStyle = night ? '#07140c' : '#10160f';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = night ? '#3dff9a' : '#c4e8c0';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.font = '11px monospace';
  ctx.fillText('KIFARU TEMBO 680  RHD', 8, 14);
  ctx.font = '22px monospace';
  ctx.fillText(`${Math.round(kph).toString().padStart(3, '0')}`, 18, 48);
  ctx.font = '10px monospace';
  ctx.fillText('km/h', 78, 48);
  ctx.fillText(`RPM ${Math.round(rpm)}`, 130, 36);
  ctx.fillRect(130, 44, Math.min(110, (rpm / 2100) * 110), 8);
  ctx.fillText(`FUEL ${Math.round(fuel)} L`, 18, 78);
  ctx.fillRect(18, 86, Math.min(110, (fuel / 680) * 110), 6);
  ctx.font = '16px monospace';
  ctx.fillText(`GEAR ${gear}`, 150, 92);
  ctx.font = '9px monospace';
  ctx.fillText('LEFT TRAFFIC  ·  KEEP LEFT', 18, 116);
  tex.needsUpdate = true;
}
