import type { Settings } from '../save/SaveGame';
import type { SaveData } from '../save/SaveGame';
import type { Job } from '../career/Jobs';
import type { Input } from '../input/Input';

export class UI {
  root: HTMLElement;
  onStartCareer!: () => void;
  onQuickJob!: () => void;
  onFreeDrive!: () => void;
  onParking!: () => void;
  onContinue!: () => void;
  onPauseResume!: () => void;
  onSaveExit!: () => void;
  onAcceptJob!: (job: Job) => void;
  onRefuel!: () => void;
  onRepair!: () => void;
  onHire!: () => void;
  onSettings!: (s: Partial<Settings>) => void;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  showMenu(save: SaveData, hasSave: boolean) {
    this.root.innerHTML = `
      <div class="menu-wrap">
        <div class="logo-block">
          <div class="rhino">🦏</div>
          <h1>LONG HAUL AFRICA</h1>
          <p class="tag">East Rift Corridor · Right-hand drive · Keep left</p>
          <p class="studio">Kifaru Interactive · Kifaru Tembo 680</p>
        </div>
        <div class="menu-col">
          ${hasSave ? `<button data-act="continue" class="primary">CONTINUE</button>` : ''}
          <button data-act="career" class="primary">CAREER</button>
          <button data-act="quick">QUICK JOB</button>
          <button data-act="free">FREE DRIVE</button>
          <button data-act="park">PARKING</button>
          <button data-act="garage">GARAGE & COMPANY</button>
          <button data-act="settings">SETTINGS</button>
        </div>
        <div class="menu-stats">
          <div><span>Company</span><b>${esc(save.company)}</b></div>
          <div><span>Cash</span><b>KES ${save.money.toLocaleString()}</b></div>
          <div><span>Level</span><b>${save.level}</b></div>
          <div><span>Deliveries</span><b>${save.deliveries}</b></div>
        </div>
        <p class="legal">Original game. Fictional manufacturers, cities and operators. Completely free. Offline.</p>
      </div>`;
    this.bindMenu();
  }

  showGarage(save: SaveData, jobs: Job[]) {
    this.root.innerHTML = `
      <div class="sheet">
        <h2>Kifaru Depot · Company</h2>
        <p class="muted">${esc(save.company)} · Level ${save.level} · KES ${save.money.toLocaleString()}</p>
        <div class="tabs">
          <div>
            <h3>Trucks</h3>
            ${save.trucks
              .map(
                (t) =>
                  `<div class="card ${t.id === save.activeTruck ? 'on' : ''}"><b>${t.spec}</b><br/>Fuel ${Math.round(t.fuel)} L · Body dmg ${Math.round(t.damage.body)}%</div>`,
              )
              .join('')}
            <p class="muted">Starter tractor: Kifaru Tembo 680 conventional, long bonnet, RHD.</p>
          </div>
          <div>
            <h3>Jobs on the board</h3>
            ${jobs
              .map(
                (j) =>
                  `<button class="job" data-job="${j.id}"><b>${esc(j.cargo)}</b><br/><small>${esc(j.fromName)} → ${esc(j.toName)}</small><br/>KES ${j.pay.toLocaleString()} · ${j.weight / 1000} t · ${j.deadlineMin} min</button>`,
              )
              .join('')}
          </div>
          <div>
            <h3>Drivers</h3>
            ${save.drivers.map((d) => `<div class="card">${esc(d.name)} · skill ${Math.round(d.skill * 100)}</div>`).join('') || '<p class="muted">No hired drivers yet.</p>'}
            <button data-act="hire">HIRE DRIVER (KES 2,500)</button>
            <button data-act="repair">REPAIR TRUCK</button>
            <button data-act="back">BACK</button>
          </div>
        </div>
      </div>`;
    this.root.querySelector('[data-act="hire"]')?.addEventListener('click', () => this.onHire());
    this.root.querySelector('[data-act="repair"]')?.addEventListener('click', () => this.onRepair());
    this.root.querySelector('[data-act="back"]')?.addEventListener('click', () => this.onSaveExit());
    this.root.querySelectorAll<HTMLElement>('[data-job]').forEach((el) => {
      el.addEventListener('click', () => {
        const job = jobs.find((j) => j.id === el.dataset.job);
        if (job) this.onAcceptJob(job);
      });
    });
  }

