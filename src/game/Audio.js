/** Lightweight Web Audio SFX — no external assets required. */

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this._ambientNodes = null;
    this._ambientTimer = null;
  }

  ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone({ freq = 440, dur = 0.12, type = 'square', gain = 0.08, slide = 0 }) {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, ctx.currentTime + dur);
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  /** Soft looping Jurassic pad during missions */
  startAmbient() {
    this.stopAmbient();
    const ctx = this.ensure();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.value = 0.028;
    master.connect(ctx.destination);
    const notes = [196, 247, 294, 330];
    const nodes = [];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = 0.0001;
      osc.connect(g);
      g.connect(master);
      osc.start();
      nodes.push({ osc, g, freq, phase: i * 0.7 });
    });
    this._ambientNodes = { master, nodes };
    const pulse = () => {
      if (!this._ambientNodes || !this.enabled) return;
      const t = ctx.currentTime;
      for (const n of this._ambientNodes.nodes) {
        const target = 0.012 + Math.sin(t * 0.35 + n.phase) * 0.008;
        n.g.gain.cancelScheduledValues(t);
        n.g.gain.linearRampToValueAtTime(Math.max(0.0001, target), t + 0.4);
      }
      this._ambientTimer = setTimeout(pulse, 420);
    };
    pulse();
  }

  stopAmbient() {
    if (this._ambientTimer) {
      clearTimeout(this._ambientTimer);
      this._ambientTimer = null;
    }
    if (this._ambientNodes) {
      try {
        for (const n of this._ambientNodes.nodes) n.osc.stop();
      } catch {
        /* already stopped */
      }
      this._ambientNodes = null;
    }
  }

  shoot() {
    this.tone({ freq: 880, dur: 0.08, type: 'square', gain: 0.06, slide: -400 });
  }

  hit() {
    this.tone({ freq: 220, dur: 0.1, type: 'sawtooth', gain: 0.07, slide: -80 });
  }

  mother() {
    this.tone({ freq: 392, dur: 0.18, type: 'triangle', gain: 0.08 });
    setTimeout(() => this.tone({ freq: 523, dur: 0.2, type: 'triangle', gain: 0.07 }), 120);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone({ freq: f, dur: 0.18, type: 'triangle', gain: 0.08 }), i * 110);
    });
  }

  lose() {
    this.tone({ freq: 180, dur: 0.35, type: 'sawtooth', gain: 0.08, slide: -100 });
  }

  headbutt() {
    this.tone({ freq: 90, dur: 0.25, type: 'square', gain: 0.1, slide: -40 });
  }

  roar() {
    this.tone({ freq: 110, dur: 0.4, type: 'sawtooth', gain: 0.09, slide: -55 });
    setTimeout(() => this.tone({ freq: 70, dur: 0.28, type: 'square', gain: 0.07, slide: -20 }), 90);
  }

  collect() {
    this.tone({ freq: 740, dur: 0.1, type: 'triangle', gain: 0.06, slide: 220 });
  }

  alarm() {
    // Alarm-bell style chirps matching the store “alarm is ringing” beat
    [880, 660, 880, 660].forEach((f, i) => {
      setTimeout(() => this.tone({ freq: f, dur: 0.12, type: 'square', gain: 0.07 }), i * 140);
    });
  }

  countdown() {
    this.tone({ freq: 523, dur: 0.12, type: 'triangle', gain: 0.07 });
  }

  go() {
    this.tone({ freq: 784, dur: 0.18, type: 'triangle', gain: 0.08, slide: 120 });
  }

  squeal() {
    this.tone({ freq: 980, dur: 0.14, type: 'triangle', gain: 0.06, slide: 180 });
    setTimeout(() => this.tone({ freq: 1200, dur: 0.1, type: 'sine', gain: 0.05, slide: -200 }), 70);
  }

  unlock() {
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this.tone({ freq: f, dur: 0.12, type: 'triangle', gain: 0.07 }), i * 90);
    });
  }

  /** Stamp book fanfare when a rescue unlocks encyclopedia pages. */
  stamp() {
    [392, 523, 659, 784, 988].forEach((f, i) => {
      setTimeout(() => this.tone({ freq: f, dur: 0.14, type: 'triangle', gain: 0.075 }), i * 85);
    });
  }

  boost() {
    this.tone({ freq: 440, dur: 0.1, type: 'sawtooth', gain: 0.05, slide: 260 });
  }

  nearMiss() {
    this.tone({ freq: 990, dur: 0.12, type: 'triangle', gain: 0.07, slide: 140 });
    setTimeout(() => this.tone({ freq: 1320, dur: 0.1, type: 'sine', gain: 0.05 }), 80);
  }

  /** Short Guard radio beep for mission chatter */
  radio() {
    this.tone({ freq: 620, dur: 0.05, type: 'square', gain: 0.045 });
    setTimeout(() => this.tone({ freq: 780, dur: 0.07, type: 'square', gain: 0.04 }), 55);
  }

  /** Perfect rescue fanfare */
  perfect() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      setTimeout(() => this.tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.08 }), i * 95);
    });
  }

  /** Rainforest thunder rumble */
  thunder() {
    this.tone({ freq: 55, dur: 0.45, type: 'sawtooth', gain: 0.09, slide: -25 });
    setTimeout(() => this.tone({ freq: 40, dur: 0.35, type: 'square', gain: 0.06, slide: -15 }), 120);
  }

  /** Submarine sonar ping */
  sonar() {
    this.tone({ freq: 880, dur: 0.08, type: 'sine', gain: 0.05, slide: -180 });
    setTimeout(() => this.tone({ freq: 660, dur: 0.12, type: 'sine', gain: 0.035, slide: -120 }), 70);
  }

  /** Baby SOS distress chirp */
  sos() {
    this.tone({ freq: 1100, dur: 0.1, type: 'square', gain: 0.055, slide: 80 });
    setTimeout(() => this.tone({ freq: 1320, dur: 0.1, type: 'square', gain: 0.05, slide: -160 }), 110);
  }

  /** Ink stamp thud when encyclopedia stamp lands */
  inkStamp() {
    this.tone({ freq: 180, dur: 0.1, type: 'triangle', gain: 0.07, slide: -40 });
    setTimeout(() => this.tone({ freq: 320, dur: 0.08, type: 'sine', gain: 0.05 }), 60);
  }

  /** Jeep / submarine horn when siren boost engages */
  horn() {
    this.tone({ freq: 220, dur: 0.16, type: 'square', gain: 0.07, slide: -20 });
    setTimeout(() => this.tone({ freq: 280, dur: 0.14, type: 'square', gain: 0.06, slide: -30 }), 90);
  }

  /** Combo milestone fanfare (x5 / x10) */
  combo(n = 5) {
    const base = n >= 10 ? [523, 659, 784, 988] : [440, 554, 659];
    base.forEach((f, i) => {
      setTimeout(() => this.tone({ freq: f, dur: 0.1, type: 'triangle', gain: 0.065 }), i * 70);
    });
  }

  /** Soft thank-you chime with baby hearts */
  hearts() {
    [659, 784, 988].forEach((f, i) => {
      setTimeout(() => this.tone({ freq: f, dur: 0.12, type: 'sine', gain: 0.05 }), i * 90);
    });
  }

  /** Water splash when the Guard surges through ocean / swamp */
  splash() {
    this.tone({ freq: 240, dur: 0.08, type: 'triangle', gain: 0.045, slide: -80 });
    setTimeout(() => this.tone({ freq: 180, dur: 0.1, type: 'sine', gain: 0.035, slide: -40 }), 40);
  }

  /** Fossil pickup chime (paleontology collectible) */
  fossil() {
    this.tone({ freq: 520, dur: 0.1, type: 'triangle', gain: 0.055, slide: 120 });
    setTimeout(() => this.tone({ freq: 780, dur: 0.12, type: 'sine', gain: 0.045 }), 80);
  }

  /** Stamp book page-flip rustle */
  pageFlip() {
    this.tone({ freq: 420, dur: 0.05, type: 'sawtooth', gain: 0.03, slide: -160 });
    setTimeout(() => this.tone({ freq: 280, dur: 0.06, type: 'triangle', gain: 0.025, slide: -80 }), 40);
  }

  /** Amber gem collectible chime */
  amber() {
    this.tone({ freq: 640, dur: 0.09, type: 'triangle', gain: 0.055, slide: 90 });
    setTimeout(() => this.tone({ freq: 860, dur: 0.11, type: 'sine', gain: 0.045 }), 70);
  }

  /** Baby chirp during escort */
  chirp() {
    this.tone({ freq: 880, dur: 0.07, type: 'sine', gain: 0.04, slide: 120 });
    setTimeout(() => this.tone({ freq: 1040, dur: 0.06, type: 'triangle', gain: 0.03 }), 50);
  }

  /** Stamp photo-flash shutter click */
  photoFlash() {
    this.tone({ freq: 180, dur: 0.04, type: 'square', gain: 0.04 });
    setTimeout(() => this.tone({ freq: 920, dur: 0.05, type: 'sine', gain: 0.035 }), 30);
  }

  /** Soft stun twinkle when predator retreats */
  stun() {
    [740, 980, 1180].forEach((f, i) => {
      setTimeout(() => this.tone({ freq: f, dur: 0.07, type: 'triangle', gain: 0.04 }), i * 55);
    });
  }

  ui() {
    this.tone({ freq: 660, dur: 0.06, type: 'triangle', gain: 0.05 });
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stopAmbient();
    return this.enabled;
  }
}
