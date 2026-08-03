'use client';

import { useEffect, useRef, useState } from 'react';

// The club's house engine — synthesized live in the browser, no samples, no
// licensing. 200 BPM, A minor, built for action: bass-drum gallop
// (1-2-3 / 1-2), snare running just behind it with 4-beat rolls, fast 16th
// hats, and the "t-t-t" hook bursting a fast 12-beat run, then freezing.

const BPM = 200;
const STEP = 60 / BPM / 4; // one 16th note (0.075s at 200 BPM)
const CYCLE_STEPS = 64; // four bars of 16

// A minor — Am, F, C, G. The chords every dance floor knows.
const CHORDS = [
  { bass: 110.0, notes: [220.0, 261.63, 329.63] }, // Am
  { bass: 87.31, notes: [174.61, 220.0, 261.63] }, // F
  { bass: 130.81, notes: [261.63, 329.63, 392.0] }, // C
  { bass: 98.0, notes: [196.0, 246.94, 293.66] } // G
];

class ClubBeatEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private stabBus: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private cycle = 0;
  private started = false;
  private hatVariant = 1;
  private arpBar = true;

  private ensure() {
    if (this.ctx) return;
    const ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    this.master = ctx.createGain();
    this.master.gain.value = 0.36;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.stabBus = ctx.createBiquadFilter();
    this.stabBus.type = 'lowpass';
    this.stabBus.frequency.value = 2400;
    this.stabBus.connect(this.master);
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.ctx = ctx;
  }

  private hu() {
    return 0.92 + Math.random() * 0.16;
  }

  private kick(t: number, v: number) {
    const o = this.ctx!.createOscillator();
    const g = this.ctx!.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.08);
    g.gain.setValueAtTime(0.9 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g);
    g.connect(this.master!);
    o.start(t);
    o.stop(t + 0.16);
  }

  private snare(t: number, v: number) {
    // Body + crack: a low thump under a bandpassed snap.
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise!;
    const bp = this.ctx!.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 1;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.5 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    s.connect(bp);
    bp.connect(g);
    g.connect(this.master!);
    s.start(t);
    s.stop(t + 0.15);
  }

  private hat(t: number, v: number, open = false) {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise!;
    const hp = this.ctx!.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7800;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.24 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.22 : 0.04));
    s.connect(hp);
    hp.connect(g);
    g.connect(this.master!);
    s.start(t);
    s.stop(t + 0.26);
  }

  private crash(t: number) {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise!;
    const hp = this.ctx!.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5200;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    s.connect(hp);
    hp.connect(g);
    g.connect(this.master!);
    s.start(t);
    s.stop(t + 0.55);
  }

  private bass(t: number, f: number, v: number) {
    const o = this.ctx!.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const lp = this.ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 460;
    lp.Q.value = 3;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.36 * v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.master!);
    o.start(t);
    o.stop(t + 0.13);
  }

  private stab(t: number, notes: number[], v: number) {
    notes.forEach((f) => {
      const o = this.ctx!.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11 * v, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g);
      g.connect(this.stabBus!);
      o.start(t);
      o.stop(t + 0.15);
    });
  }

  private pluck(t: number, f: number, v: number) {
    const o = this.ctx!.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const lp = this.ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09 * v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.stabBus!);
    o.start(t);
    o.stop(t + 0.12);
  }

  private playStep(step: number, t: number) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = CHORDS[bar % 4];
    const sIdx = [0, 2, 4, 8, 10, 14].indexOf(s);

    // Bass drum — the gallop: 1, 2, 3 — 1, 2 — and the pickup in.
    if (sIdx !== -1) this.kick(t, sIdx === 5 ? 0.95 : this.hu());

    // Snare — running just behind the bass drum, with the 4-beat rolls.
    if (s === 1 || s === 3) this.snare(t, 0.75 * this.hu());
    if (bar % 2 === 0) {
      if (s >= 8 && s <= 11) this.snare(t, 0.55 * this.hu()); // 1,2,3,4
    } else if (s >= 12 && s <= 15) {
      this.snare(t, 0.55 * this.hu()); // the second 1,2,3,4
    }

    // Hats — fast 16ths, the downbeats hit harder.
    if (s % 2 === 1) this.hat(t, s % 4 === 3 ? 0.6 : 0.34);
    if (s === 14 && this.hatVariant === 2) this.hat(t, 0.4, true);

    // Bass — 8ths on the root, popping up where the gallop lands.
    if (s % 2 === 0) {
      const oct = s === 4 || s === 12 ? 2 : 1;
      this.bass(t, chord.bass * oct, this.hu());
    }

    // Stabs — the chord on the 1, and on the 3 when the room's hot.
    if (s === 0) this.stab(t, chord.notes, 0.9);
    else if (s === 8 && this.hatVariant === 2) this.stab(t, chord.notes, 0.6);

    // The "t-t-t" hook — a fast 12-beat run, then it freezes.
    if (this.arpBar && bar === 0 && s < 12) {
      const idx = [0, 1, 2, 2][s % 4];
      this.pluck(t, chord.notes[idx] * 2, 0.85 * this.hu());
    }
  }

  private schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.nextTime === 0) this.nextTime = this.ctx.currentTime + 0.06;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step++;
      if (this.step === CYCLE_STEPS) {
        this.step = 0;
        this.cycle++;
        // Fresh pattern per phrase — plus the crash on the 1.
        this.hatVariant = Math.random() < 0.5 ? 1 : 2;
        this.arpBar = Math.random() < 0.75;
        this.crash(this.nextTime);
        this.sweep();
      }
    }
  }

  private sweep() {
    const t = this.ctx!.currentTime;
    this.stabBus!.frequency.cancelScheduledValues(t);
    this.stabBus!.frequency.setValueAtTime(500, t);
    this.stabBus!.frequency.exponentialRampToValueAtTime(3000, t + 0.4);
  }

  private tick = () => this.schedule();

  start() {
    this.ensure();
    const ctx = this.ctx!;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!this.started) {
      this.nextTime = 0;
      this.step = 0;
      this.cycle = 0;
      this.hatVariant = 1;
      this.arpBar = true;
      this.started = true;
      this.timer = setInterval(this.tick, 25);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.started = false;
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }
}

