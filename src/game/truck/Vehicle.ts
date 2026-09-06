import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { TRAILER, TRUCK } from '../core/config';
import {
  autoShift,
  brakingForceN,
  driveForceN,
  engineRpmFromWheels,
  fuelLitresPerSecond,
  impactDamage,
  maxSteerForSpeed,
} from './drivetrain';
import { buildKifaruTembo, drawGauges, type TruckParts } from './TruckVisual';
import { buildBoxTrailer } from './TrailerVisual';


export class PlayerRig {
  truckBody: CANNON.Body;
  trailerBody: CANNON.Body;
  truckVehicle: CANNON.RaycastVehicle;
  trailerVehicle: CANNON.RaycastVehicle;
  hitch: CANNON.HingeConstraint;
  parts: TruckParts;
  trailerVis: { group: THREE.Group; wheels: THREE.Group[] };
  engineOn = false;
  rpm = TRUCK.idleRpm;
  gear = 0;
  auto = true;
  throttle = 0;
  brake = 0;
  steer = 0;
  steerTarget = 0;
  fuel = 420;
  coupled = true;
  cargoKg = 14000;
  cargoFragility = 0.4;
  cargoDamage = 0;
  indicators = { l: false, r: false, h: false, blink: 0 };
  lights = false;
  wipers = false;
  handbrake = false;
  retarder = 0;
  odometer = 0;
  damage = { engine: 0, tyres: 0, body: 0, suspension: 0, trailer: 0 };
  lastVel = new CANNON.Vec3();
  airBrake = 0;

  constructor(world: CANNON.World, scene: THREE.Scene, x: number, z: number) {
    this.truckBody = new CANNON.Body({ mass: TRUCK.mass, angularDamping: 0.4, linearDamping: 0.08 });
    this.truckBody.addShape(new CANNON.Box(new CANNON.Vec3(1.15, 0.7, 3.9)));
    this.truckBody.position.set(x, 1.35, z);
    // Face along the Mavuno→Kijani highway (east-south-east), sitting in the LEFT lane.
    this.truckBody.quaternion.setFromEuler(0, 0.35, 0);

    this.truckVehicle = new CANNON.RaycastVehicle({
      chassisBody: this.truckBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });
    const susp = {
      radius: TRUCK.wheelRadius,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 42,
      suspensionRestLength: 0.38,
      frictionSlip: 1.55,
      dampingRelaxation: 2.8,
      dampingCompression: 4.2,
      maxSuspensionForce: 140000,
      rollInfluence: 0.22,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      maxSuspensionTravel: 0.28,
      customSlidingRotationalSpeed: -22,
      useCustomSlidingRotationalSpeed: true,
      chassisConnectionPointLocal: new CANNON.Vec3(),
    };
    const addTWheel = (x: number, z: number, force = 0) => {
      const o = { ...susp, chassisConnectionPointLocal: new CANNON.Vec3(x, -0.15, z) };
      this.truckVehicle.addWheel(o);
    };
    addTWheel(-1.05, TRUCK.frontAxleZ);
    addTWheel(1.05, TRUCK.frontAxleZ);
    addTWheel(-1.05, TRUCK.driveAxleZ[0]);
    addTWheel(1.05, TRUCK.driveAxleZ[0]);
    addTWheel(-1.05, TRUCK.driveAxleZ[1]);
    addTWheel(1.05, TRUCK.driveAxleZ[1]);
    this.truckVehicle.addToWorld(world);

    const trailerMass = TRAILER.massEmpty + this.cargoKg;
    this.trailerBody = new CANNON.Body({ mass: trailerMass, angularDamping: 0.5, linearDamping: 0.1 });
    this.trailerBody.addShape(new CANNON.Box(new CANNON.Vec3(1.2, 1.2, TRAILER.length * 0.48)));
    this.trailerBody.position.set(x - 2.6, 1.55, z - 7.5);
    this.trailerBody.quaternion.setFromEuler(0, 0.35, 0);

    this.trailerVehicle = new CANNON.RaycastVehicle({
      chassisBody: this.trailerBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });
    for (const az of TRAILER.axlesZ) {
      for (const ax of [-1.05, 1.05]) {
        this.trailerVehicle.addWheel({
          ...susp,
          radius: 0.5,
          suspensionStiffness: 36,
          chassisConnectionPointLocal: new CANNON.Vec3(ax, -0.4, az),
        });
      }
    }
    this.trailerVehicle.addToWorld(world);

    this.hitch = new CANNON.HingeConstraint(this.truckBody, this.trailerBody, {
      pivotA: new CANNON.Vec3(0, 0.35, TRUCK.fifthWheelZ),
      pivotB: new CANNON.Vec3(0, -0.15, TRAILER.kingpinZ),
      axisA: new CANNON.Vec3(0, 1, 0),
      axisB: new CANNON.Vec3(0, 1, 0),
    });
    world.addConstraint(this.hitch);

    this.parts = buildKifaruTembo();
    scene.add(this.parts.group);
    this.trailerVis = buildBoxTrailer();
    scene.add(this.trailerVis.group);

    this.truckBody.addEventListener('collide', (e: { contact: CANNON.ContactEquation }) => {
      const v = this.truckBody.velocity.length();
      const dv = Math.abs(v - this.lastVel.length());
      const dmg = impactDamage(dv);
      if (dmg > 0) {
        this.damage.body = Math.min(100, this.damage.body + dmg);
        this.cargoDamage = Math.min(100, this.cargoDamage + dmg * this.cargoFragility);
        if (dv > 6) this.damage.engine = Math.min(100, this.damage.engine + dmg * 0.3);
      }
    });
  }

