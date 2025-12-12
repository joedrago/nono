import { InputManager } from "../utils/InputManager.js"
import { UIScale } from "../utils/UIScale.js"
import { SaveManager } from "../utils/SaveManager.js"
import { ThemeManager } from "../utils/ThemeManager.js"
import { NonogramValidator } from "../utils/NonogramValidator.js"

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "GameScene" })
    }

    init(data) {
        this.puzzle = data.puzzle
        this.infiniteMode = data.infinite || false
        this.infiniteDifficulty = data.difficulty
    }

    create() {
        this.uiScale = new UIScale(this)
        this.inputManager = InputManager.getInstance(this.game)
        this.inputManager.setActiveScene(this)
        this.saveManager = new SaveManager()
        this.themeManager = new ThemeManager(this.saveManager)

        // Cell states: 0 = empty, 1 = filled, 2 = marked (X)
        this.EMPTY = 0
        this.FILLED = 1
        this.MARKED = 2

        this.paused = false
        this.pauseIndex = 0

        // Load settings from profile
        this.showErrors = this.saveManager.getShowErrors()
        this.dimHints = this.saveManager.getDimHints()
        this.peekErrors = false

        // Set background color from theme
        this.cameras.main.setBackgroundColor(this.themeManager.graphics.background)

        // Track drag state per gamepad for hold-to-fill behavior
        // Maps gamepadIndex -> { sourceState, targetState }
        this.dragState = new Map()

        // Tap mode for touch/mouse input: "fill" or "mark"
        this.tapMode = "fill"

        // Initialize or load puzzle state
        if (this.infiniteMode) {
            this.generateInfinitePuzzle()
        } else {
            this.loadPuzzleState()
        }

        // Calculate hints
        this.rowHints = this.calculateRowHints()
        this.colHints = this.calculateColHints()

        // Multi-cursor support - track cursor position per gamepad
        this.cursors = new Map()
        this.initCursors()

        this.createUI()
        this.setupInput()

        this.scale.on("resize", () => this.handleResize())
    }

    generateInfinitePuzzle() {
        const sizes = { easy: 5, medium: 10, hard: 15 }
        const size = sizes[this.infiniteDifficulty] || 5
        const validator = new NonogramValidator()

        // Generate a valid, solvable puzzle
        const result = validator.generateValidPuzzle(size, size, 50)

        if (result && result.valid) {
            this.puzzle = {
                id: "infinite_" + Date.now(),
                name: "Infinite",
                difficulty: this.infiniteDifficulty,
                width: size,
                height: size,
                solution: result.solution
            }
        } else {
            // Fallback to simple pattern if generation fails
            this.puzzle = {
                id: "infinite_" + Date.now(),
                name: "Infinite",
                difficulty: this.infiniteDifficulty,
                width: size,
                height: size,
                solution: this.generateFallbackSolution(size, size)
            }
        }

        this.playerGrid = Array(this.puzzle.height)
            .fill(null)
            .map(() => Array(this.puzzle.width).fill(this.EMPTY))
    }

    generateFallbackSolution(width, height) {
        // Generate a simple diagonal pattern that's always solvable
        const solution = []
        for (let y = 0; y < height; y++) {
            const row = []
            for (let x = 0; x < width; x++) {
                // Simple pattern: checkerboard with some filled rows/cols
                row.push((x + y) % 3 === 0 ? 1 : 0)
            }
            solution.push(row)
        }
        return solution
    }

    loadPuzzleState() {
        // If puzzle is already completed, load the solution
        if (this.saveManager.isPuzzleCompleted(this.puzzle.id)) {
            this.playerGrid = this.puzzle.solution.map((row) => row.map((cell) => (cell === 1 ? this.FILLED : this.EMPTY)))
            return
        }

        const progress = this.saveManager.getPuzzleProgress(this.puzzle.id)

        if (progress) {
            // Restore saved progress
            this.playerGrid = Array(this.puzzle.height)
                .fill(null)
                .map(() => Array(this.puzzle.width).fill(this.EMPTY))

            progress.filled.forEach(([x, y]) => {
                this.playerGrid[y][x] = this.FILLED
            })
            progress.marked.forEach(([x, y]) => {
                this.playerGrid[y][x] = this.MARKED
            })
        } else {
            // Fresh grid
            this.playerGrid = Array(this.puzzle.height)
                .fill(null)
                .map(() => Array(this.puzzle.width).fill(this.EMPTY))
        }
    }

    saveProgress() {
        if (this.infiniteMode) return

        const filled = []
        const marked = []

        for (let y = 0; y < this.puzzle.height; y++) {
            for (let x = 0; x < this.puzzle.width; x++) {
                if (this.playerGrid[y][x] === this.FILLED) {
                    filled.push([x, y])
                } else if (this.playerGrid[y][x] === this.MARKED) {
                    marked.push([x, y])
                }
            }
        }

        this.saveManager.savePuzzleProgress(this.puzzle.id, { filled, marked })
    }

    calculateRowHints() {
        const hints = []
        for (let y = 0; y < this.puzzle.height; y++) {
            const rowHints = []
            let count = 0
            for (let x = 0; x < this.puzzle.width; x++) {
                if (this.puzzle.solution[y][x] === 1) {
                    count++
                } else if (count > 0) {
                    rowHints.push(count)
                    count = 0
                }
            }
            if (count > 0) rowHints.push(count)
            hints.push(rowHints.length > 0 ? rowHints : [0])
        }
        return hints
    }

    calculateColHints() {
        const hints = []
        for (let x = 0; x < this.puzzle.width; x++) {
            const colHints = []
            let count = 0
            for (let y = 0; y < this.puzzle.height; y++) {
                if (this.puzzle.solution[y][x] === 1) {
                    count++
                } else if (count > 0) {
                    colHints.push(count)
                    count = 0
                }
            }
            if (count > 0) colHints.push(count)
            hints.push(colHints.length > 0 ? colHints : [0])
        }
        return hints
    }

    initCursors() {
        // Cursors are now lazily initialized when input is received
        // No need to pre-create the keyboard cursor since all input sources
        // are treated as virtual gamepads with continuous indices
    }

    getCursor(gamepadIndex) {
        if (!this.cursors.has(gamepadIndex)) {
            this.cursors.set(gamepadIndex, {
                x: Math.floor(this.puzzle.width / 2),
                y: Math.floor(this.puzzle.height / 2),
                color: this.themeManager.getCursorColor(gamepadIndex)
            })
        }
        return this.cursors.get(gamepadIndex)
    }

    createUI() {
        this.uiContainer = this.add.container(0, 0)
        const theme = this.themeManager.getTheme()

        // Calculate cell size based on puzzle dimensions
        this.cellSize = this.uiScale.getCellSize(this.puzzle.width, this.puzzle.height)

        // Calculate max hint width/height for positioning
        this.maxRowHintWidth = Math.max(...this.rowHints.map((h) => h.length)) * this.cellSize * 0.6
        this.maxColHintHeight = Math.max(...this.colHints.map((h) => h.length)) * this.cellSize * 0.6

        // Grid position (centered with hints offset)
        this.gridOffsetX = this.uiScale.centerX - (this.puzzle.width * this.cellSize) / 2 + this.maxRowHintWidth / 2
        this.gridOffsetY = this.uiScale.centerY - (this.puzzle.height * this.cellSize) / 2 + this.maxColHintHeight / 2

        // Draw hints
        this.drawRowHints()
        this.drawColHints()

        // Draw grid
        this.drawGrid()

        // Draw cursors
        this.drawCursors()

        // Puzzle name (or difficulty/ordinal if not completed)
        const isCompleted = this.saveManager.isPuzzleCompleted(this.puzzle.id)
        let displayName
        if (this.infiniteMode) {
            displayName = "Infinite"
        } else if (isCompleted) {
            displayName = this.puzzle.name
        } else {
            const ordinalStr = String(this.puzzle.ordinal || 0).padStart(3, "0")
            const difficultyLabel = this.puzzle.difficulty.charAt(0).toUpperCase() + this.puzzle.difficulty.slice(1)
            displayName = `${difficultyLabel} #${ordinalStr}`
        }
        this.nameText = this.add.text(this.uiScale.percent(3), this.uiScale.percent(3), displayName, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.medium + "px",
            color: theme.text.subtitle
        })
        this.uiContainer.add(this.nameText)

        // Instructions
        this.instructions = this.add.text(
            this.uiScale.centerX,
            this.uiScale.percent(95),
            "[A] Fill   [B] Mark X   [Start] Menu",
            {
                fontFamily: theme.font,
                fontSize: this.uiScale.fontSize.small + "px",
                color: theme.text.instructions
            }
        )
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)

        // Draw tap mode buttons if tap input is active
        this.drawTapButtons()
    }

    drawTapButtons() {
        // Clean up old buttons
        if (this.tapButtonContainer) {
            this.tapButtonContainer.destroy()
        }

        // Only draw if tap is active
        if (!this.inputManager.tapActive()) return

        const theme = this.themeManager.getTheme()
        this.tapButtonContainer = this.add.container(0, 0)
        this.uiContainer.add(this.tapButtonContainer)

        // Check if we're in portrait mode (aspect ratio < 1.0)
        const aspectRatio = this.uiScale.width / this.uiScale.height
        const isPortrait = aspectRatio < 1.0

        // Button sizing - half size in portrait mode
        this.tapButtonSize = this.uiScale.fontSize.title * (isPortrait ? 0.75 : 1.5)
        const buttonSpacing = this.tapButtonSize * 1.5

        // Position buttons differently based on orientation
        let fillButtonX, fillButtonY, markButtonX, markButtonY

        if (isPortrait) {
            // Portrait: center buttons horizontally below the grid
            const gridBottom = this.gridOffsetY + this.puzzle.height * this.cellSize
            const buttonsCenterX = this.uiScale.centerX
            const buttonsCenterY = gridBottom + this.uiScale.percent(5) + this.tapButtonSize / 2

            // Fill button (left)
            fillButtonX = buttonsCenterX - buttonSpacing / 2
            fillButtonY = buttonsCenterY

            // Mark button (right)
            markButtonX = buttonsCenterX + buttonSpacing / 2
            markButtonY = buttonsCenterY
        } else {
            // Landscape: position buttons to the left of the grid/hints
            const buttonsX = this.gridOffsetX - this.maxRowHintWidth - this.tapButtonSize
            const buttonsCenterY = this.gridOffsetY + (this.puzzle.height * this.cellSize) / 2

            // Fill button (top)
            fillButtonX = buttonsX
            fillButtonY = buttonsCenterY - buttonSpacing / 2

            // Mark button (bottom)
            markButtonX = buttonsX
            markButtonY = buttonsCenterY + buttonSpacing / 2
        }

        this.fillButtonX = fillButtonX
        this.fillButtonY = fillButtonY
        this.markButtonX = markButtonX
        this.markButtonY = markButtonY

        // Draw fill button (always filled square)
        const fillSelected = this.tapMode === "fill"
        const fillBg = this.add.graphics()
        fillBg.fillStyle(theme.graphics.cellFilled, 1)
        fillBg.fillRoundedRect(
            this.fillButtonX - this.tapButtonSize / 2,
            this.fillButtonY - this.tapButtonSize / 2,
            this.tapButtonSize,
            this.tapButtonSize,
            8
        )
        if (fillSelected) {
            fillBg.lineStyle(3, theme.graphics.selectionIndicator, 1)
            fillBg.strokeRoundedRect(
                this.fillButtonX - this.tapButtonSize / 2 - 4,
                this.fillButtonY - this.tapButtonSize / 2 - 4,
                this.tapButtonSize + 8,
                this.tapButtonSize + 8,
                10
            )
        }
        this.tapButtonContainer.add(fillBg)

        // Draw mark button (X mark)
        const markSelected = this.tapMode === "mark"
        const markBg = this.add.graphics()
        markBg.fillStyle(theme.graphics.panelBg, 1)
        markBg.fillRoundedRect(
            this.markButtonX - this.tapButtonSize / 2,
            this.markButtonY - this.tapButtonSize / 2,
            this.tapButtonSize,
            this.tapButtonSize,
            8
        )
        this.tapButtonContainer.add(markBg)

        // Draw X on mark button (separate graphics object)
        const markX = this.add.graphics()
        const xInset = this.tapButtonSize * 0.25
        markX.lineStyle(4, theme.graphics.cellMarker, 1)
        markX.moveTo(this.markButtonX - this.tapButtonSize / 2 + xInset, this.markButtonY - this.tapButtonSize / 2 + xInset)
        markX.lineTo(this.markButtonX + this.tapButtonSize / 2 - xInset, this.markButtonY + this.tapButtonSize / 2 - xInset)
        markX.moveTo(this.markButtonX + this.tapButtonSize / 2 - xInset, this.markButtonY - this.tapButtonSize / 2 + xInset)
        markX.lineTo(this.markButtonX - this.tapButtonSize / 2 + xInset, this.markButtonY + this.tapButtonSize / 2 - xInset)
        markX.strokePath()
        this.tapButtonContainer.add(markX)

        // Draw selection border for mark button (on top)
        if (markSelected) {
            const markBorder = this.add.graphics()
            markBorder.lineStyle(3, theme.graphics.selectionIndicator, 1)
            markBorder.strokeRoundedRect(
                this.markButtonX - this.tapButtonSize / 2 - 4,
                this.markButtonY - this.tapButtonSize / 2 - 4,
                this.tapButtonSize + 8,
                this.tapButtonSize + 8,
                10
            )
            this.tapButtonContainer.add(markBorder)
        }

        // Draw menu button in top right corner
        this.menuButtonX = this.uiScale.width - this.uiScale.percent(3) - this.tapButtonSize / 2
        this.menuButtonY = this.uiScale.percent(3) + this.tapButtonSize / 2

        const menuBg = this.add.graphics()
        menuBg.fillStyle(theme.graphics.panelBg, 1)
        menuBg.fillRoundedRect(
            this.menuButtonX - this.tapButtonSize / 2,
            this.menuButtonY - this.tapButtonSize / 2,
            this.tapButtonSize,
            this.tapButtonSize,
            8
        )
        // Draw three horizontal lines (hamburger menu icon)
        const lineInset = this.tapButtonSize * 0.25
        const lineSpacing = this.tapButtonSize * 0.2
        menuBg.lineStyle(3, theme.text.primary, 1)
        for (let i = -1; i <= 1; i++) {
            const lineY = this.menuButtonY + i * lineSpacing
            menuBg.moveTo(this.menuButtonX - this.tapButtonSize / 2 + lineInset, lineY)
            menuBg.lineTo(this.menuButtonX + this.tapButtonSize / 2 - lineInset, lineY)
        }
        menuBg.strokePath()
        this.tapButtonContainer.add(menuBg)
    }

    // Check if a row's hints appear to be satisfied by current player grid
    isRowHintComplete(rowIndex) {
        const playerRuns = this.getRunsFromLine(this.playerGrid[rowIndex])
        const hints = this.rowHints[rowIndex]
        return this.runsMatchHints(playerRuns, hints)
    }

    // Check if a column's hints appear to be satisfied by current player grid
    isColHintComplete(colIndex) {
        const colData = []
        for (let y = 0; y < this.puzzle.height; y++) {
            colData.push(this.playerGrid[y][colIndex])
        }
        const playerRuns = this.getRunsFromLine(colData)
        const hints = this.colHints[colIndex]
        return this.runsMatchHints(playerRuns, hints)
    }

    // Get runs of filled cells from a line
    getRunsFromLine(line) {
        const runs = []
        let count = 0
        for (const cell of line) {
            if (cell === this.FILLED) {
                count++
            } else if (count > 0) {
                runs.push(count)
                count = 0
            }
        }
        if (count > 0) runs.push(count)
        return runs.length > 0 ? runs : [0]
    }

    // Check if player runs match the hints exactly
    runsMatchHints(runs, hints) {
        if (runs.length !== hints.length) return false
        for (let i = 0; i < runs.length; i++) {
            if (runs[i] !== hints[i]) return false
        }
        return true
    }

    drawRowHints() {
        this.rowHintTexts = []
        const theme = this.themeManager.getTheme()

        for (let y = 0; y < this.puzzle.height; y++) {
            const hints = this.rowHints[y]
            const hintStr = hints.join(" ")
            const yPos = this.gridOffsetY + y * this.cellSize + this.cellSize / 2
            const isComplete = this.dimHints && this.isRowHintComplete(y)

            const text = this.add.text(this.gridOffsetX - this.uiScale.percent(2), yPos, hintStr, {
                fontFamily: theme.font,
                fontSize: this.cellSize * 0.5 + "px",
                color: isComplete ? theme.text.hintComplete : theme.text.hintNormal
            })
            text.setOrigin(1, 0.5)
            this.uiContainer.add(text)
            this.rowHintTexts.push(text)
        }
    }

    drawColHints() {
        this.colHintTexts = []
        const theme = this.themeManager.getTheme()

        for (let x = 0; x < this.puzzle.width; x++) {
            const hints = this.colHints[x]
            const hintStr = hints.join("\n")
            const xPos = this.gridOffsetX + x * this.cellSize + this.cellSize / 2
            const isComplete = this.dimHints && this.isColHintComplete(x)

            const text = this.add.text(xPos, this.gridOffsetY - this.uiScale.percent(2), hintStr, {
                fontFamily: theme.font,
                fontSize: this.cellSize * 0.5 + "px",
                color: isComplete ? theme.text.hintComplete : theme.text.hintNormal,
                align: "center"
            })
            text.setOrigin(0.5, 1)
            this.uiContainer.add(text)
            this.colHintTexts.push(text)
        }
    }

    drawGrid() {
        this.cellGraphics = []
        const theme = this.themeManager.getTheme()

        for (let y = 0; y < this.puzzle.height; y++) {
            const row = []
            for (let x = 0; x < this.puzzle.width; x++) {
                const cellX = this.gridOffsetX + x * this.cellSize
                const cellY = this.gridOffsetY + y * this.cellSize

                const cell = this.add.graphics()
                this.drawCell(cell, cellX, cellY, this.playerGrid[y][x], x, y)
                this.uiContainer.add(cell)
                row.push(cell)
            }
            this.cellGraphics.push(row)
        }

        // Grid lines
        this.gridLines = this.add.graphics()

        // Draw thin lines (not on 5th positions or outer border)
        this.gridLines.lineStyle(1, theme.graphics.gridLine, 0.5)
        for (let x = 1; x < this.puzzle.width; x++) {
            if (x % 5 !== 0) {
                const lineX = this.gridOffsetX + x * this.cellSize
                this.gridLines.moveTo(lineX, this.gridOffsetY)
                this.gridLines.lineTo(lineX, this.gridOffsetY + this.puzzle.height * this.cellSize)
            }
        }
        for (let y = 1; y < this.puzzle.height; y++) {
            if (y % 5 !== 0) {
                const lineY = this.gridOffsetY + y * this.cellSize
                this.gridLines.moveTo(this.gridOffsetX, lineY)
                this.gridLines.lineTo(this.gridOffsetX + this.puzzle.width * this.cellSize, lineY)
            }
        }
        this.gridLines.strokePath()

        // Thicker lines every 5 cells and outer border
        this.gridLines.lineStyle(3, theme.graphics.gridLineMajor, 1)
        for (let x = 0; x <= this.puzzle.width; x++) {
            if (x % 5 === 0 || x === this.puzzle.width) {
                const lineX = this.gridOffsetX + x * this.cellSize
                this.gridLines.moveTo(lineX, this.gridOffsetY)
                this.gridLines.lineTo(lineX, this.gridOffsetY + this.puzzle.height * this.cellSize)
            }
        }
        for (let y = 0; y <= this.puzzle.height; y++) {
            if (y % 5 === 0 || y === this.puzzle.height) {
                const lineY = this.gridOffsetY + y * this.cellSize
                this.gridLines.moveTo(this.gridOffsetX, lineY)
                this.gridLines.lineTo(this.gridOffsetX + this.puzzle.width * this.cellSize, lineY)
            }
        }
        this.gridLines.strokePath()

        this.uiContainer.add(this.gridLines)
    }

    drawCell(graphics, screenX, screenY, state, gridX, gridY) {
        graphics.clear()
        const theme = this.themeManager.getTheme()

        const padding = 2
        const size = this.cellSize - padding * 2

        // Show errors if setting is on OR if peeking
        const errorsVisible = this.showErrors || this.peekErrors

        // Check if this is an error (filled but shouldn't be)
        const isError = errorsVisible && state === this.FILLED && this.puzzle.solution[gridY][gridX] === 0

        if (state === this.EMPTY) {
            graphics.fillStyle(theme.graphics.cellEmpty, 1)
            graphics.fillRect(screenX + padding, screenY + padding, size, size)
        } else if (state === this.FILLED) {
            // Show errors in red/orange, correct fills in theme color
            graphics.fillStyle(isError ? theme.graphics.cellError : theme.graphics.cellFilled, 1)
            graphics.fillRect(screenX + padding, screenY + padding, size, size)
        } else if (state === this.MARKED) {
            graphics.fillStyle(theme.graphics.cellEmpty, 1)
            graphics.fillRect(screenX + padding, screenY + padding, size, size)
            // Draw X centered at 50% of cell size - use error color if marked but should be filled
            const isMarkedError = errorsVisible && this.puzzle.solution[gridY][gridX] === 1
            const markerColor = isMarkedError ? theme.graphics.cellMarkerError : theme.graphics.cellMarker
            const xInset = size * 0.25 // 25% inset from each edge leaves 50% in the middle
            graphics.lineStyle(3, markerColor, 1)
            graphics.moveTo(screenX + padding + xInset, screenY + padding + xInset)
            graphics.lineTo(screenX + padding + size - xInset, screenY + padding + size - xInset)
            graphics.moveTo(screenX + padding + size - xInset, screenY + padding + xInset)
            graphics.lineTo(screenX + padding + xInset, screenY + padding + size - xInset)
            graphics.strokePath()
        }
    }

    drawCursors() {
        if (this.cursorGraphics) {
            this.cursorGraphics.forEach((g) => g.destroy())
        }
        this.cursorGraphics = []

        this.cursors.forEach((cursor, _gamepadIndex) => {
            const g = this.add.graphics()
            const x = this.gridOffsetX + cursor.x * this.cellSize
            const y = this.gridOffsetY + cursor.y * this.cellSize

            g.lineStyle(3, cursor.color, 1)
            g.strokeRect(x, y, this.cellSize, this.cellSize)

            this.uiContainer.add(g)
            this.cursorGraphics.push(g)
        })
    }

    updateCursor(gamepadIndex) {
        this.getCursor(gamepadIndex) // Ensure cursor exists
        this.drawCursors()
    }

    updateCell(x, y) {
        const cellX = this.gridOffsetX + x * this.cellSize
        const cellY = this.gridOffsetY + y * this.cellSize
        this.drawCell(this.cellGraphics[y][x], cellX, cellY, this.playerGrid[y][x], x, y)
        this.updateHintColors()
    }

    updateHintColors() {
        if (!this.dimHints) return
        const theme = this.themeManager.getTheme()

        // Update row hints
        for (let y = 0; y < this.puzzle.height; y++) {
            const isComplete = this.isRowHintComplete(y)
            this.rowHintTexts[y].setColor(isComplete ? theme.text.hintComplete : theme.text.hintNormal)
        }

        // Update column hints
        for (let x = 0; x < this.puzzle.width; x++) {
            const isComplete = this.isColHintComplete(x)
            this.colHintTexts[x].setColor(isComplete ? theme.text.hintComplete : theme.text.hintNormal)
        }
    }

    setupInput() {
        // Helper to apply drag fill if conditions match
        const tryDragFill = (gamepadIndex) => {
            const drag = this.dragState.get(gamepadIndex)
            if (!drag) return

            const cursor = this.getCursor(gamepadIndex)
            const currentState = this.playerGrid[cursor.y][cursor.x]

            // Only apply if current cell matches the source state
            if (currentState === drag.sourceState) {
                this.playerGrid[cursor.y][cursor.x] = drag.targetState
                this.updateCell(cursor.x, cursor.y)
                this.playSound(drag.targetState === this.FILLED ? "fill" : drag.targetState === this.MARKED ? "mark" : "navigate")
            }
        }

        this.inputManager.on("up", (gamepadIndex) => {
            if (this.paused) {
                this.pauseIndex = (this.pauseIndex - 1 + this.pauseItems.length) % this.pauseItems.length
                this.updatePauseMenu()
                this.playSound("navigate")
                return
            }
            const cursor = this.getCursor(gamepadIndex)
            cursor.y = (cursor.y - 1 + this.puzzle.height) % this.puzzle.height
            this.updateCursor(gamepadIndex)
            tryDragFill(gamepadIndex)
            if (!this.dragState.has(gamepadIndex)) {
                this.playSound("navigate")
            }
        })

        this.inputManager.on("down", (gamepadIndex) => {
            if (this.paused) {
                this.pauseIndex = (this.pauseIndex + 1) % this.pauseItems.length
                this.updatePauseMenu()
                this.playSound("navigate")
                return
            }
            const cursor = this.getCursor(gamepadIndex)
            cursor.y = (cursor.y + 1) % this.puzzle.height
            this.updateCursor(gamepadIndex)
            tryDragFill(gamepadIndex)
            if (!this.dragState.has(gamepadIndex)) {
                this.playSound("navigate")
            }
        })

        this.inputManager.on("left", (gamepadIndex) => {
            if (this.paused) return
            const cursor = this.getCursor(gamepadIndex)
            cursor.x = (cursor.x - 1 + this.puzzle.width) % this.puzzle.width
            this.updateCursor(gamepadIndex)
            tryDragFill(gamepadIndex)
            if (!this.dragState.has(gamepadIndex)) {
                this.playSound("navigate")
            }
        })

        this.inputManager.on("right", (gamepadIndex) => {
            if (this.paused) return
            const cursor = this.getCursor(gamepadIndex)
            cursor.x = (cursor.x + 1) % this.puzzle.width
            this.updateCursor(gamepadIndex)
            tryDragFill(gamepadIndex)
            if (!this.dragState.has(gamepadIndex)) {
                this.playSound("navigate")
            }
        })

        // Accept button pressed - start drag for fill
        this.inputManager.on("acceptDown", (gamepadIndex) => {
            if (this.paused) return

            const cursor = this.getCursor(gamepadIndex)
            const currentState = this.playerGrid[cursor.y][cursor.x]

            // Determine source and target states
            const sourceState = currentState
            const targetState = currentState === this.FILLED ? this.EMPTY : this.FILLED

            // Store drag state
            this.dragState.set(gamepadIndex, { sourceState, targetState })

            // Apply to current cell
            this.playerGrid[cursor.y][cursor.x] = targetState
            this.updateCell(cursor.x, cursor.y)
            this.playSound("fill")
        })

        // Accept button released - end drag and check victory
        this.inputManager.on("acceptUp", (gamepadIndex) => {
            if (this.dragState.has(gamepadIndex)) {
                this.dragState.delete(gamepadIndex)
                this.saveProgress()
                this.checkVictory()
            }
        })

        // Handle accept for pause menu selection
        this.inputManager.on("accept", (_gamepadIndex) => {
            if (this.paused) {
                this.handlePauseSelection()
            }
        })

        // Back button pressed - start drag for mark
        this.inputManager.on("backDown", (gamepadIndex) => {
            if (this.paused) return

            const cursor = this.getCursor(gamepadIndex)
            const currentState = this.playerGrid[cursor.y][cursor.x]

            // Determine source and target states
            const sourceState = currentState
            const targetState = currentState === this.MARKED ? this.EMPTY : this.MARKED

            // Store drag state
            this.dragState.set(gamepadIndex, { sourceState, targetState })

            // Apply to current cell
            this.playerGrid[cursor.y][cursor.x] = targetState
            this.updateCell(cursor.x, cursor.y)
            this.playSound("mark")
        })

        // Back button released - end drag
        this.inputManager.on("backUp", (gamepadIndex) => {
            if (this.dragState.has(gamepadIndex)) {
                this.dragState.delete(gamepadIndex)
                this.saveProgress()
            }
        })

        // Handle back for pause menu
        this.inputManager.on("back", (_gamepadIndex) => {
            if (this.paused) {
                this.hidePauseMenu()
                this.playSound("navigate")
            }
        })

        this.inputManager.on("start", () => {
            if (this.paused) {
                this.hidePauseMenu()
            } else {
                this.showPauseMenu()
            }
            this.playSound("navigate")
        })

        // Peek (Y key) - temporarily show errors while held
        this.inputManager.on("peekDown", (_gamepadIndex) => {
            if (this.paused) return
            this.peekErrors = true
            this.refreshUI()
        })

        this.inputManager.on("peekUp", (_gamepadIndex) => {
            this.peekErrors = false
            if (!this.paused) {
                this.refreshUI()
            }
        })

        // Handle tap/mouse move - teleport cursor to nearest cell or pause menu item
        this.inputManager.on("tapMove", (gamepadIndex, x, y) => {
            if (this.paused) {
                // Find nearest pause menu item
                const nearestItem = this.findNearestPauseMenuItem(x, y)
                if (nearestItem !== -1 && nearestItem !== this.pauseIndex) {
                    this.pauseIndex = nearestItem
                    this.updatePauseMenu()
                }
                return
            }

            const cell = this.screenToCell(x, y)
            if (cell) {
                const cursor = this.getCursor(gamepadIndex)
                if (cursor.x !== cell.x || cursor.y !== cell.y) {
                    cursor.x = cell.x
                    cursor.y = cell.y
                    this.updateCursor(gamepadIndex)
                    tryDragFill(gamepadIndex)
                }
            }
        })
    }

    // Find the nearest pause menu item to the given screen coordinates
    findNearestPauseMenuItem(x, y) {
        if (!this.pauseItems) return -1

        let nearestIndex = -1
        let nearestDistance = Infinity

        for (let i = 0; i < this.pauseItems.length; i++) {
            const itemY = this.pauseMenuStartY + i * this.pauseMenuSpacing
            const itemX = this.uiScale.centerX

            const dx = x - itemX
            const dy = y - itemY
            const distance = Math.sqrt(dx * dx + dy * dy)

            // Use a reasonable hit distance
            const maxDistance = this.uiScale.percent(20)
            if (distance < maxDistance && distance < nearestDistance) {
                nearestDistance = distance
                nearestIndex = i
            }
        }

        return nearestIndex
    }

    // Convert screen coordinates to grid cell coordinates
    screenToCell(screenX, screenY) {
        // Calculate cell position
        const cellX = Math.floor((screenX - this.gridOffsetX) / this.cellSize)
        const cellY = Math.floor((screenY - this.gridOffsetY) / this.cellSize)

        // Check if within grid bounds
        if (cellX >= 0 && cellX < this.puzzle.width && cellY >= 0 && cellY < this.puzzle.height) {
            return { x: cellX, y: cellY }
        }
        return null
    }

    // Called by InputManager to determine which button a tap should trigger
    calcTapButton(x, y, rightClick = false) {
        // Right click cycles tap mode and doesn't press any button
        if (rightClick && !this.paused) {
            this.tapMode = this.tapMode === "fill" ? "mark" : "fill"
            this.drawTapButtons()
            return null
        }

        // When paused, check if tap is outside pause box
        if (this.paused) {
            const outsideBox =
                x < this.pauseBoxX ||
                x > this.pauseBoxX + this.pauseBoxWidth ||
                y < this.pauseBoxY ||
                y > this.pauseBoxY + this.pauseBoxHeight
            if (outsideBox) {
                return "start" // Close the pause menu
            }
            return "accept" // Select menu item
        }

        // Check if tap is on one of the mode buttons
        if (this.tapButtonSize) {
            const hitRadius = this.tapButtonSize * 0.75

            // Check fill button
            const dxFill = x - this.fillButtonX
            const dyFill = y - this.fillButtonY
            if (Math.sqrt(dxFill * dxFill + dyFill * dyFill) < hitRadius) {
                if (this.tapMode !== "fill") {
                    this.tapMode = "fill"
                    this.drawTapButtons()
                }
                return null // Don't press any button
            }

            // Check mark button
            const dxMark = x - this.markButtonX
            const dyMark = y - this.markButtonY
            if (Math.sqrt(dxMark * dxMark + dyMark * dyMark) < hitRadius) {
                if (this.tapMode !== "mark") {
                    this.tapMode = "mark"
                    this.drawTapButtons()
                }
                return null // Don't press any button
            }

            // Check menu button
            const dxMenu = x - this.menuButtonX
            const dyMenu = y - this.menuButtonY
            if (Math.sqrt(dxMenu * dxMenu + dyMenu * dyMenu) < hitRadius) {
                return "start"
            }
        }

        // Return button based on current tap mode
        return this.tapMode === "fill" ? "accept" : "back"
    }

    showPauseMenu() {
        this.paused = true
        this.pauseIndex = 0
        const theme = this.themeManager.getTheme()

        this.pauseOverlay = this.add.graphics()
        this.pauseOverlay.fillStyle(theme.graphics.overlayBg, 0.7)
        this.pauseOverlay.fillRect(0, 0, this.uiScale.width, this.uiScale.height)

        this.pauseBoxWidth = this.uiScale.percent(50)
        this.pauseBoxHeight = this.uiScale.percent(48)
        this.pauseBoxX = this.uiScale.centerX - this.pauseBoxWidth / 2
        this.pauseBoxY = this.uiScale.centerY - this.pauseBoxHeight / 2

        this.pauseBox = this.add.graphics()
        this.pauseBox.fillStyle(theme.graphics.panelBg, 1)
        this.pauseBox.fillRoundedRect(this.pauseBoxX, this.pauseBoxY, this.pauseBoxWidth, this.pauseBoxHeight, 12)

        this.pauseTitle = this.add.text(this.uiScale.centerX, this.uiScale.centerY - this.uiScale.percent(10), "PAUSED", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.large + "px",
            color: theme.text.primary
        })
        this.pauseTitle.setOrigin(0.5)

        this.pauseItems = [
            "Resume",
            "Show Errors: " + (this.showErrors ? "ON" : "OFF"),
            "Dim Hints: " + (this.dimHints ? "ON" : "OFF"),
            "Restart",
            "Exit"
        ]
        this.pauseTexts = []
        this.pauseMenuStartY = this.uiScale.centerY - this.uiScale.percent(4)
        this.pauseMenuSpacing = this.uiScale.percent(6)

        this.pauseItems.forEach((item, i) => {
            const text = this.add.text(this.uiScale.centerX, this.pauseMenuStartY + i * this.pauseMenuSpacing, item, {
                fontFamily: theme.font,
                fontSize: this.uiScale.fontSize.medium + "px",
                color: theme.text.secondary
            })
            text.setOrigin(0.5)
            this.pauseTexts.push(text)
        })

        this.updatePauseMenu()
    }

    updatePauseMenu() {
        const theme = this.themeManager.getTheme()
        this.pauseTexts.forEach((text, i) => {
            text.setColor(i === this.pauseIndex ? theme.text.success : theme.text.secondary)
        })
        // Update the toggle texts
        if (this.pauseTexts[1]) {
            this.pauseTexts[1].setText("Show Errors: " + (this.showErrors ? "ON" : "OFF"))
        }
        if (this.pauseTexts[2]) {
            this.pauseTexts[2].setText("Dim Hints: " + (this.dimHints ? "ON" : "OFF"))
        }
    }

    hidePauseMenu() {
        this.paused = false
        if (this.pauseOverlay) this.pauseOverlay.destroy()
        if (this.pauseBox) this.pauseBox.destroy()
        if (this.pauseTitle) this.pauseTitle.destroy()
        this.pauseTexts.forEach((t) => t.destroy())
        this.pauseTexts = []
    }

    handlePauseSelection() {
        this.playSound("select")

        switch (this.pauseIndex) {
            case 0: // Resume
                this.hidePauseMenu()
                break
            case 1: // Toggle Show Errors
                this.showErrors = this.saveManager.toggleShowErrors()
                // Hide and re-show pause menu to refresh it along with the grid
                this.hidePauseMenu()
                this.refreshUI()
                this.showPauseMenu()
                this.pauseIndex = 1 // Stay on the same menu item
                this.updatePauseMenu()
                break
            case 2: // Toggle Dim Hints
                this.dimHints = this.saveManager.toggleDimHints()
                // Hide and re-show pause menu to refresh it along with the hints
                this.hidePauseMenu()
                this.refreshUI()
                this.showPauseMenu()
                this.pauseIndex = 2 // Stay on the same menu item
                this.updatePauseMenu()
                break
            case 3: // Restart
                this.playerGrid = Array(this.puzzle.height)
                    .fill(null)
                    .map(() => Array(this.puzzle.width).fill(this.EMPTY))
                this.saveProgress()
                this.hidePauseMenu()
                this.refreshUI()
                break
            case 4: // Exit
                this.scene.start("PuzzleSelectScene", { infinite: this.infiniteMode })
                break
        }
    }

    checkVictory() {
        // Compare filled cells with solution
        for (let y = 0; y < this.puzzle.height; y++) {
            for (let x = 0; x < this.puzzle.width; x++) {
                const playerFilled = this.playerGrid[y][x] === this.FILLED
                const solutionFilled = this.puzzle.solution[y][x] === 1

                if (playerFilled !== solutionFilled) {
                    return // Not solved yet
                }
            }
        }

        // Victory!
        this.playSound("victory")

        if (this.infiniteMode) {
            this.saveManager.incrementInfiniteSolved(this.puzzle.difficulty)
        } else {
            this.saveManager.markPuzzleCompleted(this.puzzle.id)
        }

        this.scene.start("VictoryScene", {
            puzzle: this.puzzle,
            infinite: this.infiniteMode
        })
    }

    refreshUI() {
        this.uiContainer.destroy()
        if (this.cursorGraphics) {
            this.cursorGraphics.forEach((g) => g.destroy())
        }
        this.createUI()
    }

    handleResize() {
        this.uiScale.update()
        this.refreshUI()
    }

    playSound(key) {
        if (this.sound.get(key)) {
            this.sound.play(key, { volume: 0.5 })
        }
    }

    shutdown() {
        this.inputManager.clearSceneListeners()
    }
}
