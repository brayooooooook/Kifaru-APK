import {
  autoShift,
  dieselTorqueNm,
  driveForceN,
  engineRpmFromWheels,
  fuelLitresPerSecond,
  gearRatio,
  impactDamage,
  maxSteerForSpeed,
} from '../truck/drivetrain';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
}

assert(dieselTorqueNm(1400) > dieselTorqueNm(700), 'peak torque above idle');
assert(dieselTorqueNm(1400) > dieselTorqueNm(2000), 'torque falls toward redline');
assert(gearRatio(1) > gearRatio(12), 'first gear shorter than 12th');
assert(gearRatio(-1) < 0, 'reverse negative');
assert(driveForceN(1200, 1, 1, 1) > 0, 'drive force positive');
assert(driveForceN(1200, 1, 0, 1) === 0, 'neutral no drive');
assert(maxSteerForSpeed(1) > maxSteerForSpeed(25), 'steering slows with speed');
assert(impactDamage(0.5) === 0, 'gentle bump no damage');
assert(impactDamage(8) > 5, 'hard hit damages');
assert(fuelLitresPerSecond(1800, 1, 1, true) > fuelLitresPerSecond(700, 0, 0, true), 'load uses more fuel');
assert(fuelLitresPerSecond(1800, 1, 1, false) === 0, 'engine off uses no fuel');
assert(autoShift(2, 1800, 1, 12, 0.3) >= 2, 'upshift allowed');
assert(engineRpmFromWheels(20, 1, 1) > 500, 'rpm from wheels');

// Left-side traffic / RHD invariants
import { TRUCK } from '../core/config';
assert(TRUCK.driverSeat.x > 0, 'driver sits on the RIGHT (+X)');
assert(TRUCK.passengerSeat.x < 0, 'passenger sits on the LEFT');
assert(TRUCK.frontAxleZ > 2.5, 'front axle behind long bonnet, conventional layout');
assert(TRUCK.fifthWheelZ < 0, 'fifth wheel behind cab');

console.log('Long Haul Africa simulation tests: ALL PASSED');