/**
 * The house DJ — a speaker button in the bottom-left, on every page from
 * touchdown. The music is synthesized in the browser (no files, no rights);
 * browsers only let sound start after a user gesture, so the floor comes
 * alive on their first click or tap anywhere.
 */
export default function ClubAudio() {
  const [muted, setMuted] = useState(false);
  const engineRef = useRef<ClubBeatEngine | null>(null);

  useEffect(() => {
    const isMuted = window.localStorage.getItem('club-audio-muted') === '1';
    setMuted(isMuted);
    if (isMuted) return;

    const engine = new ClubBeatEngine();
    engineRef.current = engine;
    engine.start();

    // First interaction anywhere starts the music (browser autoplay rule).
    const startOnInteraction = () => {
      engineRef.current?.start();
    };
    window.addEventListener('pointerdown', startOnInteraction, { once: true });
    window.addEventListener('keydown', startOnInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', startOnInteraction);
      window.removeEventListener('keydown', startOnInteraction);
      engine.stop();
    };
  }, []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    window.localStorage.setItem('club-audio-muted', next ? '1' : '0');
    if (!engineRef.current) {
      if (!next) {
        engineRef.current = new ClubBeatEngine();
        engineRef.current.start();
      }
      return;
    }
    if (next) {
      engineRef.current.stop();
    } else {
      engineRef.current.start();
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={muted ? 'Turn on the club music' : 'Turn off the club music'}
      title="The DJ is on the decks"
      className={`fixed bottom-5 left-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border text-lg transition hover:scale-105 ${
        muted
          ? 'border-zinc-700 bg-zinc-900 text-zinc-500'
          : 'border-club/60 bg-zinc-900 text-club shadow-[0_0_16px_rgba(255,45,155,0.35)]'
      }`}
    >
      {muted ? '🔇' : '🎧'}
      {!muted && (
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-club opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-club" />
        </span>
      )}
    </button>
  );
}
