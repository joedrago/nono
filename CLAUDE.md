# CLAUDE.md - Project Guide for AI Assistants

This document provides context for AI assistants working on this codebase.

## Project Overview

Nono is a retro-styled nonogram puzzle game built with Phaser 3. The game is designed for gamepad-first gameplay with keyboard fallback for debugging. Static files are served via Express from the `web/` directory.

## Key Architecture Decisions

### Scene Structure
The game uses Phaser's scene system with the following flow:
```
BootScene → ProfileSelectScene → MainMenuScene → PuzzleSelectScene → GameScene → VictoryScene
```

### Input System
- `InputManager.js` provides a unified interface for gamepad and keyboard input
- All input events are emitted as: `up`, `down`, `left`, `right`, `accept`, `back`
- Multi-gamepad support: each gamepad gets a unique cursor color
- Keyboard acts as "gamepad -1" for debugging

### UI Scaling
- `UIScale.js` provides responsive sizing based on screen height
- All measurements use `uiScale.percent(n)` for percentage of height
- Never use hardcoded pixel values for UI elements

### Save System
- `SaveManager.js` handles LocalStorage persistence
- 3 save slots numbered 1-3
- Stores: completed puzzles, in-progress puzzle state, infinite mode count
- Current slot stored separately from slot data

### Asset Generation
- `AssetGenerator.js` creates all graphical assets programmatically
- No external image files needed
- Assets generated in BootScene.create()

## Code Conventions

### Formatting
All JS files must be formatted with Prettier:
```bash
npm run format
```

Settings (in package.json):
- printWidth: 130
- tabWidth: 4
- trailingComma: "none"
- semi: false

### Linting
Run ESLint on all edited files after making changes:
```bash
npm run lint
```

- Fix any errors before committing
- Unused variables must be prefixed with underscore (e.g., `_gamepadIndex`)
- Phaser is defined as a global in eslint.config.mjs
- The web/js/lib/ directory is excluded from linting

### Scene Lifecycle
Each scene follows this pattern:
1. `init(data)` - Receive data from previous scene
2. `create()` - Set up UIScale, InputManager, create UI
3. `setupInput()` - Register input event handlers
4. `handleResize()` - Recreate UI on window resize
5. `shutdown()` - Clean up InputManager

### Input Handling Pattern
```javascript
this.inputManager.on("accept", (gamepadIndex) => {
    // Handle accept action
    // gamepadIndex is -1 for keyboard, 0+ for gamepads
})
```

## File Locations

| Purpose | Location |
|---------|----------|
| Express server | `server.js` |
| Game entry point | `web/js/main.js` |
| Scenes | `web/js/scenes/*.js` |
| Utilities | `web/js/utils/*.js` |
| Puzzle data | `web/puzzles/puzzles.json` |
| Phaser library | `web/js/lib/phaser.min.js` |

## Adding New Features

### Adding a New Puzzle
1. Edit `web/puzzles/puzzles.json`
2. Add puzzle object with: id, name, difficulty, width, height, solution
3. Solution is 2D array: 1 = filled, 0 = empty

### Adding a New Scene
1. Create file in `web/js/scenes/NewScene.js`
2. Import and use InputManager, UIScale, SaveManager as needed
3. Add scene to imports and config in `web/js/main.js`
4. Follow existing scene patterns for consistency

### Modifying Input Handling
- Edit `InputManager.js` for new input types
- Gamepad button mapping is in `pollGamepads()`
- Keyboard mapping is in `keyToAction()`

## Common Tasks

### Run the game
```bash
npm start
```
Then open http://localhost:3080 in a browser.

### Format code
```bash
npm run format
```

### Test gamepad
1. Connect gamepad before opening game
2. Multiple gamepads show multiple colored cursors in GameScene
3. All cursors can interact with the grid independently

## Debugging Tips

- Check browser console for errors
- InputManager logs gamepad connections
- Use keyboard (arrows, Enter, Escape) to test without gamepad
- LocalStorage data visible in browser DevTools → Application → Local Storage

## Dependencies

- **express**: Web server for serving static files
- **phaser**: Game engine (loaded locally from web/js/lib/)
- **prettier**: Code formatting (dev)
- **eslint**: Linting (dev)
- All future puzzles added to puzzles.json must be considered valid by the NonogramValidator class.
