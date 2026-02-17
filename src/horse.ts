import { HORSE_CONFIG } from './constants';
import type { Position } from './types';

/**
 * Horse class - Uses sprite sheet for animation
 * 6-frame galloping animation from sprite sheet image
 * Transitions to flying horse (Pegasus) at 15000m
 */
export class Horse {
  private x: number;
  private y: number;
  private currentFrame: number = 0;
  private frameTimer: number = 0;
  private animationSpeed: number = HORSE_CONFIG.baseAnimationSpeed;

  // Running sprite sheet
  private spriteSheet: HTMLImageElement;
  private spriteLoaded: boolean = false;

  // Flying sprite sheet
  private flyingSpriteSheet: HTMLImageElement;
  private flyingSpriteLoaded: boolean = false;
  private flyingFrameWidth: number = 0;
  private flyingFrameHeight: number = 0;

  // Sprite sheet layout: 2 columns x 3 rows = 6 frames
  private readonly cols = 2;
  private readonly rows = 3;
  private readonly totalFrames = 6;

  // Each frame dimensions (will be calculated after image loads)
  private frameWidth: number = 0;
  private frameHeight: number = 0;

  // Display scale
  private readonly scale = 1;

  // Transition settings
  private readonly TRANSITION_START = 5000;  // Start transition at 5000m
  private readonly TRANSITION_DURATION = 500; // Over 500m
  private readonly BASE_FLY_HEIGHT = 0;      // Base height when flying
  private readonly MAX_PITCH_HEIGHT = 400;   // Max height above neutral when pitch is high
  private currentDistance: number = 0;

  // Flying challenge mode (off by default)
  private flyingModeEnabled: boolean = false;

  // Pitch-based flying height
  private currentPitchHeight: number = 0;     // Current extra height from pitch
  private targetPitchHeight: number = 0;      // Target height (smoothed)

  constructor() {
    this.x = 50;
    this.y = HORSE_CONFIG.groundY;

    // Load running sprite sheet
    this.spriteSheet = new Image();
    this.spriteSheet.onload = () => {
      this.spriteLoaded = true;
      // Calculate frame dimensions from the loaded image
      this.frameWidth = this.spriteSheet.width / this.cols;
      this.frameHeight = this.spriteSheet.height / this.rows;
      // Adjust Y position based on sprite height
      this.y = HORSE_CONFIG.groundY - (this.frameHeight * this.scale);
    };
    this.spriteSheet.src = '/horse-sprite.png';

    // Load flying sprite sheet
    this.flyingSpriteSheet = new Image();
    this.flyingSpriteSheet.onload = () => {
      this.flyingSpriteLoaded = true;
      this.flyingFrameWidth = this.flyingSpriteSheet.width / this.cols;
      this.flyingFrameHeight = this.flyingSpriteSheet.height / this.rows;
    };
    this.flyingSpriteSheet.src = '/horse-sprite-flying.png';
  }

  getPosition(): Position {
    return { x: this.x, y: this.y };
  }

  /**
   * Enable or disable flying challenge mode
   */
  setFlyingModeEnabled(enabled: boolean): void {
    this.flyingModeEnabled = enabled;
  }

  /**
   * Get collision bounds for the horse
   */
  getBounds(): { x: number; y: number; width: number; height: number } {
    const width = this.spriteLoaded ? this.frameWidth * this.scale : 80;
    const height = this.spriteLoaded ? this.frameHeight * this.scale : 60;
    return {
      x: this.x,
      y: this.y,
      width: width,
      height: height,
    };
  }

