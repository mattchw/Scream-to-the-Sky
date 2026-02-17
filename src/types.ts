// ===== Game State Interface =====
export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  distance: number;
  speed: number;
  volumeLevel: number;
  screamTime: number;        // Time spent screaming in seconds
  isScreaming: boolean;      // Currently screaming
  flyingMode: boolean;       // Horse transitions to Pegasus at 5000m
  obstaclesEnabled: boolean; // Spawn obstacles (only works with flying mode)
}

// ===== Game Configuration Interface =====
export interface GameConfig {
  baseSpeed: number;
  maxSpeedBoost: number;
  volumeThreshold: number;   // 0–1 normalised volume needed to count as screaming
  silenceGracePeriod: number; // Seconds of silence before game over
}

// ===== Canvas Dimensions =====
export interface Dimensions {
  width: number;
  height: number;
}

// ===== Position Interface =====
export interface Position {
  x: number;
  y: number;
}

// ===== Sprite Frame Interface =====
export interface SpriteFrame {
  pixels: string[][];
  width: number;
  height: number;
}

// ===== Parallax Layer Interface =====
export interface ParallaxLayer {
  speed: number;
  offset: number;
  elements: LayerElement[];
}

export interface LayerElement {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

// ===== Color Palette =====
export interface ColorPalette {
  redPrimary: string;
  redDark: string;
  redLight: string;
  goldPrimary: string;
  goldLight: string;
  goldDark: string;
  cream: string;
  creamDark: string;
  brown: string;
  brownDark: string;
  black: string;
  white: string;
  sky: string;
  skyLight: string;
  mountain: string;
  mountainDark: string;
  grass: string;
  grassDark: string;
}

// ===== Screen Types =====
export type ScreenType = 'start' | 'game' | 'gameover';

// ===== Audio State =====
export interface AudioState {
  isEnabled: boolean;
  currentVolume: number;
  analyser: AnalyserNode | null;
}
