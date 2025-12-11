# Nono - Nonogram Puzzle Game

A retro-styled nonogram puzzle game built with Phaser 3, designed for gamepad-first gameplay.

## Features

- **Gamepad-first controls** - Navigate menus and play puzzles using a gamepad (D-pad for navigation, A to fill/select, B to mark X/go back)
- **Keyboard fallback** - Arrow keys, Enter, and Escape provide the same functionality for debugging
- **Multiple gamepads** - Each connected gamepad gets its own colored cursor for local multiplayer puzzle solving
- **Save system** - 3 save slots with automatic progress persistence
- **Responsive design** - UI scales based on window height for consistent experience at any resolution
- **Curated puzzles** - 9 handcrafted puzzles across 3 difficulties (Easy 5x5, Medium 10x10, Hard 15x15)
- **Infinite mode** - Randomly generated puzzles for endless gameplay
- **Progress tracking** - Track completion percentage and infinite puzzles solved per save slot

## Installation

```bash
npm install
```

## Running the Game

```bash
npm start
```

Then open your browser to `http://localhost:3000`

## Controls

### Gamepad
- **D-pad**: Navigate menus and move cursor on puzzle grid
- **A button**: Select menu items / Fill cell
- **B button**: Go back / Mark cell with X

### Keyboard (for debugging)
- **Arrow keys**: Navigate menus and move cursor
- **Enter**: Select / Fill
- **Escape**: Back / Mark X

## How to Play Nonograms

Nonograms (also known as Picross or Griddlers) are logic puzzles where you fill in cells based on number clues:

1. Each row and column has number clues indicating consecutive groups of filled cells
2. For example, "3 2" means there's a group of 3 filled cells, then a gap, then 2 filled cells
3. Fill cells with **A** button, mark cells you know are empty with **B** button (shows X)
4. Complete the puzzle when all filled cells match the solution

## Adding Custom Puzzles

Edit `public/puzzles/puzzles.json` to add new puzzles:

```json
{
    "id": "unique_id",
    "name": "Display Name",
    "difficulty": "easy|medium|hard",
    "width": 5,
    "height": 5,
    "solution": [
        [0, 1, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0]
    ]
}
```

- `solution`: 2D array where 1 = filled, 0 = empty
- `difficulty`: "easy" for 5x5, "medium" for 10x10, "hard" for 15x15

## Project Structure

```
nono/
├── server.js              # Express server
├── public/
│   ├── index.html         # Game HTML
│   ├── css/style.css      # Fullscreen styling
│   ├── puzzles/
│   │   └── puzzles.json   # Puzzle definitions
│   └── js/
│       ├── main.js        # Phaser game config
│       ├── scenes/        # Game scenes
│       │   ├── BootScene.js
│       │   ├── ProfileSelectScene.js
│       │   ├── MainMenuScene.js
│       │   ├── PuzzleSelectScene.js
│       │   ├── GameScene.js
│       │   └── VictoryScene.js
│       └── utils/
│           ├── InputManager.js   # Gamepad/keyboard handling
│           ├── UIScale.js        # Responsive scaling
│           ├── SaveManager.js    # LocalStorage persistence
│           └── AssetGenerator.js # Programmatic assets
└── package.json
```

## Development

Format code with Prettier:
```bash
npm run format
```

## Technical Details

- Built with Phaser 3.70
- All assets generated programmatically (no external image files needed)
- Save data stored in browser LocalStorage
- Responsive UI based on percentage of screen height
- Server provides puzzle data via `/api/puzzles` endpoint
- Infinite puzzles generated server-side via `/api/infinite` endpoint

## License

MIT
