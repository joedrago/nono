import { InputManager } from "../utils/InputManager.js"
import { UIScale } from "../utils/UIScale.js"
import { SaveManager } from "../utils/SaveManager.js"

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
        this.input_manager = new InputManager(this)
        this.saveManager = new SaveManager()

        // Cell states: 0 = empty, 1 = filled, 2 = marked (X)
        this.EMPTY = 0
        this.FILLED = 1
        this.MARKED = 2

        this.paused = false
        this.pauseIndex = 0

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

        this.puzzle = {
            id: "infinite_" + Date.now(),
            name: "Infinite",
            difficulty: this.infiniteDifficulty,
            width: size,
            height: size,
            solution: this.generateRandomSolution(size, size)
        }

        this.playerGrid = Array(this.puzzle.height)
            .fill(null)
            .map(() => Array(this.puzzle.width).fill(this.EMPTY))
    }

    generateRandomSolution(width, height) {
        // Generate a random solution with reasonable density (30-70% filled)
        const density = 0.3 + Math.random() * 0.4
        const solution = []

        for (let y = 0; y < height; y++) {
            const row = []
            for (let x = 0; x < width; x++) {
                row.push(Math.random() < density ? 1 : 0)
            }
            solution.push(row)
        }

        return solution
    }

    loadPuzzleState() {
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
        // Initialize cursor at center of grid for keyboard (gamepad -1)
        this.cursors.set(-1, {
            x: Math.floor(this.puzzle.width / 2),
            y: Math.floor(this.puzzle.height / 2),
            color: this.input_manager.getCursorColor(-1)
        })
    }

    getCursor(gamepadIndex) {
        if (!this.cursors.has(gamepadIndex)) {
            this.cursors.set(gamepadIndex, {
                x: Math.floor(this.puzzle.width / 2),
                y: Math.floor(this.puzzle.height / 2),
                color: this.input_manager.getCursorColor(gamepadIndex)
            })
        }
        return this.cursors.get(gamepadIndex)
    }

    createUI() {
        this.uiContainer = this.add.container(0, 0)

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

        // Puzzle name
        this.nameText = this.add.text(this.uiScale.percent(3), this.uiScale.percent(3), this.puzzle.name, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.medium + "px",
            color: "#aaaacc"
        })
        this.uiContainer.add(this.nameText)

        // Instructions
        this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(95), "[A] Fill   [B] Mark X / Menu", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.small + "px",
            color: "#8888aa"
        })
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)
    }

    drawRowHints() {
        this.rowHintTexts = []

        for (let y = 0; y < this.puzzle.height; y++) {
            const hints = this.rowHints[y]
            const hintStr = hints.join(" ")
            const yPos = this.gridOffsetY + y * this.cellSize + this.cellSize / 2

            const text = this.add.text(this.gridOffsetX - this.uiScale.percent(2), yPos, hintStr, {
                fontFamily: "monospace",
                fontSize: this.cellSize * 0.5 + "px",
                color: "#ccccff"
            })
            text.setOrigin(1, 0.5)
            this.uiContainer.add(text)
            this.rowHintTexts.push(text)
        }
    }

    drawColHints() {
        this.colHintTexts = []

        for (let x = 0; x < this.puzzle.width; x++) {
            const hints = this.colHints[x]
            const hintStr = hints.join("\n")
            const xPos = this.gridOffsetX + x * this.cellSize + this.cellSize / 2

            const text = this.add.text(xPos, this.gridOffsetY - this.uiScale.percent(2), hintStr, {
                fontFamily: "monospace",
                fontSize: this.cellSize * 0.5 + "px",
                color: "#ccccff",
                align: "center"
            })
            text.setOrigin(0.5, 1)
            this.uiContainer.add(text)
            this.colHintTexts.push(text)
        }
    }

    drawGrid() {
        this.cellGraphics = []

        for (let y = 0; y < this.puzzle.height; y++) {
            const row = []
            for (let x = 0; x < this.puzzle.width; x++) {
                const cellX = this.gridOffsetX + x * this.cellSize
                const cellY = this.gridOffsetY + y * this.cellSize

                const cell = this.add.graphics()
                this.drawCell(cell, cellX, cellY, this.playerGrid[y][x])
                this.uiContainer.add(cell)
                row.push(cell)
            }
            this.cellGraphics.push(row)
        }

        // Grid lines
        this.gridLines = this.add.graphics()
        this.gridLines.lineStyle(1, 0x666688, 0.5)

        for (let x = 0; x <= this.puzzle.width; x++) {
            const lineX = this.gridOffsetX + x * this.cellSize
            this.gridLines.moveTo(lineX, this.gridOffsetY)
            this.gridLines.lineTo(lineX, this.gridOffsetY + this.puzzle.height * this.cellSize)
        }

        for (let y = 0; y <= this.puzzle.height; y++) {
            const lineY = this.gridOffsetY + y * this.cellSize
            this.gridLines.moveTo(this.gridOffsetX, lineY)
            this.gridLines.lineTo(this.gridOffsetX + this.puzzle.width * this.cellSize, lineY)
        }

        this.gridLines.strokePath()

        // Thicker lines every 5 cells
        this.gridLines.lineStyle(2, 0x8888aa, 0.8)
        for (let x = 0; x <= this.puzzle.width; x += 5) {
            const lineX = this.gridOffsetX + x * this.cellSize
            this.gridLines.moveTo(lineX, this.gridOffsetY)
            this.gridLines.lineTo(lineX, this.gridOffsetY + this.puzzle.height * this.cellSize)
        }
        for (let y = 0; y <= this.puzzle.height; y += 5) {
            const lineY = this.gridOffsetY + y * this.cellSize
            this.gridLines.moveTo(this.gridOffsetX, lineY)
            this.gridLines.lineTo(this.gridOffsetX + this.puzzle.width * this.cellSize, lineY)
        }
        this.gridLines.strokePath()

        this.uiContainer.add(this.gridLines)
    }

    drawCell(graphics, x, y, state) {
        graphics.clear()

        const padding = 2
        const size = this.cellSize - padding * 2

        if (state === this.EMPTY) {
            graphics.fillStyle(0x222244, 1)
            graphics.fillRect(x + padding, y + padding, size, size)
        } else if (state === this.FILLED) {
            graphics.fillStyle(0x4488ff, 1)
            graphics.fillRect(x + padding, y + padding, size, size)
        } else if (state === this.MARKED) {
            graphics.fillStyle(0x222244, 1)
            graphics.fillRect(x + padding, y + padding, size, size)
            // Draw X
            graphics.lineStyle(2, 0xff6666, 1)
            graphics.moveTo(x + padding + 4, y + padding + 4)
            graphics.lineTo(x + padding + size - 4, y + padding + size - 4)
            graphics.moveTo(x + padding + size - 4, y + padding + 4)
            graphics.lineTo(x + padding + 4, y + padding + size - 4)
            graphics.strokePath()
        }
    }

    drawCursors() {
        if (this.cursorGraphics) {
            this.cursorGraphics.forEach((g) => g.destroy())
        }
        this.cursorGraphics = []

        this.cursors.forEach((cursor, gamepadIndex) => {
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
        const cursor = this.getCursor(gamepadIndex)
        this.drawCursors()
    }

    updateCell(x, y) {
        const cellX = this.gridOffsetX + x * this.cellSize
        const cellY = this.gridOffsetY + y * this.cellSize
        this.drawCell(this.cellGraphics[y][x], cellX, cellY, this.playerGrid[y][x])
    }

    setupInput() {
        this.input_manager.on("up", (gamepadIndex) => {
            if (this.paused) {
                this.pauseIndex = Math.max(0, this.pauseIndex - 1)
                this.updatePauseMenu()
                this.playSound("navigate")
                return
            }
            const cursor = this.getCursor(gamepadIndex)
            cursor.y = Math.max(0, cursor.y - 1)
            this.updateCursor(gamepadIndex)
            this.playSound("navigate")
        })

        this.input_manager.on("down", (gamepadIndex) => {
            if (this.paused) {
                this.pauseIndex = Math.min(2, this.pauseIndex + 1)
                this.updatePauseMenu()
                this.playSound("navigate")
                return
            }
            const cursor = this.getCursor(gamepadIndex)
            cursor.y = Math.min(this.puzzle.height - 1, cursor.y + 1)
            this.updateCursor(gamepadIndex)
            this.playSound("navigate")
        })

        this.input_manager.on("left", (gamepadIndex) => {
            if (this.paused) return
            const cursor = this.getCursor(gamepadIndex)
            cursor.x = Math.max(0, cursor.x - 1)
            this.updateCursor(gamepadIndex)
            this.playSound("navigate")
        })

        this.input_manager.on("right", (gamepadIndex) => {
            if (this.paused) return
            const cursor = this.getCursor(gamepadIndex)
            cursor.x = Math.min(this.puzzle.width - 1, cursor.x + 1)
            this.updateCursor(gamepadIndex)
            this.playSound("navigate")
        })

        this.input_manager.on("accept", (gamepadIndex) => {
            if (this.paused) {
                this.handlePauseSelection()
                return
            }

            const cursor = this.getCursor(gamepadIndex)
            const currentState = this.playerGrid[cursor.y][cursor.x]

            // Toggle between empty and filled
            if (currentState === this.FILLED) {
                this.playerGrid[cursor.y][cursor.x] = this.EMPTY
            } else {
                this.playerGrid[cursor.y][cursor.x] = this.FILLED
            }

            this.updateCell(cursor.x, cursor.y)
            this.saveProgress()
            this.playSound("fill")

            this.checkVictory()
        })

        this.input_manager.on("back", (gamepadIndex) => {
            if (this.paused) {
                this.hidePauseMenu()
                this.playSound("navigate")
                return
            }

            const cursor = this.getCursor(gamepadIndex)
            const currentState = this.playerGrid[cursor.y][cursor.x]

            // If cursor is at edge and cell is empty, show pause menu
            if (
                currentState === this.EMPTY &&
                (cursor.x === 0 || cursor.x === this.puzzle.width - 1 || cursor.y === 0 || cursor.y === this.puzzle.height - 1)
            ) {
                this.showPauseMenu()
                this.playSound("navigate")
                return
            }

            // Toggle between empty and marked
            if (currentState === this.MARKED) {
                this.playerGrid[cursor.y][cursor.x] = this.EMPTY
            } else {
                this.playerGrid[cursor.y][cursor.x] = this.MARKED
            }

            this.updateCell(cursor.x, cursor.y)
            this.saveProgress()
            this.playSound("mark")
        })
    }

    showPauseMenu() {
        this.paused = true
        this.pauseIndex = 0

        this.pauseOverlay = this.add.graphics()
        this.pauseOverlay.fillStyle(0x000000, 0.7)
        this.pauseOverlay.fillRect(0, 0, this.uiScale.width, this.uiScale.height)

        const boxWidth = this.uiScale.percent(50)
        const boxHeight = this.uiScale.percent(35)

        this.pauseBox = this.add.graphics()
        this.pauseBox.fillStyle(0x333355, 1)
        this.pauseBox.fillRoundedRect(
            this.uiScale.centerX - boxWidth / 2,
            this.uiScale.centerY - boxHeight / 2,
            boxWidth,
            boxHeight,
            12
        )

        this.pauseTitle = this.add.text(this.uiScale.centerX, this.uiScale.centerY - this.uiScale.percent(10), "PAUSED", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.large + "px",
            color: "#e0e0ff"
        })
        this.pauseTitle.setOrigin(0.5)

        this.pauseItems = ["Resume", "Restart", "Exit"]
        this.pauseTexts = []
        const startY = this.uiScale.centerY - this.uiScale.percent(2)
        const spacing = this.uiScale.percent(6)

        this.pauseItems.forEach((item, i) => {
            const text = this.add.text(this.uiScale.centerX, startY + i * spacing, item, {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.medium + "px",
                color: "#aaaacc"
            })
            text.setOrigin(0.5)
            this.pauseTexts.push(text)
        })

        this.updatePauseMenu()
    }

    updatePauseMenu() {
        this.pauseTexts.forEach((text, i) => {
            text.setColor(i === this.pauseIndex ? "#00ff00" : "#aaaacc")
        })
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
            case 1: // Restart
                this.playerGrid = Array(this.puzzle.height)
                    .fill(null)
                    .map(() => Array(this.puzzle.width).fill(this.EMPTY))
                this.saveProgress()
                this.hidePauseMenu()
                this.refreshUI()
                break
            case 2: // Exit
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
            this.saveManager.incrementInfiniteSolved()
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
        this.input_manager.destroy()
    }
}
