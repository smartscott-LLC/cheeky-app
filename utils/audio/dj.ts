// The in-house DJ — a procedural club loop synthesized with the Web Audio
// API plus the announcer voice (Web Speech API), now also plays the founder's
// MP3 tracks (Club Cheeky, Pressure Gauge, Solar Flare Summit, etc.) with
// smooth crossfades. Kick, hats, and walking bassline at 128 BPM layered
// beneath the tracks at reduced volume. Module-level singleton so the DJ
// survives navigation from the match overlay into the song chat.

import { ASSETS } from '@/utils/assets';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let playing = false;
let muted = false;
let loopTimer: ReturnType<typeof setInterval> | null = null;

// Founder's tracks — MP3s from CDN, crossfaded with smooth transitions
const TRACKS = [
  ASSETS.audio.clubCheeky,
  ASSETS.audio.pressureGauge,
  ASSETS.audio.solarFlareSummit,
  ASSETS.audio.aboveTheClouds,
  ASSETS.audio.finalAscent
];

// Crossfade timing (milliseconds)
const CROSSFADE_MS = 3000;

// Procedural music settings
const STEP = 60 / 128 / 2; // eighth notes at 128 BPM
// A-minor walking bass: A A C A G G C A
const BASS_LINE = [55, 55, 65.41, 55, 49, 49, 65.41, 55];

// Track player state
let tracks: HTMLAudioElement[] = [];
let currentTrackIndex = 0;
let trackGainNodes: GainNode[] = [];
let crossfadeTimer: ReturnType<typeof setTimeout> | null = null;
let trackScheduledEnd = 0;

function ensureCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.45;
    master.connect(ctx.destination);
  }
  return ctx;
}

function initTracks() {
  if (tracks.length > 0) return;
  tracks = TRACKS.map((src) => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = 'auto';
    // Use MediaElementSource to connect HTML5 audio to Web Audio API
    const mediaSource = ctx!.createMediaElementSource(audio);
    const gain = ctx!.createGain();
    gain.gain.value = 0;
    mediaSource.connect(gain);
    gain.connect(master!);
    trackGainNodes.push(gain);
    return audio;
  });
}

function startTrack(index: number) {
  // Stop all other tracks
  tracks.forEach((track, i) => {
    if (i !== index) {
      track.pause();
      trackGainNodes[i].gain.setValueAtTime(0, ctx!.currentTime);
    }
  });

  // Start the new track
  const track = tracks[index];
  track.currentTime = 0;
  trackGainNodes[index].gain.cancelScheduledValues(ctx!.currentTime);
  trackGainNodes[index].gain.setValueAtTime(0, ctx!.currentTime);
  trackGainNodes[index].gain.linearRampToValueAtTime(0.5, ctx!.currentTime + 0.5);

  void track.play();
  currentTrackIndex = index;
  trackScheduledEnd = Date.now() + (track.duration || 180) * 1000;

  // Schedule crossfade to next track
  scheduleNextTrack();
}

function scheduleNextTrack() {
  if (crossfadeTimer) clearTimeout(crossfadeTimer);

  const timeUntilEnd = trackScheduledEnd - Date.now();
  const crossfadeStart = Math.max(0, timeUntilEnd - CROSSFADE_MS);

  crossfadeTimer = setTimeout(() => {
    crossfadeToNextTrack();
  }, crossfadeStart);
}

function crossfadeToNextTrack() {
  if (!playing || !ctx) return;

  const fromIndex = currentTrackIndex;
  let toIndex = (fromIndex + 1) % tracks.length;

  // Pick a different random track sometimes
  if (Math.random() < 0.7 && tracks.length > 2) {
    toIndex = Math.floor(Math.random() * tracks.length);
    if (toIndex === fromIndex) toIndex = (fromIndex + 1) % tracks.length;
  }

  const t = ctx.currentTime;
  const fadeDuration = CROSSFADE_MS / 1000;

  // Fade out current track
  trackGainNodes[fromIndex].gain.setTargetAtTime(0, t, fadeDuration / 3);

  // Fade in next track
  tracks[toIndex].currentTime = 0;
  trackGainNodes[toIndex].gain.setValueAtTime(0, t);
  trackGainNodes[toIndex].gain.linearRampToValueAtTime(0.5, t + fadeDuration);

  void tracks[toIndex].play();

  currentTrackIndex = toIndex;
  trackScheduledEnd = Date.now() + (tracks[toIndex].duration || 180) * 1000;

  // Schedule next crossfade
  scheduleNextTrack();
}

function stopAllTracks() {
  if (crossfadeTimer) clearTimeout(crossfadeTimer);
  crossfadeTimer = null;

  tracks.forEach((track) => {
    track.pause();
    track.currentTime = 0;
  });

  trackGainNodes.forEach((gain) => {
    gain.gain.setValueAtTime(0, ctx!.currentTime);
  });
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

  // Initialize tracks
  initTracks();

  // Start procedural loop
  let step = 0;
  loopTimer = setInterval(() => {
    stepAt(step++);
    if (step >= 64) step = 0;
  }, STEP * 1000);

  // Start first track
  currentTrackIndex = Math.floor(Math.random() * tracks.length);
  startTrack(currentTrackIndex);

  void c.resume();
}

export function stopDJ() {
  if (loopTimer) clearInterval(loopTimer);
  loopTimer = null;
  playing = false;
  stopAllTracks();
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
    const en = voices.find((v) => v.lang.startsWith('en') && v.localService);
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
    master.gain.setTargetAtTime(0.6, ctx.currentTime, 0.05);
  }
}

export function toggleDJ(): boolean {
  muted = !muted;
  if (master && ctx) {
    master.gain.setTargetAtTime(muted ? 0 : 0.45, ctx.currentTime, 0.02);
  }
  return muted;
}

export function isDJPlaying() {
  return playing;
}
