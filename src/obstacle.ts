import { CANVAS_DIMENSIONS } from './constants';

/**
 * Obstacle types
 */
export type ObstacleType = 'rock' | 'fence' | 'barrel';

/**
 * Single obstacle instance
 */
export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
}

/**
 * Obstacle configuration
 */
const OBSTACLE_CONFIG = {
  minSpawnInterval: 800,   // Minimum distance between obstacles (in meters)
  maxSpawnInterval: 2000,  // Maximum distance between obstacles
  types: {
    rock: { width: 60, height: 50, color: '#6B7280' },
    fence: { width: 40, height: 70, color: '#8B4513' },
    barrel: { width: 50, height: 55, color: '#D97706' },
  },
  groundY: CANVAS_DIMENSIONS.height - 55,  // Ground level for obstacles
};

/**
 * ObstacleManager - Handles spawning, updating, and drawing obstacles
 */
export class ObstacleManager {
  private obstacles: Obstacle[] = [];
  private nextSpawnDistance: number = 0;
  private readonly START_DISTANCE = 5000;  // Start spawning at 5000m
  
  constructor() {
    this.reset();
  }

  /**
   * Reset obstacles
   */
  reset(): void {
    this.obstacles = [];
    this.nextSpawnDistance = this.START_DISTANCE + this.getRandomSpawnInterval();
  }

  /**
   * Get random spawn interval
   */
  private getRandomSpawnInterval(): number {
    return OBSTACLE_CONFIG.minSpawnInterval + 
      Math.random() * (OBSTACLE_CONFIG.maxSpawnInterval - OBSTACLE_CONFIG.minSpawnInterval);
  }

  /**
   * Get random obstacle type
   */
  private getRandomType(): ObstacleType {
    const types: ObstacleType[] = ['rock', 'fence', 'barrel'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Spawn a new obstacle
   */
  private spawnObstacle(): void {
    const type = this.getRandomType();
    const config = OBSTACLE_CONFIG.types[type];
    
    const obstacle: Obstacle = {
      x: CANVAS_DIMENSIONS.width + 50,  // Spawn just off-screen right
      y: OBSTACLE_CONFIG.groundY - config.height,
      width: config.width,
      height: config.height,
      type: type,
    };
    
    this.obstacles.push(obstacle);
  }

  /**
   * Update obstacles based on game state
   */
  update(distance: number, speed: number, deltaTime: number): void {
    // Only spawn obstacles after START_DISTANCE
    if (distance < this.START_DISTANCE) {
      return;
    }

    // Check if we should spawn a new obstacle
    if (distance >= this.nextSpawnDistance) {
      this.spawnObstacle();
      this.nextSpawnDistance = distance + this.getRandomSpawnInterval();
    }

    // Move obstacles based on speed (they move left as horse "moves" right)
    const deltaSeconds = deltaTime / 1000;
    const movement = speed * deltaSeconds * 2;  // Obstacles move faster than background
    
    for (const obstacle of this.obstacles) {
      obstacle.x -= movement;
    }

    // Remove obstacles that are off-screen left
    this.obstacles = this.obstacles.filter(o => o.x + o.width > -50);
  }

  /**
   * Check collision between horse and obstacles
   */
  checkCollision(horseX: number, horseY: number, horseWidth: number, horseHeight: number): boolean {
    // Add some padding for more forgiving collision
    const padding = 15;
    
    for (const obstacle of this.obstacles) {
      // Simple AABB collision detection with padding
      const horseLeft = horseX + padding;
      const horseRight = horseX + horseWidth - padding;
      const horseTop = horseY + padding;
      const horseBottom = horseY + horseHeight - padding;
      
      const obsLeft = obstacle.x;
      const obsRight = obstacle.x + obstacle.width;
      const obsTop = obstacle.y;
      const obsBottom = obstacle.y + obstacle.height;
      
      if (horseRight > obsLeft && 
          horseLeft < obsRight && 
          horseBottom > obsTop && 
          horseTop < obsBottom) {
        return true;  // Collision detected
      }
    }
    
    return false;
  }

  /**
   * Draw all obstacles
   */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const obstacle of this.obstacles) {
      this.drawObstacle(ctx, obstacle);
    }
  }

  /**
   * Draw a single obstacle
   */
  private drawObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle): void {
    const config = OBSTACLE_CONFIG.types[obstacle.type];
    
    ctx.save();
    
    switch (obstacle.type) {
      case 'rock':
        this.drawRock(ctx, obstacle, config.color);
        break;
      case 'fence':
        this.drawFence(ctx, obstacle, config.color);
        break;
      case 'barrel':
        this.drawBarrel(ctx, obstacle, config.color);
        break;
    }
    
    ctx.restore();
  }

  /**
   * Draw a rock obstacle
   */
  private drawRock(ctx: CanvasRenderingContext2D, obs: Obstacle, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(obs.x + obs.width * 0.5, obs.y);
    ctx.lineTo(obs.x + obs.width, obs.y + obs.height * 0.7);
    ctx.lineTo(obs.x + obs.width * 0.8, obs.y + obs.height);
    ctx.lineTo(obs.x + obs.width * 0.2, obs.y + obs.height);
    ctx.lineTo(obs.x, obs.y + obs.height * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Highlight
    ctx.fillStyle = '#9CA3AF';
    ctx.beginPath();
    ctx.moveTo(obs.x + obs.width * 0.5, obs.y + 5);
    ctx.lineTo(obs.x + obs.width * 0.7, obs.y + obs.height * 0.4);
    ctx.lineTo(obs.x + obs.width * 0.4, obs.y + obs.height * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draw a fence obstacle
   */
  private drawFence(ctx: CanvasRenderingContext2D, obs: Obstacle, color: string): void {
    ctx.fillStyle = color;
    
    // Fence posts
    const postWidth = 8;
    ctx.fillRect(obs.x, obs.y, postWidth, obs.height);
    ctx.fillRect(obs.x + obs.width - postWidth, obs.y, postWidth, obs.height);
    
    // Horizontal bars
    ctx.fillRect(obs.x, obs.y + 10, obs.width, 8);
    ctx.fillRect(obs.x, obs.y + obs.height * 0.5, obs.width, 8);
    ctx.fillRect(obs.x, obs.y + obs.height - 18, obs.width, 8);
  }

  /**
   * Draw a barrel obstacle
   */
  private drawBarrel(ctx: CanvasRenderingContext2D, obs: Obstacle, color: string): void {
    ctx.fillStyle = color;
    
    // Main barrel body
    ctx.beginPath();
    ctx.ellipse(
      obs.x + obs.width / 2,
      obs.y + obs.height / 2,
      obs.width / 2,
      obs.height / 2,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Metal bands
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(obs.x + 5, obs.y + obs.height * 0.25);
    ctx.lineTo(obs.x + obs.width - 5, obs.y + obs.height * 0.25);
    ctx.moveTo(obs.x + 5, obs.y + obs.height * 0.75);
    ctx.lineTo(obs.x + obs.width - 5, obs.y + obs.height * 0.75);
    ctx.stroke();
  }

  /**
   * Get current obstacles (for debugging)
   */
  getObstacles(): Obstacle[] {
    return this.obstacles;
  }
}