  showSettings(s: Settings) {
    this.root.innerHTML = `
      <div class="sheet">
        <h2>Settings</h2>
        <label>Steering
          <select id="scheme">
            <option value="wheel" ${s.scheme === 'wheel' ? 'selected' : ''}>Steering wheel</option>
            <option value="buttons" ${s.scheme === 'buttons' ? 'selected' : ''}>Button steering</option>
            <option value="tilt" ${s.scheme === 'tilt' ? 'selected' : ''}>Tilt steering</option>
          </select>
        </label>
        <label>Sensitivity <input id="sens" type="range" min="0.4" max="1.8" step="0.05" value="${s.steerSensitivity}"></label>
        <label>Quality
          <select id="qual">
            <option value="low" ${s.quality === 'low' ? 'selected' : ''}>Low · 30 FPS target</option>
            <option value="mid" ${s.quality === 'mid' ? 'selected' : ''}>Mid · 45–60</option>
            <option value="high" ${s.quality === 'high' ? 'selected' : ''}>High · 60</option>
          </select>
        </label>
        <label>Master volume <input id="vol" type="range" min="0" max="1" step="0.05" value="${s.volume}"></label>
        <label><input id="mirrors" type="checkbox" ${s.mirrors ? 'checked' : ''}> Functional mirrors</label>
        <p class="muted">Controls can be dragged in Customize HUD while driving (button on the HUD).</p>
        <button data-act="back">BACK</button>
      </div>`;
    const emit = () =>
      this.onSettings({
        scheme: (document.getElementById('scheme') as HTMLSelectElement).value as Settings['scheme'],
        steerSensitivity: Number((document.getElementById('sens') as HTMLInputElement).value),
        quality: (document.getElementById('qual') as HTMLSelectElement).value as Settings['quality'],
        volume: Number((document.getElementById('vol') as HTMLInputElement).value),
        mirrors: (document.getElementById('mirrors') as HTMLInputElement).checked,
      });
    this.root.querySelectorAll('input,select').forEach((el) => el.addEventListener('change', emit));
    this.root.querySelector('[data-act="back"]')?.addEventListener('click', () => this.onSaveExit());
  }

  hudHtml() {
    return `
      <div id="hud">
        <div id="topbar">
          <div id="jobline">No active job</div>
          <div id="clock">08:00</div>
        </div>
        <div id="gps">
          <canvas id="minimap" width="180" height="180"></canvas>
          <div id="navtext">Follow the Rift Highway · KEEP LEFT</div>
        </div>
        <div id="cluster">
          <div><b id="speed">0</b><small>km/h</small></div>
          <div class="bars">
            <div class="bar"><i id="rpmbar"></i></div>
            <div class="bar fuel"><i id="fuelbar"></i></div>
          </div>
          <div id="gear">N</div>
          <div id="flags"><span id="indL">◀</span><span id="eng">ENGINE</span><span id="indR">▶</span></div>
        </div>
        <div id="steer" class="touch-wheel"><div class="knob"></div></div>
        <div id="pedals">
          <button id="brake">BRAKE</button>
          <button id="accel">ACCEL</button>
        </div>
        <div id="btns">
          <button data-k="engineToggle">IGN</button>
          <button data-k="camera">CAM</button>
          <button data-k="horn">HORN</button>
          <button data-k="lights">LIGHTS</button>
          <button data-k="leftInd">◀ IND</button>
          <button data-k="rightInd">IND ▶</button>
          <button data-k="handbrake">PARK</button>
          <button data-k="gps">GPS</button>
          <button data-k="pause">II</button>
        </div>
        <div id="toast"></div>
        <div id="help">W/S throttle · A/D steer · E ignition · C camera · H horn · L lights · P pause · Drive on the LEFT</div>
      </div>
      <div id="pause" class="hidden">
        <div class="sheet">
          <h2>Paused</h2>
          <button data-act="resume">RESUME</button>
          <button data-act="refuel">REFUEL HERE</button>
          <button data-act="save">SAVE & MENU</button>
        </div>
      </div>`;
  }

