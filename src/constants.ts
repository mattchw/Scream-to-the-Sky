import type { GameConfig, Dimensions, ColorPalette } from './types';

// ===== Canvas Configuration =====
export const CANVAS_DIMENSIONS: Dimensions = {
  width: 1280,
  height: 720,
};

// ===== Game Configuration =====
export const GAME_CONFIG: GameConfig = {
  baseSpeed: 10,             // Base pixels per second (minimum running speed)
  maxSpeedBoost: 1000,        // Max additional speed from screaming louder
  volumeThreshold: 0.05,     // Higher threshold to filter background noise
  silenceGracePeriod: 0.3,   // 300ms grace period before game over
};

// ===== Color Palette - Chinese New Year Theme =====
export const COLORS: ColorPalette = {
  // Primary CNY Colors
  redPrimary: '#D62828',
  redDark: '#9B1B1B',
  redLight: '#FF4444',
  goldPrimary: '#F4A300',
  goldLight: '#FFD700',
  goldDark: '#B8860B',
  
  // Neutral Colors
  cream: '#F5E6C8',
  creamDark: '#E8D4B0',
  brown: '#5D4037',
  brownDark: '#3E2723',
  black: '#1A1A1A',
  white: '#FEFEFE',
  
  // Background Colors
  sky: '#87CEEB',
  skyLight: '#B0E0E6',
  mountain: '#6B8E7B',
  mountainDark: '#4A6B5A',
  grass: '#7CB342',
  grassDark: '#558B2F',
};

// ===== Horse Configuration =====
export const HORSE_CONFIG = {
  width: 64,
  height: 48,
  groundY: 650,              // Y position for horse feet (on the street in background image)
  animationFrames: 6,        // 6 frames in sprite sheet
  baseAnimationSpeed: 100,   // ms per frame at base speed
  minAnimationSpeed: 40,     // ms per frame at max speed
};

// ===== Parallax Layer Speeds =====
export const PARALLAX_SPEEDS = {
  sky: 0.1,
  mountains: 0.3,
  hills: 0.5,
  track: 1.0,
  decorations: 0.8,
};

// ===== UI Configuration =====
export const UI_CONFIG = {
  volumeMeterWidth: 120,
  volumeMeterHeight: 12,
};

// ===== Audio Configuration =====
export const AUDIO_CONFIG = {
  fftSize: 256,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
};

// ===== Animation Timing =====
export const TIMING = {
  gameOverDelay: 300,        // ms before showing game over screen
  fadeInDuration: 300,       // ms for UI fade transitions
};
