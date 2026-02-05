import { Game } from './game';

/**
 * Main entry point for the Horse Racing Scream Game
 * Initializes the game when the DOM is ready
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Get canvas element
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  // Create and initialize the game
  const game = new Game(canvas);
  game.initialize();

  // Handle page visibility changes (pause when tab is hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.pause();
    } else {
      game.resume();
    }
  });

  // Handle window resize (optional - for responsive canvas)
  window.addEventListener('resize', () => {
    // Canvas maintains fixed size, but could add responsive logic here
  });

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    game.dispose();
  });

  // Log game info
  console.log('🐴 Horse Racing Scream Game loaded!');
  console.log('🎤 Scream into your microphone to make your horse gallop faster!');
  console.log('⚡ Watch your stamina - rest when needed!');
});
