// Celebration sound + confetti trigger
// Used after: vote success, claim success, purchase success

export function playCelebrationSound() {
  try {
    const ctx = new AudioContext();
    
    // Play a short ascending chime (C-E-G arpeggio)
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });

    // Close context after sound finishes
    setTimeout(() => ctx.close().catch(() => {}), 2000);
  } catch {
    // Audio not supported — silent fallback
  }
}
