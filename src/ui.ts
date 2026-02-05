import type { GameState, ScreenType } from './types';

// Forward declaration for Game type to avoid circular dependency
interface GameInterface {
  start(): Promise<boolean>;
  restart(): void;
}

/**
 * UIManager class - Handles all UI screens and HUD elements
 * Manages start screen, in-game HUD, and game over screen
 */
export class UIManager {
  private game: GameInterface;
  
  // DOM Elements
  private startScreen: HTMLElement;
  private hud: HTMLElement;
  private gameOverScreen: HTMLElement;
  private startBtn: HTMLButtonElement;
  private restartBtn: HTMLButtonElement;
  
  // HUD Elements
  private timerValue: HTMLElement;
  private distanceValue: HTMLElement;
  private volumeFill: HTMLElement;
  private screamIndicator: HTMLElement;
  
  // Game Over Elements
  private finalDistance: HTMLElement;
  private finalTime: HTMLElement;

  private currentScreen: ScreenType = 'start';

  constructor(game: GameInterface) {
    this.game = game;

    // Get DOM elements
    this.startScreen = document.getElementById('start-screen')!;
    this.hud = document.getElementById('hud')!;
    this.gameOverScreen = document.getElementById('game-over-screen')!;
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
    
    this.timerValue = document.getElementById('timer-value')!;
    this.distanceValue = document.getElementById('distance-value')!;
    this.volumeFill = document.getElementById('volume-fill')!;
    this.screamIndicator = document.getElementById('scream-indicator')!;
    this.finalDistance = document.getElementById('final-distance')!;
    this.finalTime = document.getElementById('final-time')!;

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup button event listeners
   */
  private setupEventListeners(): void {
    // Start button
    this.startBtn.addEventListener('click', async () => {
      this.startBtn.disabled = true;
      this.startBtn.innerHTML = '<span>Loading...</span>';
      
      const success = await this.game.start();
      
      if (!success) {
        this.startBtn.disabled = false;
        this.startBtn.innerHTML = '<span class="btn-icon">🎙️</span><span>ENABLE MIC & START</span>';
      }
    });

    // Restart button
    this.restartBtn.addEventListener('click', () => {
      this.game.restart();
    });

    // Keyboard shortcut for restart
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (this.currentScreen === 'gameover') {
          this.game.restart();
        }
      }
    });
  }

  /**
   * Show the start screen
   */
  showStartScreen(): void {
    this.currentScreen = 'start';
    this.startScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    
    // Reset start button
    this.startBtn.disabled = false;
    this.startBtn.innerHTML = '<span class="btn-icon">🎙️</span><span>ENABLE MIC & START</span>';
  }

  /**
   * Show the game HUD
   */
  showGameHUD(): void {
    this.currentScreen = 'game';
    this.startScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.gameOverScreen.classList.add('hidden');
    
    // Reset HUD values
    this.updateTimer(0);
    this.updateDistance(0);
    this.updateVolumeMeter(0);
    this.updateScreamIndicator(false);
  }

  /**
   * Show the game over screen with final stats
   */
  showGameOverScreen(finalDistance: number, screamTime: number): void {
    this.currentScreen = 'gameover';
    this.startScreen.classList.add('hidden');
    this.hud.classList.add('hidden');
    this.gameOverScreen.classList.remove('hidden');
    
    // Update final scores
    this.finalDistance.textContent = `${finalDistance}m`;
    this.finalTime.textContent = this.formatTime(screamTime);
    
    // Add animation class
    this.gameOverScreen.style.animation = 'none';
    this.gameOverScreen.offsetHeight; // Trigger reflow
    this.gameOverScreen.style.animation = '';
  }

  /**
   * Update the HUD with current game state
   */
  updateHUD(state: GameState): void {
    this.updateTimer(state.screamTime);
    this.updateDistance(state.distance);
    this.updateVolumeMeter(state.volumeLevel);
    this.updateScreamIndicator(state.isScreaming);
  }

  /**
   * Update the timer display
   */
  private updateTimer(screamTime: number): void {
    this.timerValue.textContent = this.formatTime(screamTime);
  }

  /**
   * Update the distance counter
   */
  private updateDistance(distance: number): void {
    this.distanceValue.textContent = `${Math.floor(distance)}m`;
  }

  /**
   * Update the volume meter
   */
  private updateVolumeMeter(volumeLevel: number): void {
    const percentage = volumeLevel * 100;
    this.volumeFill.style.width = `${Math.min(100, percentage)}%`;
  }

  /**
   * Update the scream indicator
   */
  private updateScreamIndicator(isScreaming: boolean): void {
    if (isScreaming) {
      this.screamIndicator.classList.add('active');
      this.screamIndicator.textContent = '🔊 SCREAMING!';
    } else {
      this.screamIndicator.classList.remove('active');
      this.screamIndicator.textContent = '🔇 SCREAM NOW!';
    }
  }

  /**
   * Format time as MM:SS.ms
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  /**
   * Get current screen type
   */
  getCurrentScreen(): ScreenType {
    return this.currentScreen;
  }
}