  setLoaded(loaded: boolean) {
    this.cargoKg = loaded ? 14000 : 0;
    this.trailerBody.mass = TRAILER.massEmpty + this.cargoKg;
    this.trailerBody.updateMassProperties();
  }

  update(dt: number, inputSteer: number, throttle: number, brake: number, buttons: Record<string, boolean>) {
    if (buttons.engineToggle) this.engineOn = !this.engineOn;
    if (buttons.lights) this.lights = !this.lights;
    if (buttons.leftInd) {
      this.indicators.l = !this.indicators.l;
      this.indicators.r = false;
    }
    if (buttons.rightInd) {
      this.indicators.r = !this.indicators.r;
      this.indicators.l = false;
    }
    if (buttons.hazards) {
      this.indicators.h = !this.indicators.h;
      this.indicators.l = this.indicators.r = this.indicators.h;
    }
    if (buttons.wipers) this.wipers = !this.wipers;
    this.handbrake = !!buttons.handbrake;
    if (buttons.gearUp && !this.auto) this.gear = Math.min(12, this.gear + 1);
    if (buttons.gearDown && !this.auto) this.gear = Math.max(-1, this.gear - 1);

    const forward = new CANNON.Vec3();
    this.truckBody.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1), forward);
    const speed = this.truckBody.velocity.dot(forward);
    const speedMs = this.truckBody.velocity.length();
    const load = this.cargoKg / 18000;

    this.steerTarget = inputSteer * maxSteerForSpeed(speedMs);
    this.steer += (this.steerTarget - this.steer) * Math.min(1, dt * 3.2);
    this.throttle = throttle;
    this.airBrake += ((brake > 0.05 ? brake : 0) - this.airBrake) * Math.min(1, dt * 6); // air delay
    this.brake = this.airBrake;

    const wheelSpin = speedMs / TRUCK.wheelRadius;
    this.rpm = this.engineOn
      ? engineRpmFromWheels(wheelSpin, Math.max(1, this.gear) || 1, this.gear === 0 ? 0 : 1)
      : 0;
    if (this.engineOn && this.gear === 0) this.rpm = TRUCK.idleRpm + throttle * 400;
    if (this.engineOn && this.rpm < TRUCK.stallRpm && this.gear !== 0 && throttle < 0.05 && speedMs < 1) {
      this.engineOn = false;
      this.rpm = 0;
    }

    if (this.auto && this.engineOn) {
      this.gear = autoShift(this.gear, this.rpm, throttle, speedMs, load);
    }

    const engDmg = 1 - this.damage.engine / 180;
    const force = this.engineOn ? driveForceN(this.rpm, throttle, this.gear, 1) * engDmg : 0;
    const brakeN = brakingForceN(this.brake, TRUCK.mass + TRAILER.massEmpty + this.cargoKg, throttle < 0.02 && this.engineOn && this.gear > 2 ? 0.5 : 0, this.rpm);
    const hb = this.handbrake ? 18000 : 0;

    // Steer front axle (wheels 0,1)
    this.truckVehicle.setSteeringValue(this.steer, 0);
    this.truckVehicle.setSteeringValue(this.steer, 1);

    // Drive rear 4
    const per = force / 4;
    for (let i = 2; i < 6; i++) this.truckVehicle.applyEngineForce(per, i);
    const bFront = (brakeN + hb) * 0.18;
    const bRear = (brakeN + hb) * 0.16;
    this.truckVehicle.setBrake(bFront, 0);
    this.truckVehicle.setBrake(bFront, 1);
    for (let i = 2; i < 6; i++) this.truckVehicle.setBrake(bRear, i);
    const tBrake = brakeN * 0.12 + hb * 0.2;
    for (let i = 0; i < this.trailerVehicle.wheelInfos.length; i++) this.trailerVehicle.setBrake(tBrake, i);

    this.fuel = Math.max(0, this.fuel - fuelLitresPerSecond(this.rpm, throttle, load, this.engineOn) * dt);
    if (this.fuel <= 0) this.engineOn = false;

    this.odometer += Math.abs(speedMs) * dt / 1000;
    this.lastVel.copy(this.truckBody.velocity);

    this.indicators.blink += dt;
    const on = this.indicators.blink % 0.8 < 0.4;
    const le = (this.indicators.l || this.indicators.h) && on;
    const re = (this.indicators.r || this.indicators.h) && on;
    this.parts.indicators.l.emissive.setHex(le ? 0xff9100 : 0x000000);
    this.parts.indicators.r.emissive.setHex(re ? 0xff9100 : 0x000000);

    const nightBoost = this.lights ? 1.8 : 0;
    for (const s of this.parts.headlights) s.intensity = nightBoost * 2.4;
    for (const m of this.parts.headMats) {
      m.emissive.setHex(this.lights ? 0xfff0c8 : 0x000000);
      m.emissiveIntensity = this.lights ? 2 : 0;
    }

    this.parts.steerWheel.rotation.z = -this.steer * 8;
    this.syncMeshes();
    const kph = Math.abs(speed) * 3.6;
    const gearStr = this.gear < 0 ? 'R' : this.gear === 0 ? 'N' : String(this.gear);
    drawGauges(this.parts.gaugeCtx, this.parts.gaugeTex, kph, this.rpm, this.fuel, gearStr, this.lights);
    this.parts.needles.speed.rotation.z = -((kph / 120) * 2.4 - 1.2);
    this.parts.needles.rpm.rotation.z = -((this.rpm / 2100) * 2.4 - 1.2);

    return { speedMs, speedKph: kph, gearStr, forward };
  }

  syncMeshes() {
    this.parts.group.position.copy(this.truckBody.position as unknown as THREE.Vector3);
    this.parts.group.quaternion.copy(this.truckBody.quaternion as unknown as THREE.Quaternion);
    this.trailerVis.group.position.copy(this.trailerBody.position as unknown as THREE.Vector3);
    this.trailerVis.group.quaternion.copy(this.trailerBody.quaternion as unknown as THREE.Quaternion);
    const quat = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    for (let i = 0; i < this.truckVehicle.wheelInfos.length; i++) {
      this.truckVehicle.updateWheelTransform(i);
      const t = this.truckVehicle.wheelInfos[i].worldTransform;
      pos.set(t.position.x, t.position.y, t.position.z);
      quat.set(t.quaternion.x, t.quaternion.y, t.quaternion.z, t.quaternion.w);
      const m = this.parts.wheelMeshes[i];
      if (m) {
        m.position.copy(pos);
        m.quaternion.copy(quat);
        this.parts.group.worldToLocal(m.position);
        const inv = this.parts.group.quaternion.clone().invert();
        m.quaternion.copy(inv.multiply(quat));
      }
    }
  }

  worldPos() {
    return this.truckBody.position;
  }

  heading() {
    const f = new CANNON.Vec3();
    this.truckBody.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1), f);
    return Math.atan2(f.x, f.z);
  }
}
