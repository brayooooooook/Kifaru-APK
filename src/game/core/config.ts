/** Long Haul Africa — original simulator configuration. */

export const TITLE = 'LONG HAUL AFRICA';
export const STUDIO = 'Kifaru Interactive';
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'lha.save.v1';
export const SETTINGS_KEY = 'lha.settings.v1';

export const WORLD = {
  size: 3200,
  chunk: 200,
  streamRadius: 500,
  fogNear: 180,
  fogFar: 620,
};

/** Diesel conventional tractor — Kifaru Tembo 680. */
export const TRUCK = {
  brand: 'Kifaru Motors',
  model: 'Tembo 680',
  mass: 8200,
  width: 2.55,
  height: 3.85,
  length: 8.6,
  wheelRadius: 0.54,
  wheelWidth: 0.38,
  /** Front axle sits behind the bumper / under the long bonnet. */
  wheelbase: 5.85,
  frontAxleZ: 3.15,
  driveAxleZ: [-1.85, -3.15],
  fifthWheelZ: -2.35,
  /** Right-hand drive seat in truck local space (+X is right). */
  driverSeat: { x: 0.62, y: 2.18, z: 0.42 },
  passengerSeat: { x: -0.62, y: 2.18, z: 0.42 },
  idleRpm: 650,
  stallRpm: 480,
  redline: 2100,
  maxTorque: 2650,
  tankLitres: 680,
  steerMax: 0.62,
};

export const TRAILER = {
  massEmpty: 6200,
  massCargoMaize: 18000,
  length: 12.4,
  width: 2.55,
  height: 3.9,
  kingpinZ: 5.1,
  axlesZ: [-3.2, -4.5, -5.8],
};

/** 12-speed plus reverse. High first gear = crawl, heavy diesel feel. */
export const GEARS = {
  reverse: -9.8,
  ratios: [0, 12.8, 9.4, 6.9, 5.1, 3.8, 2.8, 2.15, 1.65, 1.28, 1.0, 0.78, 0.62],
  finalDrive: 3.42,
};

export const ECONOMY = {
  startMoney: 18500,
  fuelPrice: 168, // KES per litre, regional variance applied
  insurancePerDay: 420,
  repairPerDamage: 85,
};

export const CITIES = {
  mavuno: { name: 'Mavuno City', x: -820, z: -80 },
  highland: { name: 'Highland Junction', x: 40, z: 420 },
  kijani: { name: 'Kijani', x: 920, z: -60 },
};

export const COLORS = {
  gold: 0xc49a3c,
  maroon: 0x6b1d2a,
  chrome: 0xc5c8ce,
  asphalt: 0x2a2c30,
  soil: 0x6a3a1e,
  grass: 0x4a6b32,
  cabInterior: 0x1c1410,
};
