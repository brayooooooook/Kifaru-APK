import { ECONOMY, SAVE_KEY, SAVE_VERSION, SETTINGS_KEY } from '../core/config';

export type ControlScheme = 'wheel' | 'buttons' | 'tilt';

export interface HudLayoutItem {
  id: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

export interface Settings {
  scheme: ControlScheme;
  steerSensitivity: number;
  invertSteer: boolean;
  cameraShake: boolean;
  mirrors: boolean;
  quality: 'low' | 'mid' | 'high';
  volume: number;
  music: number;
  timeScale: number;
  hud: HudLayoutItem[];
}

export interface OwnedTruck {
  id: string;
  spec: string;
  color: number;
  odometer: number;
  damage: { engine: number; tyres: number; body: number; suspension: number };
  fuel: number;
}

export interface Driver {
  id: string;
  name: string;
  skill: number;
  wage: number;
  assignedTruck?: string;
}

export interface SaveData {
  version: number;
  money: number;
  xp: number;
  level: number;
  company: string;
  discovered: string[];
  deliveries: number;
  trucks: OwnedTruck[];
  activeTruck: string;
  trailersOwned: string[];
  garages: string[];
  drivers: Driver[];
  timeOfDay: number;
  weather: string;
}

export const DEFAULT_SETTINGS: Settings = {
  scheme: 'wheel',
  steerSensitivity: 1,
  invertSteer: false,
  cameraShake: true,
  mirrors: true,
  quality: 'mid',
  volume: 0.8,
  music: 0.35,
  timeScale: 8,
  hud: [
    { id: 'steer', x: 0.14, y: 0.78, scale: 1, opacity: 0.85 },
    { id: 'pedals', x: 0.86, y: 0.78, scale: 1, opacity: 0.9 },
    { id: 'cluster', x: 0.5, y: 0.9, scale: 1, opacity: 0.92 },
  ],
};

const NAMES = ['Amina Otieno', 'Joseph Mwangi', 'Thandi Ncube', 'Kwame Banda', 'Zanele Dlamini', 'Ibrahim Chirwa'];

export function newSave(): SaveData {
  return {
    version: SAVE_VERSION,
    money: ECONOMY.startMoney,
    xp: 0,
    level: 1,
    company: 'Rift Haul Logistics',
    discovered: ['mavuno'],
    deliveries: 0,
    trucks: [
      {
        id: 'tembo-01',
        spec: 'kifaru-tembo-680',
        color: 0xc49a3c,
        odometer: 12840,
        damage: { engine: 0, tyres: 0, body: 0, suspension: 0 },
        fuel: 420,
      },
    ],
    activeTruck: 'tembo-01',
    trailersOwned: ['box-maize-01'],
    garages: ['mavuno-depot'],
    drivers: [],
    timeOfDay: 8.2,
    weather: 'sunny',
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newSave();
    const data = JSON.parse(raw) as SaveData;
    if (!data || data.version !== SAVE_VERSION) return migrate(data);
    return { ...newSave(), ...data };
  } catch {
    return newSave();
  }
}

export function persistSave(data: SaveData) {
  data.version = SAVE_VERSION;
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, hud: DEFAULT_SETTINGS.hud.map((h) => ({ ...h })) };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function persistSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function migrate(data: SaveData | null): SaveData {
  const fresh = newSave();
  if (!data) return fresh;
  return { ...fresh, ...data, version: SAVE_VERSION };
}

export function hireDriver(save: SaveData): Driver | null {
  if (save.money < 8000) return null;
  const name = NAMES[save.drivers.length % NAMES.length];
  const d: Driver = {
    id: 'drv-' + Date.now().toString(36),
    name,
    skill: 0.4 + Math.random() * 0.5,
    wage: 2200,
  };
  save.drivers.push(d);
  save.money -= 2500;
  return d;
}

export function addXp(save: SaveData, amount: number) {
  save.xp += amount;
  const need = save.level * 1200;
  if (save.xp >= need) {
    save.xp -= need;
    save.level += 1;
  }
}
