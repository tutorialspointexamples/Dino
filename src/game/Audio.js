/** Lightweight Web Audio SFX — no external assets required. */

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.enabled = true;
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

  ui() {
    this.tone({ freq: 660, dur: 0.06, type: 'triangle', gain: 0.05 });
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}
