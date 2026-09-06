import { GEARS, TRUCK } from '../core/config';

export function dieselTorqueNm(rpm: number): number {
  const r = Math.max(500, Math.min(TRUCK.redline, rpm));
  // Peak around 1300–1500 rpm — heavy diesel, not a petrol sports engine.
  const n = (r - 650) / (TRUCK.redline - 650);
  const peak = Math.exp(-Math.pow((r - 1400) / 520, 2));
  const floor = 0.35 + 0.2 * Math.min(1, n * 2);
  return TRUCK.maxTorque * Math.max(floor, peak);
}

export function wheelRadius() {
  return TRUCK.wheelRadius;
}

export function gearRatio(gear: number): number {
  if (gear < 0) return GEARS.reverse;
  if (gear === 0) return 0;
  return GEARS.ratios[Math.min(gear, GEARS.ratios.length - 1)] * GEARS.finalDrive;
}

export function engineRpmFromWheels(wheelRadPerSec: number, gear: number, clutch = 1) {
  const gr = gearRatio(gear);
  if (gr === 0 || clutch < 0.05) return TRUCK.idleRpm;
  const wheelRpm = (wheelRadPerSec * 60) / (Math.PI * 2);
  const rpm = Math.abs(wheelRpm * gr) * clutch + TRUCK.idleRpm * (1 - clutch);
  return Math.max(TRUCK.stallRpm * 0.5, Math.min(TRUCK.redline + 200, rpm));
}

/** Drive force (N) at the driven wheels. */
export function driveForceN(rpm: number, throttle: number, gear: number, clutch: number): number {
  if (gear === 0 || clutch < 0.04) return 0;
  const t = dieselTorqueNm(rpm) * Math.max(0, Math.min(1, throttle)) * clutch;
  const gr = gearRatio(gear);
  return (t * gr) / TRUCK.wheelRadius;
}

export function autoShift(gear: number, rpm: number, throttle: number, speedMs: number, loadFactor: number): number {
  if (speedMs < 0.4 && throttle < 0.08) return 0; // idle / N at rest
  let g = gear === 0 ? 1 : gear;
  const up = 1550 + loadFactor * 180 + (1 - throttle) * 80;
  const down = 820 + loadFactor * 80;
  if (rpm > up && g < 12 && throttle > 0.12) g += 1;
  if (rpm < down && g > 1) g -= 1;
  if (speedMs < 1.2 && throttle > 0.2) g = 1;
  return g;
}

export function maxSteerForSpeed(speedMs: number): number {
  const kph = Math.abs(speedMs) * 3.6;
  const t = Math.min(1, kph / 78);
  return TRUCK.steerMax * (1 - 0.82 * t * t);
}

export function fuelLitresPerSecond(rpm: number, throttle: number, loadFactor: number, engineOn: boolean) {
  if (!engineOn) return 0;
  const idle = 0.00055;
  const work = (rpm / TRUCK.redline) * throttle * (0.7 + loadFactor * 0.6) * 0.0048;
  return idle + work;
}

export function brakingForceN(brake: number, loadKg: number, engineBrake: number, rpm: number) {
  const air = brake * (28000 + loadKg * 1.6);
  const retarder = engineBrake * (rpm / TRUCK.redline) * 9000;
  return air + retarder;
}

export function impactDamage(relSpeedMs: number): number {
  if (relSpeedMs < 1.8) return 0;
  const extra = relSpeedMs - 1.8;
  return Math.min(45, extra * extra * 0.55);
}
