export class AudioSystem {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.enabled = true;
    this.lastFootstep = 0;

    window.addEventListener(
      "pointerdown",
      () => {
        this.ensureContext();
      },
      { once: true }
    );
  }

  ensureContext() {
    if (this.context) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.14;
    this.masterGain.connect(this.context.destination);
  }

  tone({ frequency = 220, duration = 0.08, type = "sine", gain = 0.2, slideTo = null }) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise({ duration = 0.08, gain = 0.12, filter = 900 }) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.context || !this.masterGain) return;

    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    const bandpass = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    source.buffer = buffer;
    bandpass.type = "bandpass";
    bandpass.frequency.value = filter;
    envelope.gain.value = gain;
    source.connect(bandpass);
    bandpass.connect(envelope);
    envelope.connect(this.masterGain);
    source.start();
  }

  shoot(weapon) {
    if (weapon.role.includes("sniper") || weapon.role.includes("marksman")) {
      this.tone({ frequency: 95, duration: 0.15, type: "sawtooth", gain: 0.28, slideTo: 45 });
      this.noise({ duration: 0.11, gain: 0.16, filter: 620 });
    } else if (weapon.role.includes("shotgun")) {
      this.tone({ frequency: 72, duration: 0.14, type: "square", gain: 0.3, slideTo: 38 });
      this.noise({ duration: 0.16, gain: 0.2, filter: 480 });
    } else if (weapon.role.includes("machine")) {
      this.tone({ frequency: 102, duration: 0.075, type: "square", gain: 0.23, slideTo: 70 });
      this.noise({ duration: 0.075, gain: 0.14, filter: 820 });
    } else if (weapon.role.includes("sidearm")) {
      this.tone({ frequency: 180, duration: 0.065, type: "triangle", gain: 0.18, slideTo: 118 });
      this.noise({ duration: 0.045, gain: 0.08, filter: 1400 });
    } else {
      this.tone({ frequency: 132, duration: 0.065, type: "square", gain: 0.2, slideTo: 92 });
      this.noise({ duration: 0.055, gain: 0.11, filter: 1150 });
    }
  }

  botShoot() {
    this.tone({ frequency: 118, duration: 0.045, type: "square", gain: 0.08, slideTo: 80 });
  }

  reload() {
    this.tone({ frequency: 240, duration: 0.08, type: "triangle", gain: 0.08, slideTo: 180 });
    window.setTimeout(() => {
      this.tone({ frequency: 430, duration: 0.06, type: "triangle", gain: 0.06, slideTo: 360 });
    }, 190);
  }

  hit() {
    this.tone({ frequency: 720, duration: 0.045, type: "sine", gain: 0.1, slideTo: 500 });
  }

  damage() {
    this.tone({ frequency: 80, duration: 0.12, type: "sawtooth", gain: 0.12, slideTo: 54 });
  }

  footstep(now, sprinting = false) {
    const interval = sprinting ? 0.28 : 0.42;
    if (now - this.lastFootstep < interval) return;
    this.lastFootstep = now;
    this.noise({ duration: 0.032, gain: sprinting ? 0.09 : 0.055, filter: 180 });
  }
}