  bindHud(input: Input) {
    const steer = document.getElementById('steer')!;
    const knob = steer.querySelector('.knob') as HTMLElement;
    const setSteer = (clientX: number, clientY: number) => {
      const r = steer.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const ang = Math.atan2(clientX - cx, cy - clientY);
      const clamped = Math.max(-Math.PI * 0.75, Math.min(Math.PI * 0.75, ang));
      input.pointerSteer = clamped / (Math.PI * 0.75);
      knob.style.transform = `rotate(${clamped}rad)`;
    };
    const stopSteer = () => {
      input.pointerSteer = 0;
      knob.style.transform = 'rotate(0rad)';
    };
    steer.addEventListener('pointerdown', (e) => {
      steer.setPointerCapture(e.pointerId);
      setSteer(e.clientX, e.clientY);
    });
    steer.addEventListener('pointermove', (e) => {
      if (e.pressure || (e.buttons & 1)) setSteer(e.clientX, e.clientY);
    });
    steer.addEventListener('pointerup', stopSteer);
    steer.addEventListener('pointercancel', stopSteer);

    const hold = (id: string, setter: (v: number) => void) => {
      const el = document.getElementById(id)!;
      const on = (e: Event) => {
        e.preventDefault();
        setter(1);
        el.classList.add('down');
      };
      const off = () => {
        setter(0);
        el.classList.remove('down');
      };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
    };
    hold('accel', (v) => (input.pointerThrottle = v));
    hold('brake', (v) => (input.pointerBrake = v));

    document.querySelectorAll<HTMLElement>('#btns [data-k]').forEach((b) => {
      b.addEventListener('click', () => input.pulse(b.dataset.k as 'horn'));
    });
    document.querySelector('#pause [data-act="resume"]')?.addEventListener('click', () => this.onPauseResume());
    document.querySelector('#pause [data-act="save"]')?.addEventListener('click', () => this.onSaveExit());
    document.querySelector('#pause [data-act="refuel"]')?.addEventListener('click', () => this.onRefuel());
  }

  setHud(d: {
    kph: number;
    rpm: number;
    fuel: number;
    gear: string;
    engine: boolean;
    indL: boolean;
    indR: boolean;
    clock: string;
    job: string;
    nav: string;
    toast?: string;
  }) {
    const $ = (id: string) => document.getElementById(id);
    if (!$('speed')) return;
    $('speed')!.textContent = String(Math.round(d.kph));
    $('gear')!.textContent = d.gear;
    $('rpmbar')!.style.width = `${Math.min(100, (d.rpm / 2100) * 100)}%`;
    $('fuelbar')!.style.width = `${Math.min(100, (d.fuel / 680) * 100)}%`;
    $('eng')!.classList.toggle('on', d.engine);
    $('indL')!.classList.toggle('on', d.indL);
    $('indR')!.classList.toggle('on', d.indR);
    $('clock')!.textContent = d.clock;
    $('jobline')!.textContent = d.job;
    $('navtext')!.textContent = d.nav;
    if (d.toast) {
      const t = $('toast')!;
      t.textContent = d.toast;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2800);
    }
  }

  togglePause(on: boolean) {
    document.getElementById('pause')?.classList.toggle('hidden', !on);
  }

  showResult(title: string, body: string, cb: () => void) {
    this.root.insertAdjacentHTML(
      'beforeend',
      `<div class="modal"><div class="sheet"><h2>${esc(title)}</h2><p>${body}</p><button id="okres">OK</button></div></div>`,
    );
    document.getElementById('okres')?.addEventListener('click', () => {
      document.querySelector('.modal')?.remove();
      cb();
    });
  }

  private bindMenu() {
    this.root.querySelector('[data-act="continue"]')?.addEventListener('click', () => this.onContinue());
    this.root.querySelector('[data-act="career"]')?.addEventListener('click', () => this.onStartCareer());
    this.root.querySelector('[data-act="quick"]')?.addEventListener('click', () => this.onQuickJob());
    this.root.querySelector('[data-act="free"]')?.addEventListener('click', () => this.onFreeDrive());
    this.root.querySelector('[data-act="park"]')?.addEventListener('click', () => this.onParking());
    this.root.querySelector('[data-act="garage"]')?.addEventListener('click', () => this.onStartCareer());
    this.root.querySelector('[data-act="settings"]')?.addEventListener('click', () =>
      this.onSettings({}),
    );
  }
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
