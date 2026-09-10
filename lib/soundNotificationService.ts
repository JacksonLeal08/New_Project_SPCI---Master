'use client';

/**
 * SoundNotificationService - Motor de Áudio Industrial para Alertas do SPCI Master
 * Utiliza Web Audio API sintetizada nativa no navegador (sem dependência de arquivos de áudio externos).
 */

class SoundNotificationService {
  private audioCtx: AudioContext | null = null;
  private readonly STORAGE_KEY_ENABLED = 'spci_sound_notifications_enabled';
  private readonly STORAGE_KEY_VOLUME = 'spci_sound_notifications_volume';

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public isEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(this.STORAGE_KEY_ENABLED);
    return stored !== null ? stored === 'true' : true;
  }

  public setEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY_ENABLED, String(enabled));
  }

  public getVolume(): number {
    if (typeof window === 'undefined') return 0.7;
    const stored = localStorage.getItem(this.STORAGE_KEY_VOLUME);
    return stored !== null ? Math.min(Math.max(parseFloat(stored), 0), 1) : 0.7;
  }

  public setVolume(volume: number): void {
    if (typeof window === 'undefined') return;
    const clamped = Math.min(Math.max(volume, 0), 1);
    localStorage.setItem(this.STORAGE_KEY_VOLUME, String(clamped));
  }

  /**
   * Alerta Crítico / Impeditivo NBR:
   * Pulso bi-tonal industrial de atenção (880Hz -> 587Hz -> 880Hz)
   */
  public playCriticalAlert(): void {
    if (!this.isEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const masterGain = ctx.createGain();
      const vol = this.getVolume();
      masterGain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const now = ctx.currentTime;

      // Primeiro tom: 880Hz
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      osc1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.14);

      // Segundo tom: 587Hz (D5)
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(587.33, now + 0.16);
      osc2.connect(masterGain);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.32);

      // Terceiro tom de confirmação: 880Hz
      const osc3 = ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(880, now + 0.35);
      osc3.connect(masterGain);
      osc3.start(now + 0.35);
      osc3.stop(now + 0.55);

      // Fade out suave
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    } catch (e) {
      console.warn('[SoundService] Falha ao sintetizar som crítico:', e);
    }
  }

  /**
   * Som de Sucesso Operacional / Troca Concluída:
   * Chime harmônico suave e elegante (587Hz -> 880Hz)
   */
  public playSuccessChime(): void {
    if (!this.isEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const masterGain = ctx.createGain();
      const vol = this.getVolume();
      masterGain.gain.setValueAtTime(vol * 0.35, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const now = ctx.currentTime;

      // Chime 1
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Chime 2 (mais agudo e brilhante)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15); // A5
      osc2.connect(masterGain);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);

      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    } catch (e) {
      console.warn('[SoundService] Falha ao sintetizar som de sucesso:', e);
    }
  }

  /**
   * Notificação sutil / Bipe neutro
   */
  public playNeutralBlip(): void {
    if (!this.isEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const masterGain = ctx.createGain();
      const vol = this.getVolume();
      masterGain.gain.setValueAtTime(vol * 0.25, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);
      osc.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.09);

      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    } catch (e) {
      console.warn('[SoundService] Falha ao sintetizar blip:', e);
    }
  }
}

export const soundNotificationService = new SoundNotificationService();
