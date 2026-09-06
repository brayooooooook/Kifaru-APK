import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PlayerRig } from './truck/Vehicle';
import { GameWorld } from './world/World';
import { Traffic } from './traffic/Traffic';
import { Input } from './input/Input';
import { AudioEngine } from './audio/AudioEngine';
import { UI } from './ui/UI';
import { generateJobs, settleDelivery, fuelCost, type Job } from './career/Jobs';
import { loadSave, persistSave, loadSettings, persistSettings, hireDriver, newSave, type SaveData, type Settings } from './save/SaveGame';
import { terrainHeight } from './core/noise';

type Mode = 'menu' | 'drive' | 'pause' | 'garage' | 'settings';
type Cam = 'cabin' | 'chase' | 'hood' | 'trailer' | 'passenger';
const CAMS: Cam[] = ['cabin', 'chase', 'hood', 'trailer', 'passenger'];

export class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, 1, 0.12, 900);
  phys = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world!: GameWorld;
  player!: PlayerRig;
  traffic!: Traffic;
  input = new Input();
  audio = new AudioEngine();
  ui: UI;
  save: SaveData;
  settings: Settings;
  mode: Mode = 'menu';
  cam: Cam = 'chase';
  clock = new THREE.Clock();
  acc = 0;
  job: Job | null = null;
  jobStage: 'idle' | 'toPickup' | 'hauling' | 'parking' = 'idle';
  jobs: Job[] = [];
  timeH = 8.2;
  weather = 'sunny';
  gpsOn = true;
  rain: THREE.Points | null = null;
  mirrorL?: THREE.WebGLRenderTarget;
  mirrorR?: THREE.WebGLRenderTarget;
  mCamL = new THREE.PerspectiveCamera(50, 1, 0.2, 80);
  mCamR = new THREE.PerspectiveCamera(50, 1, 0.2, 80);
  parkingTarget = new THREE.Vector3();
  parkingHeading = 0;
  startedAt = 0;
  toast?: string;
  playMode: 'career' | 'quick' | 'free' | 'park' = 'career';

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.phys.broadphase = new CANNON.SAPBroadphase(this.phys);
    this.phys.allowSleep = true;
    this.phys.defaultContactMaterial.friction = 0.45;
    this.phys.defaultContactMaterial.restitution = 0.02;

    this.save = loadSave();
    this.settings = loadSettings();
    this.timeH = this.save.timeOfDay;
    this.weather = this.save.weather;
    this.ui = new UI(uiRoot);
    this.bindUI();
    this.input.attach(canvas, this.settings);
    this.applyQuality();

    this.world = new GameWorld(this.scene, this.phys);
    this.player = new PlayerRig(this.phys, this.scene, -900, -8);
    this.player.fuel = this.save.trucks[0]?.fuel ?? 420;
    this.traffic = new Traffic(this.scene, this.world, this.settings.quality === 'low' ? 10 : 18);
    this.jobs = generateJobs(this.world.pois);
    this.buildRain();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.ui.showMenu(this.save, true);
    this.loop();
  }

  private bindUI() {
    this.ui.onContinue = () => this.enterDrive('career');
    this.ui.onStartCareer = () => {
      this.mode = 'garage';
      this.jobs = generateJobs(this.world.pois);
      this.ui.showGarage(this.save, this.jobs);
    };
    this.ui.onQuickJob = () => {
      this.jobs = generateJobs(this.world.pois, 1);
      this.job = this.jobs[0];
      this.jobStage = 'toPickup';
      this.enterDrive('quick');
    };
    this.ui.onFreeDrive = () => {
      this.job = null;
      this.jobStage = 'idle';
      this.enterDrive('free');
    };
    this.ui.onParking = () => {
      this.playMode = 'park';
      this.enterDrive('park');
      const p = this.world.pois.find((x) => x.id === 'kijani-market')!;
      this.parkingTarget.set(p.x, 0, p.z + 6);
      this.toast = 'Reverse into the yellow bay. Keep left on the way.';
    };
    this.ui.onAcceptJob = (job) => {
      this.job = job;
      this.jobStage = 'toPickup';
      this.enterDrive('career');
      this.toast = `Collect ${job.cargo} at ${job.fromName}`;
    };
    this.ui.onHire = () => {
      hireDriver(this.save);
      persistSave(this.save);
      this.ui.showGarage(this.save, this.jobs);
    };
    this.ui.onRepair = () => {
      const cost = Math.round(
        (this.player.damage.body + this.player.damage.engine + this.player.damage.tyres) * 85,
      );
      if (this.save.money >= cost) {
        this.save.money -= cost;
        this.player.damage = { engine: 0, tyres: 0, body: 0, suspension: 0, trailer: 0 };
        persistSave(this.save);
        this.toast = cost ? `Repaired for KES ${cost}` : 'Already in good shape';
      }
      this.ui.showGarage(this.save, this.jobs);
    };
    this.ui.onSettings = (partial) => {
      if (Object.keys(partial).length === 0 && this.mode !== 'drive') {
        this.mode = 'settings';
        this.ui.showSettings(this.settings);
        return;
      }
      Object.assign(this.settings, partial);
      persistSettings(this.settings);
      this.input.setScheme(this.settings.scheme);
      this.input.sensitivity = this.settings.steerSensitivity;
      this.audio.setMaster(this.settings.volume);
      this.applyQuality();
    };
    this.ui.onPauseResume = () => {
      this.mode = 'drive';
      this.ui.togglePause(false);
    };
    this.ui.onSaveExit = () => this.toMenu(true);
    this.ui.onRefuel = () => this.tryRefuel();
  }

  private enterDrive(play: typeof this.playMode) {
    this.playMode = play;
    this.mode = 'drive';
    this.ui.root.innerHTML = this.ui.hudHtml();
    this.ui.bindHud(this.input);
    this.audio.unlock();
    this.startedAt = performance.now();
    if (play === 'park') this.jobStage = 'parking';
  }

  private toMenu(save: boolean) {
    if (save) this.writeSave();
    this.mode = 'menu';
    this.ui.showMenu(this.save, true);
  }

  private writeSave() {
    this.save.timeOfDay = this.timeH;
    this.save.weather = this.weather;
    if (this.save.trucks[0]) {
      this.save.trucks[0].fuel = this.player.fuel;
        this.save.trucks[0].damage = {
          engine: this.player.damage.engine,
          tyres: this.player.damage.tyres,
          body: this.player.damage.body,
          suspension: this.player.damage.suspension,
        };
      this.save.trucks[0].odometer += this.player.odometer;
    }
    persistSave(this.save);
  }

  private applyQuality() {
    const q = this.settings.quality;
    const pr = q === 'low' ? 1 : q === 'mid' ? Math.min(devicePixelRatio, 1.35) : Math.min(devicePixelRatio, 1.75);
    this.renderer.setPixelRatio(pr);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.camera.fov = q === 'low' ? 58 : 62;
    this.camera.updateProjectionMatrix();
  }

  private buildRain() {
    const g = new THREE.BufferGeometry();
    const n = 900;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = Math.random() * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.rain = new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: 0xaaccff, size: 0.08, transparent: true, opacity: 0.5 }),
    );
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  private resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.mode === 'drive') this.updateDrive(dt);
    else this.updateIdle(dt);
    this.render();
  };

  private updateIdle(dt: number) {
    this.timeH += dt / 3600 * 24 * 4;
    this.world.setTime(this.timeH, this.weather);
    this.updateCamera(dt);
    this.phys.step(1 / 60, dt, 3);
    this.player.syncMeshes();
  }

  private updateDrive(dt: number) {
    this.input.sample();
    const btns = this.input.consumeButtons();
    if (btns.pause) {
      this.mode = 'pause';
      this.ui.togglePause(true);
      this.writeSave();
      return;
    }
    if (btns.camera) this.cam = CAMS[(CAMS.indexOf(this.cam) + 1) % CAMS.length];
    if (btns.gps) this.gpsOn = !this.gpsOn;
    if (btns.horn) this.audio.horn();
    if (btns.engineToggle) this.audio.beep(220, 0.1);

    this.timeH += dt * (this.settings.timeScale / 3600) * 24;
    const env = this.world.setTime(this.timeH, this.weather);
    if (!this.player.lights && env.night) {
      /* headlights optional */
    }
    this.phys.defaultContactMaterial.friction = 0.45 * env.grip;

    const st = this.player.update(dt, this.input.steer, this.input.throttle, this.input.brake, btns);
    this.phys.step(1 / 60, dt, 3);
    this.player.syncMeshes();

    const p = this.player.worldPos();
    this.traffic.update(dt, this.world, p.x, p.z, st.speedMs);
    this.audio.update(this.player.rpm, this.input.throttle, this.player.engineOn, st.speedMs);
    this.updateJobs(p.x, p.z, st.speedKph);
    this.updateCamera(dt);
    this.updateMinimap(p.x, p.z);
    this.updateRain(p.x, p.z, dt);

    const hh = Math.floor(this.timeH % 24);
    const mm = Math.floor((this.timeH % 1) * 60);
    const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const dest = this.navText(p.x, p.z);
    this.ui.setHud({
      kph: st.speedKph,
      rpm: this.player.rpm,
      fuel: this.player.fuel,
      gear: st.gearStr,
      engine: this.player.engineOn,
      indL: this.player.indicators.l,
      indR: this.player.indicators.r,
      clock,
      job: this.job ? `${this.job.cargo} · ${this.jobStage === 'hauling' ? this.job.toName : this.job.fromName}` : 'Free drive · East Rift Corridor',
      nav: dest,
      toast: this.toast,
    });
    this.toast = undefined;

    this.sunFollow(p.x, p.z);
  }

  private sunFollow(x: number, z: number) {
    this.world.sun.target.position.set(x, 0, z);
    this.world.sun.target.updateMatrixWorld();
    const s = this.world.sun.position;
    s.x = x + s.x * 0 + 80;
  }

  private navText(x: number, z: number) {
    const target = this.currentTarget();
    if (!target) return 'Keep LEFT · Rift Highway · East Rift Corridor';
    const dx = target.x - x;
    const dz = target.z - z;
    const dist = Math.hypot(dx, dz);
    const bearing = Math.atan2(dx, dz);
    const head = this.player.heading();
    let turn = bearing - head;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    const dir = Math.abs(turn) < 0.4 ? 'Continue' : turn > 0 ? 'Turn right' : 'Turn left';
    return `${dir} · ${Math.round(dist)} m · KEEP LEFT`;
  }

  private currentTarget() {
    if (this.jobStage === 'parking' && this.playMode === 'park') return { x: this.parkingTarget.x, z: this.parkingTarget.z };
    if (!this.job) return null;
    const id = this.jobStage === 'hauling' || this.jobStage === 'parking' ? this.job.to : this.job.from;
    return this.world.pois.find((p) => p.id === id) || null;
  }

  private updateJobs(x: number, z: number, kph: number) {
    if (this.playMode === 'park') {
      const d = Math.hypot(x - this.parkingTarget.x, z - this.parkingTarget.z);
      if (d < 6 && kph < 3) {
        const headErr = Math.abs(this.player.heading() - this.parkingHeading);
        const score = Math.max(0, 1 - d / 6) * Math.max(0, 1 - headErr);
        this.ui.showResult('Bay parked', `Alignment ${Math.round(score * 100)}%`, () => this.toMenu(true));
        this.playMode = 'free';
      }
      return;
    }
    if (!this.job) return;
    if (this.jobStage === 'toPickup') {
      const poi = this.world.pois.find((p) => p.id === this.job!.from);
      if (poi && Math.hypot(x - poi.x, z - poi.z) < poi.radius && kph < 8) {
        this.jobStage = 'hauling';
        this.player.setLoaded(true);
        this.toast = `Loaded ${this.job.cargo}. Deliver to ${this.job.toName}.`;
        this.audio.beep(660, 0.15);
      }
    } else if (this.jobStage === 'hauling') {
      const poi = this.world.pois.find((p) => p.id === this.job!.to);
      if (poi && Math.hypot(x - poi.x, z - poi.z) < poi.radius + 8) {
        this.jobStage = 'parking';
        this.parkingTarget.set(poi.x, 0, poi.z + 6);
        this.toast = 'Reverse into the loading bay.';
      }
    } else if (this.jobStage === 'parking' && this.job) {
      const d = Math.hypot(x - this.parkingTarget.x, z - this.parkingTarget.z);
      if (d < 7 && kph < 4) {
        const parkScore = Math.max(0, 1 - d / 7);
        const elapsed = (performance.now() - this.startedAt) / 60000;
        const onTime = elapsed < this.job.deadlineMin;
        const r = settleDelivery(this.save, this.job, this.player.cargoDamage, onTime, parkScore);
        this.player.setLoaded(false);
        this.writeSave();
        this.ui.showResult(
          'Delivered',
          `Pay KES ${r.pay.toLocaleString()} · Parking ${Math.round(parkScore * 100)}% · ${onTime ? 'On time' : 'Late'}`,
          () => this.toMenu(true),
        );
        this.job = null;
        this.jobStage = 'idle';
      }
    }
    const fuelP = this.world.nearestPOI(x, z, 'fuel');
    if (fuelP.dist < 10 && this.input.handbrake) this.tryRefuel();
  }

  private tryRefuel() {
    const p = this.player.worldPos();
    const fuelP = this.world.nearestPOI(p.x, p.z, 'fuel');
    const need = 680 - this.player.fuel;
    if (need < 2) {
      this.toast = 'Tank is full';
      return;
    }
    if (fuelP.dist > 16) {
      this.toast = 'Drive to a Jua Fuel station';
      return;
    }
    const region = fuelP.poi!.x < -100 ? 'west' : fuelP.poi!.x > 400 ? 'east' : 'highland';
    const cost = fuelCost(need, region);
    if (this.save.money < cost) {
      this.toast = 'Not enough cash for a full tank';
      const afford = Math.min(need, this.save.money / (cost / need));
      this.player.fuel += afford;
      this.save.money = 0;
    } else {
      this.save.money -= cost;
      this.player.fuel = 680;
      this.toast = `Refuelled ${Math.round(need)} L · KES ${cost}`;
    }
    persistSave(this.save);
  }

  private updateCamera(dt: number) {
    const g = this.player.parts.group;
    const cab = this.player.parts.cabinAnchor;
    const pass = this.player.parts.passengerAnchor;
    const hood = this.player.parts.hoodAnchor;
    const wp = new THREE.Vector3();
    const wq = new THREE.Quaternion();
    if (this.cam === 'cabin') {
      cab.getWorldPosition(wp);
      cab.getWorldQuaternion(wq);
      this.camera.position.lerp(wp, 0.35);
      const look = wp.clone();
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(wq);
      look.add(fwd.multiplyScalar(8)).add(new THREE.Vector3(0, 0.3, 0));
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(look);
      this.camera.fov = 68;
    } else if (this.cam === 'passenger') {
      pass.getWorldPosition(wp);
      pass.getWorldQuaternion(wq);
      this.camera.position.copy(wp);
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(wq);
      this.camera.lookAt(wp.clone().add(fwd.multiplyScalar(8)));
      this.camera.fov = 68;
    } else if (this.cam === 'hood') {
      hood.getWorldPosition(wp);
      this.camera.position.copy(wp);
      g.getWorldQuaternion(wq);
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(wq);
      this.camera.lookAt(wp.clone().add(fwd.multiplyScalar(12)));
      this.camera.fov = 70;
    } else if (this.cam === 'trailer') {
      const t = this.player.trailerVis.group.position;
      this.camera.position.lerp(new THREE.Vector3(t.x, t.y + 8, t.z - 14), 0.12);
      this.camera.lookAt(t.x, t.y + 1, t.z);
      this.camera.fov = 60;
    } else {
      g.getWorldPosition(wp);
      g.getWorldQuaternion(wq);
      const back = new THREE.Vector3(0, 3.4, -11).applyQuaternion(wq);
      const target = wp.clone().add(back);
      this.camera.position.lerp(target, 1 - Math.pow(0.001, dt));
      this.camera.lookAt(wp.x, wp.y + 1.6, wp.z);
      this.camera.fov = 62;
    }
    this.camera.updateProjectionMatrix();
  }

  private updateMinimap(x: number, z: number) {
    const c = document.getElementById('minimap') as HTMLCanvasElement | null;
    if (!c || !this.gpsOn) return;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#102014';
    ctx.fillRect(0, 0, 180, 180);
    const sc = 0.06;
    const hx = 90;
    const hy = 90;
    const rot = this.player.heading();
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-rot);
    ctx.strokeStyle = '#889';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < this.world.highway.length; i++) {
      const p = this.world.highway[i];
      const mx = (p.x - x) * sc;
      const mz = (p.z - z) * sc;
      if (i === 0) ctx.moveTo(mx, mz);
      else ctx.lineTo(mx, mz);
    }
    ctx.stroke();
    for (const poi of this.world.pois) {
      ctx.fillStyle = poi.kind === 'fuel' ? '#e0a020' : poi.kind === 'garage' ? '#c49a3c' : '#d8d0c0';
      ctx.fillRect((poi.x - x) * sc - 2, (poi.z - z) * sc - 2, 4, 4);
    }
    const t = this.currentTarget();
    if (t) {
      ctx.fillStyle = '#3dff9a';
      ctx.beginPath();
      ctx.arc((t.x - x) * sc, (t.z - z) * sc, 5, 0, 6.28);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(90, 78);
    ctx.lineTo(84, 102);
    ctx.lineTo(96, 102);
    ctx.fill();
    ctx.fillStyle = '#8f8';
    ctx.font = '9px sans-serif';
    ctx.fillText('N', 86, 12);
  }

  private updateRain(x: number, z: number, dt: number) {
    const wet = this.weather === 'rain' || this.weather === 'storm';
    if (this.rain) {
      this.rain.visible = wet;
      this.rain.position.set(x, 8, z);
      if (wet) {
        const pos = this.rain.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          pos.setY(i, pos.getY(i) - dt * 28);
          if (pos.getY(i) < 0) pos.setY(i, 24);
        }
        pos.needsUpdate = true;
      }
    }
    // Slow weather cycle
    if (Math.random() < dt * 0.01) {
      const pool = ['sunny', 'sunny', 'cloudy', 'rain', 'fog'];
      this.weather = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }
}

export function resetSave() {
  persistSave(newSave());
}
