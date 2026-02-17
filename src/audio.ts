import { AUDIO_CONFIG } from './constants';

/**
 * AudioManager — Handles microphone input and volume analysis.
 *
 * Volume pipeline (simple):
 *   1. Read RMS amplitude from the mic  →  "raw" value (0 – ~0.5)
 *   2. Map [AUDIO_CONFIG.minVolume … maxVolume]  →  [0 … 1]
 *   3. Game / UI consume that 0–1 number directly.
 *
 * To calibrate for a new mic, change minVolume / maxVolume in constants.ts.
 */
export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private frequencyArray: Uint8Array<ArrayBuffer> | null = null;
  private stream: MediaStream | null = null;
  private _isEnabled: boolean = false;

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  /**
   * Request microphone access and initialise audio analysis.
   */
  async requestMicrophoneAccess(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.audioContext = new AudioContext();

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = AUDIO_CONFIG.fftSize;
      this.analyser.smoothingTimeConstant = AUDIO_CONFIG.smoothingTimeConstant;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.fftSize);
      this.frequencyArray = new Uint8Array(this.analyser.frequencyBinCount);

      this._isEnabled = true;
      return true;
    } catch (error) {
      console.error('Failed to access microphone:', error);
      this._isEnabled = false;
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  //  Volume  (0 – 1, mapped from minVolume…maxVolume)
  // ---------------------------------------------------------------------------

  /**
   * Current volume as a normalised 0–1 value.
   *
   *   0 %  =  at or below AUDIO_CONFIG.minVolume  (silence / room noise)
   *   100% =  at or above AUDIO_CONFIG.maxVolume   (loud scream)
   */
  getVolumeLevel(): number {
    if (!this.analyser || !this.dataArray) return 0;

    // --- raw RMS amplitude ---
    this.analyser.getByteTimeDomainData(this.dataArray);

    let sumSquares = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const amplitude = (this.dataArray[i] - 128) / 128;
      sumSquares += amplitude * amplitude;
    }
    const raw = Math.sqrt(sumSquares / this.dataArray.length);

    // Log raw value periodically so you can calibrate minVolume / maxVolume.
    // Open DevTools console → be silent → note the number (= minVolume),
    // then scream → note the number (= maxVolume). Update constants.ts.
    if (Math.random() < 0.02) {
      console.log(`[AudioManager] raw RMS: ${raw.toFixed(6)}`);
    }

    // --- map [minVolume … maxVolume] → [0 … 1] ---
    const { minVolume, maxVolume } = AUDIO_CONFIG;
    const range = maxVolume - minVolume;
    if (range <= 0) return 0;

    const normalised = (raw - minVolume) / range;
    return Math.max(0, Math.min(1, normalised));
  }

  // ---------------------------------------------------------------------------
  //  Pitch  (Hz — used for the flying challenge)
  // ---------------------------------------------------------------------------

  /**
   * Dominant pitch in Hz (0 if nothing clear is detected).
   * Uses the frequency bin with the highest magnitude in the voice range.
   */
  getPitch(): number {
    if (!this.analyser || !this.frequencyArray || !this.audioContext) return 0;

    this.analyser.getByteFrequencyData(this.frequencyArray);

    let maxValue = 0;
    let maxIndex = 0;
    // Voice range ~80 Hz–1.2 kHz; with fftSize 2048 @ 48kHz, bin width ≈ 23 Hz, so bins 4–52
    const minBin = 2;
    const maxBin = Math.min(this.frequencyArray.length, 120);

    for (let i = minBin; i < maxBin; i++) {
      if (this.frequencyArray[i] > maxValue) {
        maxValue = this.frequencyArray[i];
        maxIndex = i;
      }
    }

    // Lower threshold so pitch is reported even when mic is quieter
    if (maxValue < 20) return 0;

    const sampleRate = this.audioContext.sampleRate;
    const binWidth = sampleRate / this.analyser.fftSize;
    const pitchHz = maxIndex * binWidth;

    // Debug: log pitch when it changes (remove when done debugging)
    if (Math.random() < 0.03) {
      console.log(`[getPitch] maxBin=${maxIndex} maxVal=${maxValue} → ${Math.round(pitchHz)} Hz`);
    }

    return pitchHz;
  }

  // ---------------------------------------------------------------------------
  //  Frequency data (optional visualisation)
  // ---------------------------------------------------------------------------

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  // ---------------------------------------------------------------------------
  //  Lifecycle
  // ---------------------------------------------------------------------------

  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  dispose(): void {
    this.microphone?.disconnect();
    this.microphone = null;

    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;

    this.audioContext?.close();
    this.audioContext = null;

    this.analyser = null;
    this.dataArray = null;
    this.frequencyArray = null;
    this._isEnabled = false;
  }
}
