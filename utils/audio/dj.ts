// The in-house DJ — a procedural club loop synthesized with the Web Audio
// API plus the announcer voice (Web Speech API). No audio files, no
// licensing, no payload. Kick, hats, and a walking bassline at 128 BPM.
// Module-level singleton so the DJ survives navigation from the match
// overlay into the song chat.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let playing = false;
let muted = false;
let loopTimer: ReturnType<typeof setInterval> | null = null;

const STEP = 60 / 128 / 2; // eighth notes at 128 BPM
// A-minor walking bass: A A C A G G C A
const BASS_LINE = [55, 55, 65.41, 55, 49, 49, 65.41, 55];

function ensureCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.25;
    master.connect(ctx.destination);
  }
  return ctx;
}

function kick(t: number) {
  const o = ctx!.createOscillator();
  const g = ctx!.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g);
  g.connect(master!);
  o.start(t);
  o.stop(t + 0.2);
}

function hat(t: number, open = false) {
  const src = ctx!.createBufferSource();
  const buf = ctx!.createBuffer(1, ctx!.sampleRate * 0.08, ctx!.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  }
  src.buffer = buf;
  const g = ctx!.createGain();
  g.gain.setValueAtTime(open ? 0.25 : 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.2 : 0.05));
  src.connect(g);
  g.connect(master!);
  src.start(t);
}

function bass(t: number, freq: number, dur: number) {
  const o = ctx!.createOscillator();
  const g = ctx!.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.16, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function stepAt(step: number) {
  const t = ctx!.currentTime + step * STEP;
  if (step % 4 === 0) kick(t);
  if (step % 2 === 0) hat(t);
  if (step % 8 === 6) hat(t, true);
  bass(t, BASS_LINE[step % 8], STEP * 1.8);
}

/** Must be called from a user gesture (pick click) to unlock audio. */
export function unlockDJ() {
  const c = ensureCtx();
  if (c.state === 'suspended') void c.resume();
}

export function startDJ() {
  const c = ensureCtx();
  if (playing) return;
  playing = true;
  let step = 0;
  loopTimer = setInterval(() => {
    stepAt(step++);
    if (step >= 64) step = 0;
  }, STEP * 1000);
  void c.resume();
}

export function stopDJ() {
  if (loopTimer) clearInterval(loopTimer);
  loopTimer = null;
  playing = false;
}

/** The overhead announcement, straight from the booth. */
export function announce(lines: string[], onDone?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onDone?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const queue = [...lines];

  const speakNext = () => {
    const line = queue.shift();
    if (!line) {
      onDone?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(line);
    u.rate = 0.95;
    u.pitch = 1.05;
    u.volume = 1;
    const voices = synth.getVoices();
    const en = voices.find(
      (v) => v.lang.startsWith('en') && v.localService
    );
    if (en) u.voice = en;
    u.onend = speakNext;
    u.onerror = speakNext;
    synth.speak(u);
  };

  speakNext();
}

/** Music up — the drop. */
export function bumpDJ() {
  if (master && ctx) {
    master.gain.setTargetAtTime(0.32, ctx.currentTime, 0.05);
  }
}

export function toggleDJ(): boolean {
  muted = !muted;
  if (master && ctx) {
    master.gain.setTargetAtTime(muted ? 0 : 0.25, ctx.currentTime, 0.02);
  }
  return muted;
}

export function isDJPlaying() {
  return playing;
}
