import { InputManager } from "../utils/InputManager.js"
import { UIScale } from "../utils/UIScale.js"
import { SaveManager } from "../utils/SaveManager.js"

export class PuzzleSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: "PuzzleSelectScene" })
    }

    init(data) {
        this.infiniteMode = data && data.infinite
    }

    create() {
        this.uiScale = new UIScale(this)
        this.inputManager = new InputManager(this)
        this.saveManager = new SaveManager()

        this.difficulties = ["easy", "medium", "hard"]
        this.difficultyLabels = { easy: "Easy (5x5)", medium: "Medium (10x10)", hard: "Hard (15x15)" }

        this.gridRows = 2
        this.selectedIndex = 0
        this.scrollOffset = 0 // How many columns scrolled to the right

        // Get puzzles from registry and sort them
        this.allPuzzles = this.registry.get("puzzles") || []
        this.sortPuzzles()

        if (this.infiniteMode) {
            this.createInfiniteUI()
        } else {
            this.createUI()
        }

        this.setupInput()
        this.scale.on("resize", () => this.handleResize())
    }

    sortPuzzles() {
        // Sort by difficulty (easy, medium, hard), then by name
        const difficultyOrder = { easy: 0, medium: 1, hard: 2 }
        this.sortedPuzzles = [...this.allPuzzles].sort((a, b) => {
            const diffCompare = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
            if (diffCompare !== 0) return diffCompare
            return a.name.localeCompare(b.name)
        })
    }

    createUI() {
        this.uiContainer = this.add.container(0, 0)

        // Title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(8), "SELECT PUZZLE", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.large + "px",
            color: "#e0e0ff"
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Calculate grid dimensions
        this.cellSize = this.uiScale.percent(18)
        this.cellSpacing = this.uiScale.percent(3)
        this.visibleCols = Math.floor((this.uiScale.width * 0.85) / (this.cellSize + this.cellSpacing))
        this.totalCols = Math.ceil(this.sortedPuzzles.length / this.gridRows)

        // Create puzzle grid
        this.createPuzzleGrid()

        // Scroll indicator
        this.updateScrollIndicator()

        // Instructions
        this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(90), "[A] Select   [B] Back", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.small + "px",
            color: "#8888aa"
        })
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)
    }

    createInfiniteUI() {
        this.uiContainer = this.add.container(0, 0)

        // Title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(10), "INFINITE MODE", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.title + "px",
            color: "#ff88ff"
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Infinite puzzles solved counts by difficulty
        const solvedCounts = this.saveManager.getInfiniteSolvedByDifficulty()
        const total = solvedCounts.easy + solvedCounts.medium + solvedCounts.hard

        this.solvedText = this.add.text(this.uiScale.centerX, this.uiScale.percent(22), `Total Solved: ${total}`, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.medium + "px",
            color: "#aaaaff"
        })
        this.solvedText.setOrigin(0.5)
        this.uiContainer.add(this.solvedText)

        // Difficulty selection with solved counts
        this.diffButtons = []
        const startY = this.uiScale.percent(38)
        const spacing = this.uiScale.percent(14)

        this.difficulties.forEach((diff, i) => {
            const count = solvedCounts[diff]
            const btn = this.createDiffButton(this.difficultyLabels[diff], count, startY + i * spacing, i)
            this.diffButtons.push(btn)
            this.uiContainer.add(btn.container)
        })

        this.selectedIndex = 0
        this.updateInfiniteSelection()

        // Instructions
        this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(88), "[A] Start   [B] Back", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.small + "px",
            color: "#8888aa"
        })
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)
    }

    createDiffButton(text, solvedCount, y, index) {
        const container = this.add.container(this.uiScale.centerX, y)

        const width = this.uiScale.percent(45)
        const height = this.uiScale.percent(11)

        const bg = this.add.graphics()
        bg.fillStyle(0x333355, 0.8)
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
        container.add(bg)

        // Difficulty label
        const label = this.add.text(0, -this.uiScale.percent(1.5), text, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.medium + "px",
            color: "#e0e0ff"
        })
        label.setOrigin(0.5)
        container.add(label)

        // Solved count
        const countText = this.add.text(0, this.uiScale.percent(2.5), `Solved: ${solvedCount}`, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.small + "px",
            color: solvedCount > 0 ? "#88ff88" : "#888888"
        })
        countText.setOrigin(0.5)
        container.add(countText)

        const indicator = this.add.graphics()
        indicator.lineStyle(3, 0x00ff00, 1)
        indicator.strokeRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 10)
        indicator.setVisible(false)
        container.add(indicator)

        return { container, indicator, index }
    }

    updateInfiniteSelection() {
        this.diffButtons.forEach((btn, i) => {
            btn.indicator.setVisible(i === this.selectedIndex)
        })
    }

    createPuzzleGrid() {
        this.gridContainer = this.add.container(this.uiScale.centerX, this.uiScale.percent(50))
        this.uiContainer.add(this.gridContainer)

        this.puzzleItems = []

        // Calculate visible range
        const startCol = this.scrollOffset
        const endCol = Math.min(startCol + this.visibleCols, this.totalCols)

        const gridWidth = this.visibleCols * (this.cellSize + this.cellSpacing) - this.cellSpacing
        const gridHeight = this.gridRows * (this.cellSize + this.cellSpacing) - this.cellSpacing

        for (let col = startCol; col < endCol; col++) {
            for (let row = 0; row < this.gridRows; row++) {
                const puzzleIndex = col * this.gridRows + row
                if (puzzleIndex >= this.sortedPuzzles.length) continue

                const puzzle = this.sortedPuzzles[puzzleIndex]
                const visualCol = col - startCol

                const x = -gridWidth / 2 + visualCol * (this.cellSize + this.cellSpacing) + this.cellSize / 2
                const y = -gridHeight / 2 + row * (this.cellSize + this.cellSpacing) + this.cellSize / 2

                const item = this.createPuzzleItem(puzzle, x, y, this.cellSize, puzzleIndex)
                this.puzzleItems.push(item)
                this.gridContainer.add(item.container)
            }
        }

        this.updateGridSelection()
    }

    createPuzzleItem(puzzle, x, y, size, index) {
        const container = this.add.container(x, y)

        // Background - color based on difficulty
        const bg = this.add.graphics()
        const completed = this.saveManager.isPuzzleCompleted(puzzle.id)
        let bgColor = 0x333355
        if (completed) {
            bgColor = 0x225522
        } else if (puzzle.difficulty === "easy") {
            bgColor = 0x333366
        } else if (puzzle.difficulty === "medium") {
            bgColor = 0x444455
        } else if (puzzle.difficulty === "hard") {
            bgColor = 0x553344
        }
        bg.fillStyle(bgColor, 0.9)
        bg.fillRoundedRect(-size / 2, -size / 2, size, size, 6)
        container.add(bg)

        // Puzzle name
        const name = this.add.text(0, -size / 6, puzzle.name, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.small + "px",
            color: "#e0e0ff"
        })
        name.setOrigin(0.5)
        container.add(name)

        // Size indicator
        const sizeText = this.add.text(0, size / 6, `${puzzle.width}x${puzzle.height}`, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.tiny + "px",
            color: "#888888"
        })
        sizeText.setOrigin(0.5)
        container.add(sizeText)

        // Checkmark if completed
        if (completed) {
            const check = this.add.text(size / 2 - this.uiScale.percent(2), -size / 2 + this.uiScale.percent(2), "✓", {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.medium + "px",
                color: "#00ff00"
            })
            check.setOrigin(0.5)
            container.add(check)
        }

        // Selection indicator
        const indicator = this.add.graphics()
        indicator.lineStyle(3, 0x00ff00, 1)
        indicator.strokeRoundedRect(-size / 2 - 4, -size / 2 - 4, size + 8, size + 8, 8)
        indicator.setVisible(false)
        container.add(indicator)

        return { container, indicator, puzzle, index }
    }

    updateGridSelection() {
        this.puzzleItems.forEach((item) => {
            item.indicator.setVisible(item.index === this.selectedIndex)
        })
    }

    updateScrollIndicator() {
        // Remove old indicators
        if (this.leftArrow) this.leftArrow.destroy()
        if (this.rightArrow) this.rightArrow.destroy()

        const arrowY = this.uiScale.percent(50)

        // Left arrow if we can scroll left
        if (this.scrollOffset > 0) {
            this.leftArrow = this.add.text(this.uiScale.percent(3), arrowY, "◀", {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.large + "px",
                color: "#8888aa"
            })
            this.leftArrow.setOrigin(0.5)
            this.uiContainer.add(this.leftArrow)
        }

        // Right arrow if we can scroll right
        if (this.scrollOffset + this.visibleCols < this.totalCols) {
            this.rightArrow = this.add.text(this.uiScale.width - this.uiScale.percent(3), arrowY, "▶", {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.large + "px",
                color: "#8888aa"
            })
            this.rightArrow.setOrigin(0.5)
            this.uiContainer.add(this.rightArrow)
        }
    }

    setupInput() {
        if (this.infiniteMode) {
            this.setupInfiniteInput()
            return
        }

        this.inputManager.on("up", () => {
            const currentCol = Math.floor(this.selectedIndex / this.gridRows)
            const currentRow = this.selectedIndex % this.gridRows

            if (currentRow > 0) {
                this.selectedIndex--
                this.updateGridSelection()
                this.playSound("navigate")
            }
        })

        this.inputManager.on("down", () => {
            const currentCol = Math.floor(this.selectedIndex / this.gridRows)
            const currentRow = this.selectedIndex % this.gridRows

            const newIndex = this.selectedIndex + 1
            if (currentRow < this.gridRows - 1 && newIndex < this.sortedPuzzles.length) {
                this.selectedIndex = newIndex
                this.updateGridSelection()
                this.playSound("navigate")
            }
        })

        this.inputManager.on("left", () => {
            const currentCol = Math.floor(this.selectedIndex / this.gridRows)
            const currentRow = this.selectedIndex % this.gridRows

            if (currentCol > 0) {
                this.selectedIndex -= this.gridRows
                // Check if we need to scroll
                if (currentCol <= this.scrollOffset) {
                    this.scrollOffset = Math.max(0, this.scrollOffset - 1)
                    this.refreshGrid()
                } else {
                    this.updateGridSelection()
                }
                this.playSound("navigate")
            }
        })

        this.inputManager.on("right", () => {
            const currentCol = Math.floor(this.selectedIndex / this.gridRows)
            const currentRow = this.selectedIndex % this.gridRows

            const newIndex = this.selectedIndex + this.gridRows
            if (currentCol < this.totalCols - 1 && newIndex < this.sortedPuzzles.length) {
                this.selectedIndex = newIndex
                // Check if we need to scroll
                const newCol = Math.floor(this.selectedIndex / this.gridRows)
                if (newCol >= this.scrollOffset + this.visibleCols) {
                    this.scrollOffset++
                    this.refreshGrid()
                } else {
                    this.updateGridSelection()
                }
                this.playSound("navigate")
            }
        })

        this.inputManager.on("accept", () => {
            if (this.sortedPuzzles.length > 0 && this.selectedIndex < this.sortedPuzzles.length) {
                const puzzle = this.sortedPuzzles[this.selectedIndex]
                this.playSound("select")
                this.scene.start("GameScene", { puzzle })
            }
        })

        this.inputManager.on("back", () => {
            this.playSound("navigate")
            this.scene.start("MainMenuScene")
        })
    }

    setupInfiniteInput() {
        this.inputManager.on("up", () => {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1)
            this.updateInfiniteSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("down", () => {
            this.selectedIndex = Math.min(this.difficulties.length - 1, this.selectedIndex + 1)
            this.updateInfiniteSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("accept", () => {
            this.playSound("select")
            const difficulty = this.difficulties[this.selectedIndex]
            this.scene.start("GameScene", { infinite: true, difficulty })
        })

        this.inputManager.on("back", () => {
            this.playSound("navigate")
            this.scene.start("MainMenuScene")
        })
    }

    refreshGrid() {
        // Remove old grid
        this.gridContainer.destroy()
        if (this.leftArrow) this.leftArrow.destroy()
        if (this.rightArrow) this.rightArrow.destroy()

        // Recreate grid with new scroll position
        this.createPuzzleGrid()
        this.updateScrollIndicator()
    }

    refreshUI() {
        this.uiContainer.destroy()
        if (this.infiniteMode) {
            this.createInfiniteUI()
        } else {
            this.createUI()
        }
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
        this.inputManager.destroy()
    }
}
