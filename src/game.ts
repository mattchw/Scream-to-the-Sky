import { GAME_CONFIG, TIMING } from './constants';
import { AudioManager } from './audio';
import { Horse } from './horse';
import { Renderer } from './renderer';
import { UIManager } from './ui';
import { ObstacleManager } from './obstacle';
import type { GameState } from './types';

/**
 * Game class - Main game engine
 * Scream as long as you can! Stop screaming = game over
 */
export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private audioManager: AudioManager;
  private uiManager: UIManager;
  private horse: Horse;
  private obstacleManager: ObstacleManager;

  private state: GameState;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private silenceTimer: number = 0;  // Track how long player has been silent
  
  // Pitch tracking for flying horse
  private referencePitch: number = 0;      // Reference pitch captured before flying
  private currentPitch: number = 0;        // Current detected pitch
  private readonly PITCH_CAPTURE_DISTANCE = 4500;  // Capture reference pitch at this distance

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.audioManager = new AudioManager();
    this.uiManager = new UIManager(this);
    this.horse = new Horse();
    this.obstacleManager = new ObstacleManager();

    // Initialize game state
    this.state = this.getInitialState();

    // Bind methods
    this.gameLoop = this.gameLoop.bind(this);
    this.start = this.start.bind(this);
    this.restart = this.restart.bind(this);
  }

  /**
   * Get initial game state
   */
  private getInitialState(): GameState {
    return {
      isRunning: false,
      isPaused: false,
      isGameOver: false,
      distance: 0,
      speed: 0,
      volumeLevel: 0,
      screamTime: 0,
      isScreaming: false,
      flyingChallengeMode: false,
    };
  }

  /**
   * Initialize the game and show start screen
   */
  async initialize(): Promise<void> {
    this.uiManager.showStartScreen();
  }

  /**
   * Start the game (called after mic permission granted)
   */
  async start(): Promise<boolean> {
    // Request microphone access
    const micEnabled = await this.audioManager.requestMicrophoneAccess();
    
    if (!micEnabled) {
      alert('Microphone access is required to play! Please allow microphone access and try again.');
      return false;
    }

    // Resume audio context (required by browsers after user interaction)
    await this.audioManager.resume();

    // Check flying challenge mode toggle
    const flyingModeToggle = document.getElementById('flying-mode-toggle') as HTMLInputElement;
    const flyingChallengeMode = flyingModeToggle?.checked ?? false;

    // Reset game state
    this.state = this.getInitialState();
    this.state.isRunning = true;
    this.state.flyingChallengeMode = flyingChallengeMode;
    this.silenceTimer = 0;
    this.referencePitch = 0;
    this.currentPitch = 0;
    this.horse.reset();
    this.horse.setFlyingModeEnabled(flyingChallengeMode);
    this.renderer.reset();
    this.obstacleManager.reset();

    // Show game HUD
    this.uiManager.showGameHUD();

    // Start game loop
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);

    return true;
  }

  /**
   * Main game loop
   */
  private gameLoop(currentTime: number): void {
    if (!this.state.isRunning || this.state.isGameOver) {
      return;
    }

    // Calculate delta time
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update game systems
    this.update(deltaTime);

    // Render
    this.render(currentTime, deltaTime);

    // Continue loop
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * Update game state
   */
  private update(deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;

    // Get current volume level from microphone
    this.state.volumeLevel = this.audioManager.getVolumeLevel();
    
    // Get current pitch for flying horse control
    this.currentPitch = this.audioManager.getPitch();

    // Check if currently screaming
    const wasScreaming = this.state.isScreaming;
    this.state.isScreaming = this.state.volumeLevel > GAME_CONFIG.volumeThreshold;

    // Update scream time and silence detection
    if (this.state.isScreaming) {
      // Reset silence timer when screaming
      this.silenceTimer = 0;
      // Accumulate scream time
      this.state.screamTime += deltaSeconds;
      // Calculate speed based on volume
      this.updateSpeed();
      
      // Capture reference pitch just before flying starts (around 4500m-5000m)
      // Only if flying challenge mode is enabled
      if (this.state.flyingChallengeMode &&
          this.state.distance >= this.PITCH_CAPTURE_DISTANCE && 
          this.state.distance < 5000 && 
          this.currentPitch > 0) {
        // Keep updating reference pitch until we hit 5000m
        // This captures the player's "natural" screaming pitch
        this.referencePitch = this.currentPitch;
      }
    } else {
      // Track silence duration
      this.silenceTimer += deltaSeconds;
      
      // Game over if silent for too long (with grace period)
      if (this.silenceTimer >= GAME_CONFIG.silenceGracePeriod && this.state.screamTime > 0) {
        this.gameOver();
        return;
      }
      
      // Slow down when not screaming
      this.state.speed = Math.max(0, this.state.speed - 200 * deltaSeconds);
    }

    // Accumulate distance based on speed
    this.state.distance += this.state.speed * deltaSeconds;

    // Update horse animation (pass distance and pitch for flying transition)
    this.horse.update(
      deltaTime, 
      this.state.speed, 
      this.state.distance,
      this.currentPitch,
      this.referencePitch
    );

    // Update obstacles (only in flying challenge mode)
    if (this.state.flyingChallengeMode) {
      this.obstacleManager.update(this.state.distance, this.state.speed, deltaTime);

      // Check for collision with obstacles
      const bounds = this.horse.getBounds();
      if (this.obstacleManager.checkCollision(bounds.x, bounds.y, bounds.width, bounds.height)) {
        this.gameOver();
        return;
      }
    }

    // Update parallax background
    this.renderer.updateParallax(this.state.speed, deltaTime);

    // Update UI
    this.uiManager.updateHUD(this.state);
  }

  /**
   * Calculate current speed based on volume level
   */
  private updateSpeed(): void {
    const volumeLevel = this.state.volumeLevel;
    
    // Normalize volume above threshold
    const normalizedVolume = (volumeLevel - GAME_CONFIG.volumeThreshold) / (1 - GAME_CONFIG.volumeThreshold);
    
    // Calculate speed - louder = faster!
    const speedBoost = normalizedVolume * GAME_CONFIG.maxSpeedBoost;
    this.state.speed = GAME_CONFIG.baseSpeed + speedBoost;
  }

  /**
   * Render the game
   */
  private render(time: number, deltaTime: number): void {
    this.renderer.render(
      this.horse, 
      time, 
      this.state.distance, 
      this.state.flyingChallengeMode ? this.obstacleManager : undefined, 
      deltaTime,
      this.state.flyingChallengeMode
    );
  }

  /**
   * Handle game over
   */
  private gameOver(): void {
    this.state.isGameOver = true;
    this.state.isRunning = false;
    this.state.speed = 0;

    // Stop animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Show game over screen after brief delay
    setTimeout(() => {
      this.uiManager.showGameOverScreen(
        Math.floor(this.state.distance),
        this.state.screamTime
      );
    }, TIMING.gameOverDelay);
  }

  /**
   * Restart the game
   */
  restart(): void {
    // Check flying challenge mode toggle
    const flyingModeToggle = document.getElementById('flying-mode-toggle') as HTMLInputElement;
    const flyingChallengeMode = flyingModeToggle?.checked ?? false;

    // Reset state
    this.state = this.getInitialState();
    this.state.isRunning = true;
    this.state.flyingChallengeMode = flyingChallengeMode;
    this.silenceTimer = 0;
    this.referencePitch = 0;
    this.currentPitch = 0;
    this.horse.reset();
    this.horse.setFlyingModeEnabled(flyingChallengeMode);
    this.renderer.reset();
    this.obstacleManager.reset();

    // Show HUD
    this.uiManager.showGameHUD();

    // Start game loop
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * Pause the game
   */
  pause(): void {
    this.state.isPaused = true;
    this.state.isRunning = false;
  }

  /**
   * Resume the game
   */
  resume(): void {
    if (this.state.isPaused && !this.state.isGameOver) {
      this.state.isPaused = false;
      this.state.isRunning = true;
      this.lastTime = performance.now();
      this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
  }

  /**
   * Get current game state
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.audioManager.dispose();
  }
}
