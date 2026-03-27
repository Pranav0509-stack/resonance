/**
 * RESONANT SOLVER — Real-Time Audio Engine
 *
 * Continuous playback. Each variable is one oscillator.
 * Sound parameters update every frame from the optimizer.
 *
 * Signal chain per voice:
 *   OscillatorNode (sine) → GainNode (amplitude from E(x))
 *                     ↘ LFO (vibrato from ∇E)
 *   NoiseSource → GainNode (noise from E(x)) → merger
 *
 * All sound parameters are DERIVED from:
 *   frequency   ← variable value x
 *   amplitude   ← exp(-E(x))
 *   vibrato     ← |∂E/∂x|
 *   noise       ← E(x)
 */

export class ResonantAudio {
  constructor() {
    this.ctx = null;
    this.voices = [];       // One per variable
    this.noiseNode = null;
    this.noiseGain = null;
    this.masterGain = null;
    this.analyser = null;
    this.running = false;
    this._initialized = false;
  }

  async init(numVoices) {
    if (this._initialized) {
      // Rebuild if voice count changed
      if (this.voices.length !== numVoices) {
        this.stop();
        this._initialized = false;
      } else {
        return;
      }
    }

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    const t = this.ctx.currentTime;

    // Master output
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.4, t);
    this.masterGain.connect(this.ctx.destination);

    // Analyser for visualization
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.4;
    this.analyser.connect(this.masterGain);

    // Noise source (shared white noise buffer)
    const bufLen = this.ctx.sampleRate * 2;
    const noiseBuf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuf;
    this.noiseNode.loop = true;

    // Noise gain (controlled by error)
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0, t);
    this.noiseNode.connect(this.noiseGain);
    this.noiseGain.connect(this.analyser);
    this.noiseNode.start();

    // Create one voice per variable
    this.voices = [];
    for (let i = 0; i < numVoices; i++) {
      const voice = this._createVoice(t, i, numVoices);
      this.voices.push(voice);
    }

    this._initialized = true;
  }

  _createVoice(t, index, total) {
    // Main oscillator (sine — pure tone)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);

    // Vibrato LFO — modulates frequency based on gradient
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5, t);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0, t);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    // Voice gain (controlled by error → amplitude)
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    osc.connect(gain);

    // Stereo panning — spread voices across stereo field
    const panner = this.ctx.createStereoPanner();
    if (total > 1) {
      panner.pan.setValueAtTime(-1 + (2 * index) / (total - 1), t);
    } else {
      panner.pan.setValueAtTime(0, t);
    }
    gain.connect(panner);
    panner.connect(this.analyser);

    osc.start();

    return { osc, lfo, lfoGain, gain, panner };
  }

  /**
   * Update all sound parameters from solver state.
   * Called every frame — must be fast.
   *
   * @param {Object} params - From solver.getSoundParams()
   */
  update(params) {
    if (!this._initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    const ramp = 0.03; // 30ms ramp to avoid clicks

    for (let i = 0; i < this.voices.length && i < params.frequencies.length; i++) {
      const v = this.voices[i];

      // Frequency ← variable value
      const freq = Math.max(20, Math.min(2000, params.frequencies[i]));
      v.osc.frequency.cancelScheduledValues(t);
      v.osc.frequency.setValueAtTime(v.osc.frequency.value, t);
      v.osc.frequency.linearRampToValueAtTime(freq, t + ramp);

      // Amplitude ← exp(-error)
      const amp = Math.max(0, Math.min(0.8, params.amplitudes[i]));
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setValueAtTime(v.gain.gain.value, t);
      v.gain.gain.linearRampToValueAtTime(amp, t + ramp);

      // Vibrato depth ← gradient magnitude
      const vib = Math.max(0, Math.min(80, params.vibratos[i]));
      v.lfoGain.gain.cancelScheduledValues(t);
      v.lfoGain.gain.setValueAtTime(v.lfoGain.gain.value, t);
      v.lfoGain.gain.linearRampToValueAtTime(vib, t + ramp);
    }

    // Global noise level ← error
    if (this.noiseGain) {
      const noise = Math.max(0, Math.min(0.5, params.noises[0] * 0.3));
      this.noiseGain.gain.cancelScheduledValues(t);
      this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, t);
      this.noiseGain.gain.linearRampToValueAtTime(noise, t + ramp);
    }
  }

  /**
   * Set master volume.
   */
  setVolume(v) {
    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      this.masterGain.gain.linearRampToValueAtTime(v, t + 0.05);
    }
  }

  /**
   * Play a convergence celebration — a bright major chord bloom.
   */
  celebrate() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const ratios = [1, 5/4, 3/2, 2]; // Major chord — mathematically simplest consonance
    ratios.forEach((r, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 440 * r;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      o.connect(g);
      g.connect(this.analyser);
      o.start(t);
      o.stop(t + 1.6);
    });
  }

  /**
   * Get analyser node for waveform/FFT visualization.
   */
  getAnalyser() {
    return this.analyser;
  }

  stop() {
    this.voices.forEach(v => {
      try { v.osc.stop(); } catch(e) {}
      try { v.lfo.stop(); } catch(e) {}
    });
    try { this.noiseNode?.stop(); } catch(e) {}
    this.voices = [];
    this.running = false;
    this._initialized = false;
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
