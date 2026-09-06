import type { POI } from '../world/World';
import type { SaveData } from '../save/SaveGame';
import { addXp } from '../save/SaveGame';
import { ECONOMY } from '../core/config';

export interface Job {
  id: string;
  title: string;
  cargo: string;
  cargoKind: 'maize' | 'tea' | 'cement' | 'fuel' | 'steel' | 'goods' | 'livestock' | 'reefer';
  from: string;
  to: string;
  fromName: string;
  toName: string;
  weight: number;
  value: number;
  pay: number;
  deadlineMin: number;
  fragility: number;
  xp: number;
  trailer: string;
}

const CARGO: { cargo: string; kind: Job['cargoKind']; weight: number; fragility: number; value: number }[] = [
  { cargo: 'Bagged maize', kind: 'maize', weight: 14000, fragility: 0.25, value: 22000 },
  { cargo: 'Highland tea chests', kind: 'tea', weight: 9000, fragility: 0.45, value: 31000 },
  { cargo: 'Tembo cement pallets', kind: 'cement', weight: 18000, fragility: 0.2, value: 19000 },
  { cargo: 'Jua diesel', kind: 'fuel', weight: 16000, fragility: 0.7, value: 48000 },
  { cargo: 'Rift steel coils', kind: 'steel', weight: 20000, fragility: 0.15, value: 36000 },
  { cargo: 'PesaMart dry goods', kind: 'goods', weight: 11000, fragility: 0.4, value: 27000 },
  { cargo: 'Boran cattle', kind: 'livestock', weight: 8000, fragility: 0.8, value: 34000 },
  { cargo: 'Chilled produce', kind: 'reefer', weight: 10000, fragility: 0.65, value: 39000 },
];

export function generateJobs(pois: POI[], count = 6): Job[] {
  const pickups = pois.filter((p) => ['warehouse', 'farm', 'port', 'garage'].includes(p.kind));
  const drops = pois.filter((p) => ['market', 'warehouse', 'port', 'stop'].includes(p.kind));
  const jobs: Job[] = [];
  for (let i = 0; i < count; i++) {
    const c = CARGO[i % CARGO.length];
    const from = pickups[i % pickups.length];
    const to = drops[(i + 2) % drops.length];
    if (from.id === to.id) continue;
    const dist = Math.hypot(from.x - to.x, from.z - to.z);
    const pay = Math.round((c.value * 0.18 + dist * 4.2 + c.weight * 0.04) / 10) * 10;
    jobs.push({
      id: 'job-' + i + '-' + Date.now().toString(36).slice(-4),
      title: `${c.cargo} → ${to.name}`,
      cargo: c.cargo,
      cargoKind: c.kind,
      from: from.id,
      to: to.id,
      fromName: from.name,
      toName: to.name,
      weight: c.weight,
      value: c.value,
      pay,
      deadlineMin: 18 + Math.round(dist / 80),
      fragility: c.fragility,
      xp: 80 + Math.round(dist / 15) + Math.round(c.weight / 400),
      trailer: c.kind === 'fuel' ? 'tanker' : c.kind === 'reefer' ? 'reefer' : c.kind === 'livestock' ? 'livestock' : 'box',
    });
  }
  return jobs;
}

export function settleDelivery(save: SaveData, job: Job, cargoDamage: number, onTime: boolean, parkScore: number) {
  const dmgPen = cargoDamage * 0.35;
  const latePen = onTime ? 0 : job.pay * 0.25;
  const parkBonus = parkScore > 0.85 ? job.pay * 0.08 : parkScore > 0.6 ? job.pay * 0.03 : 0;
  const pay = Math.max(0, Math.round(job.pay - dmgPen - latePen + parkBonus));
  save.money += pay;
  save.deliveries += 1;
  addXp(save, Math.round(job.xp * (onTime ? 1 : 0.7) * (0.7 + parkScore * 0.3)));
  return { pay, dmgPen, latePen, parkBonus };
}

export function fuelCost(litres: number, region: 'west' | 'east' | 'highland') {
  const base = ECONOMY.fuelPrice;
  const m = region === 'highland' ? 1.08 : region === 'east' ? 1.04 : 1;
  return Math.round(litres * base * m);
}
