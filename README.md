# Last Stand

A 2D side-scrolling zombie defense game where you build fortifications and fight off waves of zombies.

## Game Overview

In this game, you play as a survivor defending against hordes of zombies. The game is divided into two phases:

1. Preparation Phase: Build your defenses using various materials.
2. Battle Phase: Fight off waves of zombies using your fortifications and weapons.

## Controls

- **Left Arrow / A**: Move left
- **Right Arrow / D**: Move right
- **Space / Up Arrow / W**: Jump / Activate jetpack
- **Mouse Click**: Shoot (during battle phase) / Place objects (during preparation phase)
- **Mouse Wheel**: Adjust shooting angle

## Game Mechanics

### Preparation Phase

- You have 60 seconds to set up your defenses.
- Available materials:
  - Metal Boxes: Basic building blocks
  - Cannons: Automated defense turrets
  - Traps: Floor hazards that damage zombies

### Battle Phase

- Defend against waves of zombies.
- Two types of zombies:
  - Normal Zombies
  - Climber Zombies (can jump over obstacles)

### Scoring System

- Score points for each zombie killed.
- Try to survive as long as possible to achieve a high score.

### Power-ups

Zombies have a chance to drop power-ups when killed:

- Health Power-up: Temporary immunity
- Ammo Power-up: Increased fire rate

## Physics System

The game features a custom physics engine that includes:

- Gravity
- Collision detection and response
- Velocity-based movement
- Projectile trajectories

## Special Features

- Jetpack with limited fuel
- Infinite scrolling platform
- Dynamic camera that follows the player
- Leaderboard system (stored locally)

## Technical Details

- Built using HTML5 Canvas and JavaScript
- Sprite-based animations
- Frame-rate independent game loop
