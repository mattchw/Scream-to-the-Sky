import { CANVAS_DIMENSIONS } from './constants';
import { Horse } from './horse';
import { ObstacleManager } from './obstacle';

/**
 * Renderer class - Handles all canvas rendering
 * Uses background images with parallax scrolling and transitions
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  // Background images
  private backgrounds: HTMLImageElement[] = [];
  private bgLoaded: boolean[] = [false, false, false, false, false, false, false, false];
  private backgroundOffset: number = 0;
  
  // Warning text
  private warningFlashTimer: number = 0;
  private warningVisible: boolean = true;
  
  // Transition settings: [start distance, duration]
  private readonly TRANSITIONS = [
    { start: 2000, duration: 500 },   // bg1 -> bg2 at 2000m
    { start: 4000, duration: 500 },   // bg2 -> bg3 at 4000m
    { start: 6000, duration: 500 },   // bg3 -> bg4 at 6000m
    { start: 8000, duration: 500 },   // bg4 -> bg5 at 8000m
    { start: 10000, duration: 500 },  // bg5 -> bg6 at 10000m
    { start: 12000, duration: 500 },  // bg6 -> bg7 at 12000m
    { start: 15000, duration: 500 },  // bg7 -> bg8 at 15000m
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;

    // Set fixed internal canvas resolution (CSS handles display scaling)
    this.canvas.width = CANVAS_DIMENSIONS.width;
    this.canvas.height = CANVAS_DIMENSIONS.height;

    // Load all background images
    const bgPaths = [
      '/background/background_1.png',
      '/background/background_2.png',
      '/background/background_3.png',
      '/background/background_4.png',
      '/background/background_5.png',
      '/background/background_6.png',
      '/background/background_7.png',
      '/background/background_8.png',
    ];

    bgPaths.forEach((path, index) => {
      const img = new Image();
      img.onload = () => {
        this.bgLoaded[index] = true;
      };
      img.src = path;
      this.backgrounds[index] = img;
    });
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Update background scroll based on speed
   */
  updateParallax(speed: number, deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;
    
    // Scroll background based on speed
    this.backgroundOffset += speed * deltaSeconds;
    
    // Keep offset within reasonable bounds
    if (this.bgLoaded[0] && this.backgrounds[0].width > 0) {
      this.backgroundOffset %= this.backgrounds[0].width * 10;
    }
  }

  /**
   * Render the complete scene
   */
  render(horse: Horse, _time: number, distance: number = 0, obstacleManager?: ObstacleManager, deltaTime: number = 16, flyingChallengeMode: boolean = false): void {
    this.clear();
    
    // Draw scrolling background with transition based on distance
    this.drawBackground(distance);
    
    // Draw obstacles (behind horse when flying, in front when running)
    if (obstacleManager) {
      obstacleManager.draw(this.ctx);
    }
    
    // Draw the horse
    horse.draw(this.ctx);
    
    // Draw warning text before obstacles start (only in flying challenge mode)
    if (flyingChallengeMode) {
      this.drawWarning(distance, deltaTime);
    }
  }

  /**
   * Draw flashing warning text before obstacles appear
   */
  private drawWarning(distance: number, deltaTime: number): void {
    const WARNING_START = 4000;   // Start showing warning at 4000m
    const WARNING_END = 4800;     // Stop showing warning at 4800m (before obstacles at 5000m)
    const FLASH_INTERVAL = 200;   // Flash every 200ms
    
    if (distance < WARNING_START || distance >= WARNING_END) {
      return;
    }
    
    // Update flash timer
    this.warningFlashTimer += deltaTime;
    if (this.warningFlashTimer >= FLASH_INTERVAL) {
      this.warningVisible = !this.warningVisible;
      this.warningFlashTimer = 0;
    }
    
    if (!this.warningVisible) {
      return;
    }
    
    // Draw warning text
    this.ctx.save();
    
    // Warning background
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 3;
    
    // Glow effect
    this.ctx.shadowColor = '#FF0000';
    this.ctx.shadowBlur = 20;
    
    // Main text
    this.ctx.font = 'bold 36px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Red outline
    this.ctx.strokeStyle = '#8B0000';
    this.ctx.lineWidth = 6;
    this.ctx.strokeText('⚠️ WARNING ⚠️', centerX, centerY - 30);
    
    // Yellow fill
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillText('⚠️ WARNING ⚠️', centerX, centerY - 30);
    
    // Sub text
    this.ctx.font = 'bold 18px "Press Start 2P", monospace';
    this.ctx.shadowBlur = 10;
    
    this.ctx.strokeStyle = '#8B0000';
    this.ctx.lineWidth = 4;
    this.ctx.strokeText('OBSTACLES AHEAD!', centerX, centerY + 20);
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText('OBSTACLES AHEAD!', centerX, centerY + 20);
    
    // Hint text
    this.ctx.font = '14px "Press Start 2P", monospace';
    this.ctx.shadowBlur = 5;
    this.ctx.fillStyle = '#90EE90';
    this.ctx.fillText('Scream HIGHER to fly above!', centerX, centerY + 60);
    
    this.ctx.restore();
  }

  /**
   * Get which backgrounds to show and their opacities based on distance
   */
  private getBackgroundOpacities(distance: number): number[] {
    const opacities = [0, 0, 0, 0, 0, 0, 0, 0];
    
    // Determine current stage based on distance
    if (distance < this.TRANSITIONS[0].start) {
      // Before first transition: only bg1
      opacities[0] = 1;
    } else if (distance < this.TRANSITIONS[0].start + this.TRANSITIONS[0].duration) {
      // During first transition: bg1 -> bg2
      const progress = (distance - this.TRANSITIONS[0].start) / this.TRANSITIONS[0].duration;
      opacities[0] = 1 - progress;
      opacities[1] = progress;
    } else if (distance < this.TRANSITIONS[1].start) {
      // Between transitions: only bg2
      opacities[1] = 1;
    } else if (distance < this.TRANSITIONS[1].start + this.TRANSITIONS[1].duration) {
      // During second transition: bg2 -> bg3
      const progress = (distance - this.TRANSITIONS[1].start) / this.TRANSITIONS[1].duration;
      opacities[1] = 1 - progress;
      opacities[2] = progress;
    } else if (distance < this.TRANSITIONS[2].start) {
      // Between transitions: only bg3
      opacities[2] = 1;
    } else if (distance < this.TRANSITIONS[2].start + this.TRANSITIONS[2].duration) {
      // During third transition: bg3 -> bg4
      const progress = (distance - this.TRANSITIONS[2].start) / this.TRANSITIONS[2].duration;
      opacities[2] = 1 - progress;
      opacities[3] = progress;
    } else if (distance < this.TRANSITIONS[3].start) {
      // Between transitions: only bg4
      opacities[3] = 1;
    } else if (distance < this.TRANSITIONS[3].start + this.TRANSITIONS[3].duration) {
      // During fourth transition: bg4 -> bg5
      const progress = (distance - this.TRANSITIONS[3].start) / this.TRANSITIONS[3].duration;
      opacities[3] = 1 - progress;
      opacities[4] = progress;
    } else if (distance < this.TRANSITIONS[4].start) {
      // Between transitions: only bg5
      opacities[4] = 1;
    } else if (distance < this.TRANSITIONS[4].start + this.TRANSITIONS[4].duration) {
      // During fifth transition: bg5 -> bg6
      const progress = (distance - this.TRANSITIONS[4].start) / this.TRANSITIONS[4].duration;
      opacities[4] = 1 - progress;
      opacities[5] = progress;
    } else if (distance < this.TRANSITIONS[5].start) {
      // Between transitions: only bg6
      opacities[5] = 1;
    } else if (distance < this.TRANSITIONS[5].start + this.TRANSITIONS[5].duration) {
      // During sixth transition: bg6 -> bg7
      const progress = (distance - this.TRANSITIONS[5].start) / this.TRANSITIONS[5].duration;
      opacities[5] = 1 - progress;
      opacities[6] = progress;
    } else if (distance < this.TRANSITIONS[6].start) {
      // Between transitions: only bg7
      opacities[6] = 1;
    } else if (distance < this.TRANSITIONS[6].start + this.TRANSITIONS[6].duration) {
      // During seventh transition: bg7 -> bg8
      const progress = (distance - this.TRANSITIONS[6].start) / this.TRANSITIONS[6].duration;
      opacities[6] = 1 - progress;
      opacities[7] = progress;
    } else {
      // After all transitions: only bg8
      opacities[7] = 1;
    }
    
    return opacities;
  }

  /**
   * Draw a single background image with looping
   */
  private drawSingleBackground(img: HTMLImageElement, alpha: number): void {
    if (alpha <= 0) return;
    
    const scale = this.canvas.height / img.height;
    const scaledWidth = img.width * scale;
    
    // Calculate starting X position
    const startX = -(this.backgroundOffset * scale) % scaledWidth;
    
    let x = startX;
    while (x > 0) {
      x -= scaledWidth;
    }
    
    // Set opacity for transition
    this.ctx.globalAlpha = alpha;
    
    // Draw images to cover the entire canvas
    while (x < this.canvas.width) {
      this.ctx.drawImage(
        img,
        x, 0,
        scaledWidth, this.canvas.height
      );
      x += scaledWidth;
    }
    
    // Reset opacity
    this.ctx.globalAlpha = 1;
  }

  /**
   * Draw the looping background with transition effect
   */
  private drawBackground(distance: number): void {
    // Draw placeholder if first image not loaded
    if (!this.bgLoaded[0]) {
      this.ctx.fillStyle = '#2D3748';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    const opacities = this.getBackgroundOpacities(distance);
    
    // Draw each background with its opacity
    this.backgrounds.forEach((bg, index) => {
      if (this.bgLoaded[index] && opacities[index] > 0) {
        this.drawSingleBackground(bg, opacities[index]);
      }
    });
  }

  /**
   * Get canvas context (for UI drawing)
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /**
   * Reset parallax offsets
   */
  reset(): void {
    this.backgroundOffset = 0;
    this.warningFlashTimer = 0;
    this.warningVisible = true;
  }
}
