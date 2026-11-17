// Neon Harbor — all sound is synthesized live with WebAudio.
// No audio files: engine hum, siren, gunshots, chimes and a synthwave
// music loop are built from oscillators and filtered noise.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicOn = false;
    this.musicTimer = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.muted = false;
    this.step = 0;
  }

  // Must be called from a user gesture (click / key) the first time.
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // Engine: a low sawtooth whose pitch follows speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Siren: a triangle wave wobbling between two tones.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfo.frequency.value = 0.9;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 240;
    this.sirenLfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);
    this.sirenLfo.start();
    this.startMusic();
  }

  setEngine(speed01) {
    if (!this.ctx) return;
    this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(speed01 > 0.02 ? 0.05 + speed01 * 0.05 : 0, this.ctx.currentTime, 0.1);
  }

  setSiren(on) {
    if (!this.ctx) return;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.2);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noiseBurst(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq || 1800;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.4;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  shot() { this.noiseBurst(0.16, 0.5, 2600); this.blip(160, 0.1, 'square', 0.18); }
  enemyShot() { this.noiseBurst(0.12, 0.2, 1400); }
  punch() { this.noiseBurst(0.09, 0.35, 700); }
  chime() { this.blip(880, 0.18, 'sine', 0.25); this.blip(1318, 0.3, 'sine', 0.2); }
  pickup() { this.blip(660, 0.1, 'triangle', 0.22); this.blip(990, 0.16, 'triangle', 0.22); }
  crash() { this.noiseBurst(0.3, 0.5, 500); }
  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.25, 'triangle', 0.25), i * 110));
  }

  // Simple synthwave loop: A-minor bass + arpeggio, scheduled per bar.
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    const bass = [55, 55, 65.41, 49]; // A1 A1 C2 G1
    const arp = [220, 261.63, 329.63, 440, 329.63, 261.63];
    const barMs = 2000;
    const playBar = () => {
      if (!this.ctx || this.muted) { this.step += 1; return; }
      const root = bass[this.step % bass.length];
      this.note(root / 2, barMs / 1000, 'sawtooth', 0.05, 300);
      for (let i = 0; i < 6; i++) {
        setTimeout(() => this.note(arp[(this.step * 2 + i) % arp.length], 0.16, 'square', 0.03, 2400), i * (barMs / 6));
      }
      this.step += 1;
    };
    playBar();
    this.musicTimer = setInterval(playBar, barMs);
  }

  note(freq, dur, type, vol, cutoff) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff || 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}