  update(
    deltaTime: number,
    speed: number,
    distance: number = 0,
    currentPitch: number = 0,
    referencePitch: number = 0
  ): void {
    // Track current distance for sprite transition
    this.currentDistance = distance;

    // Only animate when moving (speed > 0)
    if (speed > 0) {
      // Calculate animation speed based on movement speed
      const speedRatio = speed / 300;
      this.animationSpeed = Math.max(
        HORSE_CONFIG.minAnimationSpeed,
        HORSE_CONFIG.baseAnimationSpeed - (speedRatio * 100)
      );

      // Update frame timer
      this.frameTimer += deltaTime;

      // Advance frame when timer exceeds animation speed
      if (this.frameTimer >= this.animationSpeed) {
        this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
        this.frameTimer = 0;
      }
    } else {
      // Reset to standing frame when stationary
      this.currentFrame = 0;
      this.frameTimer = 0;
    }

    // Calculate flying transition progress
    const flyProgress = this.getTransitionProgress();

    // Pitch controls flying height: high pitch = fly higher, low pitch = fly lower
    if (flyProgress > 0 && referencePitch > 0 && currentPitch > 0) {
      // Reference pitch = neutral height. Difference from reference maps to up/down.
      const pitchRatio = currentPitch / referencePitch;
      const rawOffset = (pitchRatio - 1) * this.MAX_PITCH_HEIGHT;
      this.targetPitchHeight = Math.max(0, Math.min(this.MAX_PITCH_HEIGHT, rawOffset));
      const smoothing = deltaTime * 0.005;
      this.currentPitchHeight += (this.targetPitchHeight - this.currentPitchHeight) * smoothing;
    } else {
      this.currentPitchHeight += (0 - this.currentPitchHeight) * (deltaTime * 0.005);
    }

    // Calculate Y position - horse rises when transitioning to flying
    if (this.spriteLoaded) {
      const baseY = HORSE_CONFIG.groundY - (this.frameHeight * this.scale);
      const baseFlyOffset = flyProgress * this.BASE_FLY_HEIGHT;
      const pitchFlyOffset = flyProgress * this.currentPitchHeight;
      this.y = baseY - baseFlyOffset - pitchFlyOffset;
    }
  }

  /**
   * Get the transition progress from running to flying (0 to 1)
   * Returns 0 if flying mode is disabled
   */
  private getTransitionProgress(): number {
    if (!this.flyingModeEnabled) return 0;
    if (this.currentDistance < this.TRANSITION_START) return 0;
    const progress = (this.currentDistance - this.TRANSITION_START) / this.TRANSITION_DURATION;
    return Math.min(1, Math.max(0, progress));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.spriteLoaded) {
      // Draw placeholder while loading
      ctx.fillStyle = '#C4884D';
      ctx.fillRect(this.x, this.y - 60, 80, 60);
      return;
    }

    // Calculate which frame to draw from the sprite sheet
    // Layout: 2 columns x 3 rows, reading top-to-bottom, then left-to-right
    const row = this.currentFrame % this.rows;
    const col = Math.floor(this.currentFrame / this.rows);

    const sourceX = col * this.frameWidth;
    const sourceY = row * this.frameHeight;

    const destWidth = this.frameWidth * this.scale;
    const destHeight = this.frameHeight * this.scale;

    // Get transition progress
    const flyProgress = this.getTransitionProgress();

    ctx.save();

    // Draw running horse (fading out during transition)
    if (flyProgress < 1) {
      ctx.globalAlpha = 1 - flyProgress;
      ctx.drawImage(
        this.spriteSheet,
        sourceX, sourceY,
        this.frameWidth, this.frameHeight,
        this.x, this.y,
        destWidth, destHeight
      );
    }

    // Draw flying horse (fading in during transition)
    if (flyProgress > 0 && this.flyingSpriteLoaded) {
      ctx.globalAlpha = flyProgress;

      const flySourceX = col * this.flyingFrameWidth;
      const flySourceY = row * this.flyingFrameHeight;
      const flyDestWidth = this.flyingFrameWidth * this.scale;
      const flyDestHeight = this.flyingFrameHeight * this.scale;

      ctx.drawImage(
        this.flyingSpriteSheet,
        flySourceX, flySourceY,
        this.flyingFrameWidth, this.flyingFrameHeight,
        this.x, this.y,
        flyDestWidth, flyDestHeight
      );
    }

    ctx.restore();
  }

  reset(): void {
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.animationSpeed = HORSE_CONFIG.baseAnimationSpeed;
    this.currentDistance = 0;
    this.currentPitchHeight = 0;
    this.targetPitchHeight = 0;
    // Note: flyingModeEnabled is set explicitly via setFlyingModeEnabled() before game starts
    if (this.spriteLoaded) {
      this.y = HORSE_CONFIG.groundY - (this.frameHeight * this.scale);
    }
  }
}
