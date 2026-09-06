import type { ControlScheme, Settings } from '../save/SaveGame';

export class Input {
  throttle = 0;
  brake = 0;
  steer = 0;
  clutch = 1;
  handbrake = false;
  engineToggle = false;
  horn = false;
  camera = false;
  lights = false;
  hazards = false;
  leftInd = false;
  rightInd = false;
  wipers = false;
  pause = false;
  gps = false;
  gearUp = false;
  gearDown = false;
  scheme: ControlScheme = 'wheel';
  sensitivity = 1;
  invert = false;

  keys = new Set<string>();
  pointerSteer = 0;
  pointerThrottle = 0;
  pointerBrake = 0;
  tiltSteer = 0;
  wheelGrab = false;
  customize = false;

  private camLatch = false;
  private engLatch = false;
  private lightLatch = false;
  private hazLatch = false;
  private gpsLatch = false;
  private pauseLatch = false;

  attach(el: HTMLElement, settings: Settings) {
    this.scheme = settings.scheme;
    this.sensitivity = settings.steerSensitivity;
    this.invert = settings.invertSteer;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    window.addEventListener('deviceorientation', (e) => {
      if (this.scheme !== 'tilt') return;
      const g = e.gamma ?? 0;
      this.tiltSteer = Math.max(-1, Math.min(1, g / 28));
    });

    el.addEventListener(
      'touchmove',
      (e) => {
        if (e.cancelable) e.preventDefault();
      },
      { passive: false },
    );
  }

  setScheme(s: ControlScheme) {
    this.scheme = s;
  }

  pulse(flag: 'horn' | 'camera' | 'lights' | 'hazards' | 'leftInd' | 'rightInd' | 'wipers' | 'engineToggle' | 'handbrake' | 'pause' | 'gps' | 'gearUp' | 'gearDown') {
    (this as unknown as Record<string, boolean>)[flag] = true;
  }

  sample() {
    const k = this.keys;
    const kbThrottle = k.has('KeyW') || k.has('ArrowUp') ? 1 : 0;
    const kbBrake = k.has('KeyS') || k.has('ArrowDown') ? 1 : 0;
    let kbSteer = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) kbSteer -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) kbSteer += 1;

    this.throttle = Math.max(kbThrottle, this.pointerThrottle);
    this.brake = Math.max(kbBrake, this.pointerBrake);

    let steer = kbSteer;
    if (this.scheme === 'wheel' || this.scheme === 'buttons') {
      if (Math.abs(this.pointerSteer) > 0.02) steer = this.pointerSteer;
    } else if (this.scheme === 'tilt') {
      steer = this.tiltSteer;
    }
    if (this.invert) steer = -steer;
    this.steer = Math.max(-1, Math.min(1, steer * this.sensitivity));

    this.handbrake = k.has('Space') || this.handbrake;
    this.horn = k.has('KeyH') || this.horn;

    const edge = (code: string, latch: boolean) => k.has(code) && !latch;
    if (edge('KeyC', this.camLatch)) this.camera = true;
    this.camLatch = k.has('KeyC');
    if (edge('KeyE', this.engLatch) || k.has('KeyR') && !this.engLatch) this.engineToggle = true;
    this.engLatch = k.has('KeyE') || k.has('KeyR');
    if (edge('KeyL', this.lightLatch)) this.lights = true;
    this.lightLatch = k.has('KeyL');
    if (edge('KeyG', this.gpsLatch)) this.gps = true;
    this.gpsLatch = k.has('KeyG');
    if (edge('Escape', this.pauseLatch) || edge('KeyP', this.pauseLatch)) this.pause = true;
    this.pauseLatch = k.has('Escape') || k.has('KeyP');
    if (edge('KeyQ', false)) this.leftInd = true;
    if (edge('KeyE', false) && k.has('ShiftLeft')) this.rightInd = true;
    if (k.has('ShiftLeft') || k.has('ShiftRight')) this.gearUp = true;
    if (k.has('ControlLeft')) this.gearDown = true;
    this.clutch = k.has('KeyX') ? 0 : 1;
  }

  consumeButtons() {
    const snap = {
      horn: this.horn,
      camera: this.camera,
      lights: this.lights,
      hazards: this.hazards,
      leftInd: this.leftInd,
      rightInd: this.rightInd,
      wipers: this.wipers,
      engineToggle: this.engineToggle,
      handbrake: this.handbrake,
      pause: this.pause,
      gps: this.gps,
      gearUp: this.gearUp,
      gearDown: this.gearDown,
    };
    this.horn = this.camera = this.lights = this.hazards = false;
    this.leftInd = this.rightInd = this.wipers = this.engineToggle = false;
    this.handbrake = this.pause = this.gps = this.gearUp = this.gearDown = false;
    return snap;
  }
}
