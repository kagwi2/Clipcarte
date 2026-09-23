import { MusicTrack } from '../types';

/**
 * Curated library of trending royalty-free background music tracks for viral clips.
 */
export const CURATED_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'lofi-sunset',
    title: 'Sunset Coffee (Lo-Fi)',
    artist: 'ChillHop Vibes',
    genre: 'lofi',
    bpm: 84,
    duration: 16,
    mood: 'Relaxed, Nostalgic, Warm',
    gradient: 'from-amber-500 via-orange-600 to-rose-700',
  },
  {
    id: 'dark-phonk',
    title: 'Tokyo Drift (Brazilian Phonk)',
    artist: 'NightRider 808',
    genre: 'phonk',
    bpm: 130,
    duration: 14.7,
    mood: 'Aggressive, High-Energy, Viral',
    gradient: 'from-red-600 via-purple-700 to-zinc-900',
  },
  {
    id: 'cinematic-tension',
    title: 'Mind Hunter (Suspense)',
    artist: 'Aethelgard Scores',
    genre: 'cinematic',
    bpm: 100,
    duration: 16,
    mood: 'Dark, Mysterious, Dramatic',
    gradient: 'from-zinc-800 via-slate-800 to-amber-900',
  },
  {
    id: 'cyber-synthwave',
    title: 'Neon Skyline (Synthwave)',
    artist: 'Retrowave Grid',
    genre: 'synthwave',
    bpm: 122,
    duration: 15.7,
    mood: 'Futuristic, Driving, Nostalgic',
    gradient: 'from-fuchsia-600 via-pink-600 to-cyan-500',
  },
  {
    id: 'upbeat-bounce',
    title: 'Creator Pop (Upbeat Trap)',
    artist: 'Sunny Beats Studio',
    genre: 'upbeat',
    bpm: 124,
    duration: 15.4,
    mood: 'Joyful, Inspiring, Bouncy',
    gradient: 'from-emerald-500 via-teal-600 to-sky-600',
  },
  {
    id: 'calm-zen',
    title: 'Ambient Deep Space (Calm)',
    artist: 'Solitude Soundscapes',
    genre: 'ambient',
    bpm: 68,
    duration: 18,
    mood: 'Peaceful, Minimal, Ethereal',
    gradient: 'from-indigo-600 via-blue-700 to-emerald-800',
  },
];

// Audio URL Cache to prevent re-generating same track
const trackUrlCache = new Map<string, string>();

/**
 * Encodes an AudioBuffer into standard 16-bit PCM RIFF WAV format.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave audio channel data
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer (-32768 to 32767)
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Procedurally synthesizes high-quality audio tracks using OfflineAudioContext.
 * Generates rich musical structures: chords, basslines, drums, percussions, and pads.
 */
