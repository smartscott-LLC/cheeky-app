'use client';

import { useEffect, useRef, useState } from 'react';

// The club's house engine — synthesized live in the browser, no samples, no
// licensing. Four-on-the-floor in A minor, the kind of room you walk into
// and immediately want to move. Patterns randomize every phrase so the DJ
// never plays the same loop twice.

const BPM = 124;
const STEP = 60 / BPM / 4; // one 16th note, in seconds
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
  private bassVariant = 0;
  private arpBar = true;

  private ensure() {
    if (this.ctx) return;
    const ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.master.gain.value = 0.42;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.stabBus = ctx.createBiquadFilter();
    this.stabBus.type = 'lowpass';
    this.stabBus.frequency.value = 2600;
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
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    g.gain.setValueAtTime(0.9 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g);
    g.connect(this.master!);
    o.start(t);
    o.stop(t + 0.26);
  }

  private clap(t: number, v: number) {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise!;
    const bp = this.ctx!.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.9;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.55 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    s.connect(bp);
    bp.connect(g);
    g.connect(this.master!);
    s.start(t);
    s.stop(t + 0.2);
  }

  private hat(t: number, v: number, open = false) {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise!;
    const hp = this.ctx!.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.28 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.28 : 0.05));
    s.connect(hp);
    hp.connect(g);
    g.connect(this.master!);
    s.start(t);
    s.stop(t + 0.32);
  }

  private bass(t: number, f: number, v: number) {
    const o = this.ctx!.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const lp = this.ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 3;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4 * v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.master!);
    o.start(t);
    o.stop(t + 0.22);
  }

  private stab(t: number, notes: number[], v: number) {
    notes.forEach((f) => {
      const o = this.ctx!.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14 * v, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g);
      g.connect(this.stabBus!);
      o.start(t);
      o.stop(t + 0.26);
    });
  }

  private pluck(t: number, f: number, v: number) {
    const o = this.ctx!.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const lp = this.ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12 * v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.stabBus!);
    o.start(t);
    o.stop(t + 0.2);
  }

  private playStep(step: number, t: number) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = CHORDS[bar % 4];
    const fill = this.cycle % 2 === 1 && bar === 3;

    // Kick — four on the floor; the fill rolls the last beat over.
    if (s % 4 === 0 && !(fill && s === 12)) this.kick(t, this.hu());

    // Fill: 16th claps rolling into the next phrase, open hat to land it.
    if (fill) {
      if (s >= 8 && s < 15) this.clap(t, s % 2 === 0 ? 0.4 : 0.75);
      if (s === 15) this.hat(t, 0.5, true);
      return;
    }

    // Claps on 2 & 4 — the hands in the air.
    if (s === 4 || s === 12) this.clap(t, 0.85 * this.hu());

    // Hats — driving 8ths, ghost 16ths on the hot variant.
    if (s % 2 === 0) this.hat(t, 0.5 * this.hu());
    if (this.hatVariant === 1 && (s === 7 || s === 15)) this.hat(t, 0.35 * this.hu());
    if (s === 14) this.hat(t, 0.35 * this.hu(), this.hatVariant === 2);

    // Bass — 8ths on the root, octave pop on the offbeat.
    if (s % 2 === 0) {
      const oct = this.bassVariant === 1 && (s === 6 || s === 14) ? 2 : 1;
      this.bass(t, chord.bass * oct, this.hu());
    }

    // Stabs — the chord on the 1, and on the 3 when the room's hot.
    if (s === 0) this.stab(t, chord.notes, 1);
    else if (s === 8 && this.hatVariant === 2) this.stab(t, chord.notes, 0.7);

    // Arp — a bright 16th hook every other bar, the DJ's little wink.
    if (this.arpBar && s % 4 === 0) {
      this.pluck(t, chord.notes[(s / 4) % 3] * 2, 0.9);
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
        // Fresh pattern per phrase — the DJ is never on repeat.
        this.hatVariant = Math.random() < 0.5 ? 1 : 2;
        this.bassVariant = Math.random() < 0.4 ? 1 : 0;
        this.arpBar = Math.random() < 0.6;
        this.sweep();
      }
    }
  }

  private sweep() {
    const t = this.ctx!.currentTime;
    this.stabBus!.frequency.cancelScheduledValues(t);
    this.stabBus!.frequency.setValueAtTime(400, t);
    this.stabBus!.frequency.exponentialRampToValueAtTime(3200, t + 0.5);
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
      this.bassVariant = 0;
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
