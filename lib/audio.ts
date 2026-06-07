/**
 * Web Audio API synthesizer for premium UI sound effects.
 * Generates an organic, sci-fi style disintegration sound.
 */
export function playDisintegrateSound() {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    
    // 1. Initial Tactile Thump (Low frequency sine wave sweep)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    osc.type = 'sine';
    // Sweep frequency from 130Hz down to 20Hz in 0.25 seconds
    osc.frequency.setValueAtTime(130, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.25);
    
    // Quick gain decay
    oscGain.gain.setValueAtTime(0.4, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.25);

    // 2. Disintegration Sweep / White Noise Sweep
    const duration = 1.0; // 1 second duration
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    // Bandpass filter to sweep down, creating a wind/dust dissolve sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + duration);
    filter.Q.setValueAtTime(6, ctx.currentTime);
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, ctx.currentTime);
    // Exponential decay of volume
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    noiseNode.start();
    noiseNode.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn('Failed to synthesize disintegration sound:', error);
  }
}

/**
 * Synthesizes a clean, premium telemetry ping chime using Web Audio API.
 * Dispatched when receiving real-time data sync notifications.
 */
export function playTelemetryPingSound() {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Primary chime tone (starts at 880Hz and ramps up slightly)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1100, now + 0.12);
    
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Harmonizer high tone (starts at 1760Hz, slightly delayed for a sparkling chime effect)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, now + 0.04);
    
    gain2.gain.setValueAtTime(0.06, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.3);
  } catch (error) {
    console.warn('Failed to synthesize telemetry ping sound:', error);
  }
}