export async function generateProceduralMusicTrack(trackId: string): Promise<string> {
  if (trackUrlCache.has(trackId)) {
    return trackUrlCache.get(trackId)!;
  }

  const trackDef = CURATED_MUSIC_TRACKS.find((t) => t.id === trackId) || CURATED_MUSIC_TRACKS[0];
  const sampleRate = 44100;
  const duration = trackDef.duration;
  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
    2,
    Math.round(sampleRate * duration),
    sampleRate
  );

  const bpm = trackDef.bpm;
  const beatSec = 60 / bpm;
  const totalBeats = Math.floor(duration / beatSec);

  // Master bus
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.85, 0);

  // Master compressor for punch and loudness balance
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-14, 0);
  compressor.knee.setValueAtTime(10, 0);
  compressor.ratio.setValueAtTime(4, 0);
  compressor.attack.setValueAtTime(0.005, 0);
  compressor.release.setValueAtTime(0.15, 0);

  masterGain.connect(compressor);
  compressor.connect(offlineCtx.destination);

  // Helper note frequencies
  const noteFreq = (note: string, octave: number) => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const semitone = notes.indexOf(note);
    if (semitone === -1) return 440;
    const a4 = 440;
    const n = semitone - 9 + (octave - 4) * 12;
    return a4 * Math.pow(2, n / 12);
  };

  // Helper: Play Kick Drum
  const playKick = (time: number, decay = 0.28, lowFreq = 48) => {
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    osc.type = 'sine';

    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(lowFreq, time + 0.08);

    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + decay);
  };

  // Helper: Play Snare / Clap
  const playSnare = (time: number, isClap = false) => {
    // Noise buffer
    const bufferSize = Math.round(offlineCtx.sampleRate * 0.2);
    const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, offlineCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = offlineCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = offlineCtx.createBiquadFilter();
    noiseFilter.type = isClap ? 'bandpass' : 'highpass';
    noiseFilter.frequency.setValueAtTime(isClap ? 1200 : 800, time);
    if (isClap) noiseFilter.Q.setValueAtTime(1.5, time);

    const noiseGain = offlineCtx.createGain();
    noiseGain.gain.setValueAtTime(isClap ? 0.6 : 0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + (isClap ? 0.16 : 0.22));

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.25);

    // Body tone
    const osc = offlineCtx.createOscillator();
    const oscGain = offlineCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.13);
  };

  // Helper: Play Hi-Hat
  const playHiHat = (time: number, open = false) => {
    const bufferSize = Math.round(offlineCtx.sampleRate * 0.08);
    const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, offlineCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = offlineCtx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = offlineCtx.createGain();
    const duration = open ? 0.15 : 0.045;
    gain.gain.setValueAtTime(open ? 0.45 : 0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    noise.start(time);
    noise.stop(time + duration + 0.02);
  };

  // Helper: Play Polyphonic Synth Chord (Rhodes / Soft Pad)
  const playChord = (time: number, freqs: number[], chordDur: number, type: OscillatorType = 'sine', filterCutoff = 1800) => {
    freqs.forEach((freq) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      const filter = offlineCtx.createBiquadFilter();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterCutoff, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.12 / freqs.length, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + chordDur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(time);
      osc.stop(time + chordDur);
    });
  };

  // Helper: Play Bass Note (808 or Sub)
  const playBass = (time: number, freq: number, bassDur: number, is808 = false) => {
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    const filter = offlineCtx.createBiquadFilter();

    osc.type = is808 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(is808 ? 320 : 220, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(is808 ? 0.5 : 0.38, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + bassDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(time);
    osc.stop(time + bassDur);
  };

  // -------------------------------------------------------------
  // Track Synthesis Algorithms
  // -------------------------------------------------------------

  if (trackId === 'lofi-sunset') {
    // Lo-Fi Beat: Dm9 - G13 - Cmaj9 - Am7
    const chords = [
      [noteFreq('D', 3), noteFreq('F', 3), noteFreq('A', 3), noteFreq('C', 4), noteFreq('E', 4)], // Dm9
      [noteFreq('G', 2), noteFreq('F', 3), noteFreq('B', 3), noteFreq('E', 4)], // G13
      [noteFreq('C', 3), noteFreq('E', 3), noteFreq('G', 3), noteFreq('B', 3), noteFreq('D', 4)], // Cmaj9
      [noteFreq('A', 2), noteFreq('C', 3), noteFreq('E', 3), noteFreq('G', 3)], // Am7
    ];
    const bassNotes = [noteFreq('D', 2), noteFreq('G', 1), noteFreq('C', 2), noteFreq('A', 1)];

    // Background vinyl warmth/crackle
    const vinylBuffer = offlineCtx.createBuffer(1, Math.round(offlineCtx.sampleRate * duration), offlineCtx.sampleRate);
    const vData = vinylBuffer.getChannelData(0);
    for (let i = 0; i < vData.length; i++) {
      if (Math.random() > 0.998) {
        vData[i] = (Math.random() * 2 - 1) * 0.3;
      } else {
        vData[i] = (Math.random() * 2 - 1) * 0.015;
      }
    }
    const vinylSource = offlineCtx.createBufferSource();
    vinylSource.buffer = vinylBuffer;
    const vinylFilter = offlineCtx.createBiquadFilter();
    vinylFilter.type = 'bandpass';
    vinylFilter.frequency.setValueAtTime(2500, 0);
    const vinylGain = offlineCtx.createGain();
    vinylGain.gain.setValueAtTime(0.12, 0);
    vinylSource.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(masterGain);
    vinylSource.start(0);
    vinylSource.stop(duration);

    // Loop Chords every 4 beats
    for (let beat = 0; beat < totalBeats; beat += 4) {
      const chordIdx = Math.floor(beat / 4) % chords.length;
      const t = beat * beatSec;
      playChord(t, chords[chordIdx], beatSec * 3.8, 'triangle', 1400);
      playBass(t, bassNotes[chordIdx], beatSec * 3.6, false);

      // Lo-Fi Drum Groove: Kick on 1 and 3.5, Snare on 2 and 4
      playKick(t, 0.32, 45);
      if (t + beatSec * 2.5 < duration) {
        playKick(t + beatSec * 2.5, 0.28, 48);
      }
      if (t + beatSec * 1 < duration) {
        playSnare(t + beatSec * 1);
      }
      if (t + beatSec * 3 < duration) {
        playSnare(t + beatSec * 3);
      }

      // Swing Hi-Hats
      for (let s = 0; s < 4; s++) {
        const ht = t + s * beatSec;
        if (ht < duration) playHiHat(ht);
        const swingT = ht + beatSec * 0.58;
        if (swingT < duration) playHiHat(swingT);
      }
    }
  } else if (trackId === 'dark-phonk') {
    // Brazilian Phonk: 130 BPM, heavy 808 slides, syncopated cowbell lead
    const cowbellNotes = [
      noteFreq('E', 5), noteFreq('G', 5), noteFreq('B', 5), noteFreq('A', 5),
      noteFreq('G', 5), noteFreq('E', 5), noteFreq('D', 5), noteFreq('E', 5),
    ];
    const bassRiffs = [noteFreq('E', 1), noteFreq('E', 1), noteFreq('G', 1), noteFreq('D', 1)];

    // Play Cowbell Lead
    const playCowbell = (time: number, freq: number) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.22, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.16);
    };

    for (let beat = 0; beat < totalBeats; beat++) {
      const t = beat * beatSec;

      // Heavy 808 and Kick on 1, 2.5, 3
      if (beat % 4 === 0 || beat % 4 === 2.5) {
        playKick(t, 0.45, 38);
        const bFreq = bassRiffs[Math.floor(beat / 4) % bassRiffs.length];
        playBass(t, bFreq, beatSec * 1.8, true);
      }

      // Snare on 2 and 4
      if (beat % 2 === 1) {
        playSnare(t, true);
      }

      // Rapid Trap Hats (1/8 and 1/16 rolls)
      playHiHat(t);
      playHiHat(t + beatSec * 0.5);
      if (beat % 4 === 3) {
        playHiHat(t + beatSec * 0.75);
      }

      // Cowbell melody (2 notes per beat)
      const noteA = cowbellNotes[(beat * 2) % cowbellNotes.length];
      const noteB = cowbellNotes[(beat * 2 + 1) % cowbellNotes.length];
      playCowbell(t, noteA);
      playCowbell(t + beatSec * 0.5, noteB);
    }
  } else if (trackId === 'cinematic-tension') {
    // Cinematic Suspense: 100 BPM pulsing sub, ticking clock, dark minor swells
    const subFreqs = [noteFreq('C', 1), noteFreq('G#', 1), noteFreq('A#', 1), noteFreq('C', 1)];
    const padChords = [
      [noteFreq('C', 3), noteFreq('D#', 3), noteFreq('G', 3)],
      [noteFreq('G#', 2), noteFreq('C', 3), noteFreq('D#', 3)],
      [noteFreq('A#', 2), noteFreq('D', 3), noteFreq('F', 3)],
      [noteFreq('C', 3), noteFreq('D#', 3), noteFreq('G', 3)],
    ];

    for (let beat = 0; beat < totalBeats; beat += 4) {
      const idx = Math.floor(beat / 4) % subFreqs.length;
      const t = beat * beatSec;

      // Dark string/pad swell
      playChord(t, padChords[idx], beatSec * 3.9, 'sawtooth', 800);
      playBass(t, subFreqs[idx], beatSec * 3.8, false);

      // Deep heartbeat kick
      playKick(t, 0.45, 36);
      if (t + beatSec * 0.75 < duration) {
        playKick(t + beatSec * 0.75, 0.35, 42);
      }
    }

    // Steady Clock-Tick percussion
    for (let beat = 0; beat < totalBeats; beat++) {
      const t = beat * beatSec;
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.03);
    }
  } else if (trackId === 'cyber-synthwave') {
    // Synthwave: 122 BPM, driving 16th note bass arps, 80s snare
    const arpNotes = [
      noteFreq('A', 2), noteFreq('C', 3), noteFreq('E', 3), noteFreq('A', 3),
      noteFreq('F', 2), noteFreq('A', 2), noteFreq('C', 3), noteFreq('F', 3),
      noteFreq('G', 2), noteFreq('B', 2), noteFreq('D', 3), noteFreq('G', 3),
      noteFreq('E', 2), noteFreq('G', 2), noteFreq('B', 2), noteFreq('E', 3),
    ];

    for (let beat = 0; beat < totalBeats; beat++) {
      const t = beat * beatSec;

      // Driving Kick on every beat (4-on-the-floor)
      playKick(t, 0.28, 55);

      // Snare on 2 and 4
      if (beat % 2 === 1) {
        playSnare(t);
      }

      // Off-beat Hi-Hat
      playHiHat(t + beatSec * 0.5, true);

      // 16th note rolling synth bass
      for (let sub = 0; sub < 4; sub++) {
        const stepT = t + sub * (beatSec / 4);
        if (stepT < duration) {
          const n = arpNotes[(beat * 4 + sub) % arpNotes.length];
          const osc = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          const filter = offlineCtx.createBiquadFilter();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(n, stepT);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1600, stepT);
          filter.frequency.exponentialRampToValueAtTime(400, stepT + 0.12);
          gain.gain.setValueAtTime(0.25, stepT);
          gain.gain.exponentialRampToValueAtTime(0.001, stepT + 0.11);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          osc.start(stepT);
          osc.stop(stepT + 0.13);
        }
      }
    }
  } else if (trackId === 'upbeat-bounce') {
    // Upbeat Creator Trap: 124 BPM, cheerful chords, bright bounce
    const bounceChords = [
      [noteFreq('F', 3), noteFreq('A', 3), noteFreq('C', 4)],
      [noteFreq('G', 3), noteFreq('B', 3), noteFreq('D', 4)],
      [noteFreq('A', 3), noteFreq('C', 4), noteFreq('E', 4)],
      [noteFreq('C', 4), noteFreq('E', 4), noteFreq('G', 4)],
    ];
    const bass = [noteFreq('F', 2), noteFreq('G', 2), noteFreq('A', 2), noteFreq('C', 2)];

    for (let beat = 0; beat < totalBeats; beat += 2) {
      const idx = Math.floor(beat / 2) % bounceChords.length;
      const t = beat * beatSec;
      playChord(t, bounceChords[idx], beatSec * 1.6, 'sine', 2400);
      playBass(t, bass[idx], beatSec * 1.5, true);

      playKick(t, 0.28, 52);
      if (t + beatSec < duration) {
        playSnare(t + beatSec, true);
      }
      playHiHat(t);
      playHiHat(t + beatSec * 0.5);
      playHiHat(t + beatSec);
      playHiHat(t + beatSec * 1.5);
    }
  } else {
    // Ambient Calm: 68 BPM gentle evolving drone
    const droneFreqs = [noteFreq('D', 3), noteFreq('F#', 3), noteFreq('A', 3), noteFreq('C#', 4), noteFreq('E', 4)];
    droneFreqs.forEach((freq, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      const filter = offlineCtx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, 0);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000 + idx * 200, 0);

      gain.gain.setValueAtTime(0.001, 0);
      gain.gain.linearRampToValueAtTime(0.12, 2);
      gain.gain.setValueAtTime(0.12, duration - 2);
      gain.gain.linearRampToValueAtTime(0.001, duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(0);
      osc.stop(duration);
    });

    // Occasional gentle Tibetan chime
    for (let t = 2; t < duration - 1; t += 4.5) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq('A', 5), t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.8);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 3);
    }
  }

  // Render complete AudioBuffer
  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  const objectUrl = URL.createObjectURL(wavBlob);

  trackUrlCache.set(trackId, objectUrl);
  return objectUrl;
}
