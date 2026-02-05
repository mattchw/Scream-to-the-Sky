import { AUDIO_CONFIG } from './constants';

/**
 * AudioManager - Handles microphone input and volume analysis
 * Uses Web Audio API to capture mic input and analyze volume levels
 * Also detects pitch (frequency) for flying horse height control
 */
export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private frequencyArray: Uint8Array<ArrayBuffer> | null = null;
  private stream: MediaStream | null = null;
  private _isEnabled: boolean = false;

  /**
   * Check if audio is enabled and microphone is active
   */
  get isEnabled(): boolean {
    return this._isEnabled;
  }

  /**
   * Request microphone access and initialize audio analysis
   * @returns Promise that resolves to true if successful
   */
  async requestMicrophoneAccess(): Promise<boolean> {
    try {
      // Request microphone permission - disable processing that limits loud sounds!
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,  // Don't suppress loud sounds
          noiseSuppression: false,  // Don't suppress loud sounds
          autoGainControl: false,   // Don't limit volume!
        },
      });

      // Create audio context
      this.audioContext = new AudioContext();

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = AUDIO_CONFIG.fftSize;
      this.analyser.smoothingTimeConstant = AUDIO_CONFIG.smoothingTimeConstant;
      this.analyser.minDecibels = AUDIO_CONFIG.minDecibels;
      this.analyser.maxDecibels = AUDIO_CONFIG.maxDecibels;

      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      // Create data array for time domain analysis (better for volume detection)
      this.dataArray = new Uint8Array(this.analyser.fftSize);
      
      // Create frequency array for pitch detection
      this.frequencyArray = new Uint8Array(this.analyser.frequencyBinCount);

      this._isEnabled = true;
      return true;
    } catch (error) {
      console.error('Failed to access microphone:', error);
      this._isEnabled = false;
      return false;
    }
  }

  /**
   * Get the current volume level from 0 to 1
   * Uses time domain data (waveform) for accurate loudness detection
   */
  getVolumeLevel(): number {
    if (!this.analyser || !this.dataArray) {
      return 0;
    }

    // Get time domain data (waveform) - better for detecting loud screams
    this.analyser.getByteTimeDomainData(this.dataArray);

    // Calculate RMS (Root Mean Square) for accurate volume
    let sumSquares = 0;
    let peak = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      // Convert from 0-255 to -1 to 1 range (128 is silence)
      const amplitude = (this.dataArray[i] - 128) / 128;
      sumSquares += amplitude * amplitude;
      
      // Track peak amplitude
      const absAmplitude = Math.abs(amplitude);
      if (absAmplitude > peak) {
        peak = absAmplitude;
      }
    }

    // RMS gives average loudness
    const rms = Math.sqrt(sumSquares / this.dataArray.length);
    
    // Combine RMS and peak for responsive volume (weighted toward peak for screaming)
    const combined = rms * 0.4 + peak * 0.6;
    
    // Scale up and clamp to 0-1 (screaming typically peaks around 0.5-0.8)
    const scaled = Math.min(1, combined * 1.5);
    
    return scaled;
  }

  /**
   * Get raw frequency data for visualization (optional)
   */
  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray) {
      return null;
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  /**
   * Get the dominant pitch (frequency in Hz)
   * Returns 0 if no clear pitch detected
   * Human voice typically ranges from 85Hz to 1100Hz
   */
  getPitch(): number {
    if (!this.analyser || !this.frequencyArray || !this.audioContext) {
      return 0;
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.frequencyArray);

    // Find the peak frequency bin
    let maxValue = 0;
    let maxIndex = 0;
    
    // Focus on human voice range (roughly bins 2-50 for typical sample rates)
    // This helps filter out noise and focus on screaming pitch
    const minBin = 2;   // Skip very low frequencies (rumble)
    const maxBin = Math.min(this.frequencyArray.length, 100);  // Up to ~2000Hz
    
    for (let i = minBin; i < maxBin; i++) {
      if (this.frequencyArray[i] > maxValue) {
        maxValue = this.frequencyArray[i];
        maxIndex = i;
      }
    }

    // Only return pitch if signal is strong enough
    if (maxValue < 50) {
      return 0;
    }

    // Convert bin index to frequency in Hz
    const sampleRate = this.audioContext.sampleRate;
    const binFrequency = sampleRate / this.analyser.fftSize;
    const pitch = maxIndex * binFrequency;

    return pitch;
  }

  /**
   * Resume audio context if suspended (browsers require user interaction)
   */
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Clean up and release microphone resources
   */
  dispose(): void {
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.frequencyArray = null;
    this._isEnabled = false;
  }
}
