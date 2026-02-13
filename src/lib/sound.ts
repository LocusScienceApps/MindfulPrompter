/**
 * Sound playback using Web Audio API.
 * Generates a simple chime tone — no external audio file needed.
 */

let audioContext: AudioContext | null = null;

/**
 * Initialize the audio context. Must be called from a user gesture
 * (e.g., button click) to satisfy browser autoplay restrictions.
 */
export function initAudio(): void {
  if (audioContext) return;
  try {
    audioContext = new AudioContext();
  } catch {
    console.warn('Web Audio API not available');
  }
}

/**
 * Play a brief chime sound.
 */
export function playChime(): void {
  if (!audioContext) {
    initAudio();
  }
  if (!audioContext) return;

  try {
    // Resume if suspended (browsers may suspend until user interaction)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;

    // Two-tone chime: a short ascending pair of notes
    const frequencies = [523.25, 659.25]; // C5, E5
    const duration = 0.15;
    const gap = 0.1;

    frequencies.forEach((freq, i) => {
      const oscillator = audioContext!.createOscillator();
      const gainNode = audioContext!.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = freq;

      // Envelope: quick fade in, sustain, fade out
      const start = now + i * (duration + gap);
      gainNode.gain.setValueAtTime(0, start);
      gainNode.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, start + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext!.destination);

      oscillator.start(start);
      oscillator.stop(start + duration);
    });
  } catch {
    // Silently fail if audio can't play
  }
}
