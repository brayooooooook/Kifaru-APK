/** Original procedural audio. No copyrighted samples. */

export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  engineGain!: GainNode;
  osc!: OscillatorNode;
  osc2!: OscillatorNode;
  noise!: AudioBufferSourceNode;
  noiseGain!: GainNode;
  turboGain!: GainNode;
  started = false;
  muted = false;

  async unlock() {
    if (this.ctx) return;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(ctx.destination);

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineGain.connect(this.master);

    this.osc = ctx.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc.frequency.value = 40;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    this.osc.connect(lp);
    lp.connect(this.engineGain);

    this.osc2 = ctx.createOscillator();
    this.osc2.type = 'square';
    this.osc2.frequency.value = 80;
    const lp2 = ctx.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = 180;
    const g2 = ctx.createGain();
    g2.gain.value = 0.15;
    this.osc2.connect(lp2);
    lp2.connect(g2);
    g2.connect(this.engineGain);

    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = ctx.createBufferSource();
    this.noise.buffer = buf;
    this.noise.loop = true;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.02;
    const nlp = ctx.createBiquadFilter();
    nlp.type = 'bandpass';
    nlp.frequency.value = 900;
    this.noise.connect(nlp);
    nlp.connect(this.noiseGain);
    this.noiseGain.connect(this.master);

    this.turboGain = ctx.createGain();
    this.turboGain.gain.value = 0;
    const tOsc = ctx.createOscillator();
    tOsc.type = 'sine';
    tOsc.frequency.value = 1800;
    tOsc.connect(this.turboGain);
    this.turboGain.connect(this.master);

    this.osc.start();
    this.osc2.start();
    tOsc.start();
    this.noise.start();
    this.started = true;
    if (ctx.state === 'suspended') await ctx.resume();
  }

  setMaster(v: number) {
    if (this.master) this.master.gain.value = v;
  }

  update(rpm: number, throttle: number, engineOn: boolean, speedMs: number) {
    if (!this.ctx || !this.started) return;
    const t = this.ctx.currentTime;
    if (!engineOn) {
      this.engineGain.gain.setTargetAtTime(0, t, 0.08);
      return;
    }
    const freq = 28 + (rpm / 2100) * 92;
    this.osc.frequency.setTargetAtTime(freq, t, 0.05);
    this.osc2.frequency.setTargetAtTime(freq * 2.05, t, 0.05);
    const vol = 0.04 + throttle * 0.12 + (rpm / 2100) * 0.06;
    this.engineGain.gain.setTargetAtTime(vol, t, 0.05);
    this.noiseGain.gain.setTargetAtTime(0.01 + throttle * 0.04 + Math.min(0.04, speedMs * 0.002), t, 0.08);
    this.turboGain.gain.setTargetAtTime(throttle * (rpm / 2100) * 0.03, t, 0.1);
  }

  beep(freq = 880, dur = 0.12) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.value = freq;
    o.type = 'square';
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(this.master);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    o.stop(this.ctx.currentTime + dur);
  }

  horn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const f of [220, 277]) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      g.gain.value = 0.12;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      o.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      o.start(t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.stop(t + 0.55);
    }
  }

  indicator() {
    this.beep(1400, 0.07);
  }
}
