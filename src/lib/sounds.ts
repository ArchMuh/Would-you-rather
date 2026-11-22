import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { useSettings } from '../store/settings';

// Generated locally (see tools/make_sfx.py) — no third-party audio licenses.
const SOURCES = {
  tap: require('../../assets/sfx/tap.wav'),
  select: require('../../assets/sfx/select.wav'),
  reveal: require('../../assets/sfx/reveal.wav'),
  win: require('../../assets/sfx/win.wav'),
  whoosh: require('../../assets/sfx/whoosh.wav'),
  music: require('../../assets/sfx/music.wav'),
} as const;

export type SfxName = Exclude<keyof typeof SOURCES, 'music'>;

const players: Partial<Record<keyof typeof SOURCES, AudioPlayer>> = {};
let musicStarted = false;

function player(name: keyof typeof SOURCES): AudioPlayer | null {
  try {
    if (!players[name]) {
      players[name] = createAudioPlayer(SOURCES[name]);
    }
    return players[name]!;
  } catch {
    return null;
  }
}

export async function initAudio() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
  } catch {
    // audio unavailable: app stays fully usable
  }
}

export function playSfx(name: SfxName) {
  if (!useSettings.getState().sounds) return;
  const p = player(name);
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {
    // ignore
  }
}

export function startMusic() {
  if (musicStarted || !useSettings.getState().music) return;
  const p = player('music');
  if (!p) return;
  try {
    p.loop = true;
    p.volume = 0.35;
    p.play();
    musicStarted = true;
  } catch {
    // ignore
  }
}

export function stopMusic() {
  const p = players.music;
  if (p) {
    try {
      p.pause();
    } catch {
      // ignore
    }
  }
  musicStarted = false;
}

/** Call when the music setting flips. */
export function syncMusic() {
  if (useSettings.getState().music) startMusic();
  else stopMusic();
}
