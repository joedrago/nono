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
        this.input_manager = new InputManager(this)
        this.saveManager = new SaveManager()

        this.difficulties = ["easy", "medium", "hard"]
        this.difficultyLabels = { easy: "Easy (5x5)", medium: "Medium (10x10)", hard: "Hard (15x15)" }
        this.currentDifficulty = 0
        this.currentPage = 0
        this.puzzlesPerPage = 6
        this.gridCols = 3

        this.selectedIndex = 0 // Index within current page

        // Get puzzles from registry
        this.allPuzzles = this.registry.get("puzzles") || []

        if (this.infiniteMode) {
            this.createInfiniteUI()
        } else {
            this.filterPuzzles()
            this.createUI()
        }

        this.setupInput()
        this.scale.on("resize", () => this.handleResize())
    }

    filterPuzzles() {
        const difficulty = this.difficulties[this.currentDifficulty]
        this.filteredPuzzles = this.allPuzzles.filter((p) => p.difficulty === difficulty)
        this.totalPages = Math.ceil(this.filteredPuzzles.length / this.puzzlesPerPage)
        if (this.currentPage >= this.totalPages) {
            this.currentPage = Math.max(0, this.totalPages - 1)
        }
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

        // Difficulty tabs
        this.createDifficultyTabs()

        // Puzzle grid
        this.createPuzzleGrid()

        // Page indicator
        if (this.totalPages > 1) {
            this.pageText = this.add.text(
                this.uiScale.centerX,
                this.uiScale.percent(82),
                `Page ${this.currentPage + 1}/${this.totalPages}`,
                {
                    fontFamily: "monospace",
                    fontSize: this.uiScale.fontSize.small + "px",
                    color: "#888888"
                }
            )
            this.pageText.setOrigin(0.5)
            this.uiContainer.add(this.pageText)
        }

        // Instructions
        this.instructions = this.add.text(
            this.uiScale.centerX,
            this.uiScale.percent(90),
            "[A] Select   [B] Back   [L/R] Change Difficulty",
            {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.small + "px",
                color: "#8888aa"
            }
        )
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)
    }

    createInfiniteUI() {
        this.uiContainer = this.add.container(0, 0)

        // Title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(15), "INFINITE MODE", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.title + "px",
            color: "#ff88ff"
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Infinite puzzles solved count
        const solved = this.saveManager.getInfiniteSolved()
        this.solvedText = this.add.text(this.uiScale.centerX, this.uiScale.percent(30), `Puzzles Solved: ${solved}`, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.large + "px",
            color: "#aaaaff"
        })
        this.solvedText.setOrigin(0.5)
        this.uiContainer.add(this.solvedText)

        // Difficulty selection
        this.diffButtons = []
        const startY = this.uiScale.percent(45)
        const spacing = this.uiScale.percent(12)

        this.difficulties.forEach((diff, i) => {
            const btn = this.createDiffButton(this.difficultyLabels[diff], startY + i * spacing, i)
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

    createDiffButton(text, y, index) {
        const container = this.add.container(this.uiScale.centerX, y)

        const width = this.uiScale.percent(40)
        const height = this.uiScale.percent(9)

        const bg = this.add.graphics()
        bg.fillStyle(0x333355, 0.8)
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
        container.add(bg)

        const label = this.add.text(0, 0, text, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.medium + "px",
            color: "#e0e0ff"
        })
        label.setOrigin(0.5)
        container.add(label)

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

    createDifficultyTabs() {
        const tabContainer = this.add.container(this.uiScale.centerX, this.uiScale.percent(18))
        this.uiContainer.add(tabContainer)

        this.diffTabs = []
        const tabWidth = this.uiScale.percent(25)
        const totalWidth = tabWidth * 3 + this.uiScale.percent(2) * 2
        const startX = -totalWidth / 2 + tabWidth / 2

        this.difficulties.forEach((diff, i) => {
            const x = startX + i * (tabWidth + this.uiScale.percent(2))

            const tab = this.add.container(x, 0)

            const bg = this.add.graphics()
            const isSelected = i === this.currentDifficulty
            bg.fillStyle(isSelected ? 0x4444aa : 0x222244, 1)
            bg.fillRoundedRect(-tabWidth / 2, -this.uiScale.percent(3), tabWidth, this.uiScale.percent(6), 4)
            tab.add(bg)

            const label = this.add.text(0, 0, this.difficultyLabels[diff], {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.small + "px",
                color: isSelected ? "#ffffff" : "#888888"
            })
            label.setOrigin(0.5)
            tab.add(label)

            this.diffTabs.push({ container: tab, bg, label })
            tabContainer.add(tab)
        })
    }

    createPuzzleGrid() {
        const gridContainer = this.add.container(this.uiScale.centerX, this.uiScale.percent(50))
        this.uiContainer.add(gridContainer)

        const cellSize = this.uiScale.percent(18)
        const spacing = this.uiScale.percent(3)
        const gridWidth = this.gridCols * cellSize + (this.gridCols - 1) * spacing
        const gridRows = Math.ceil(this.puzzlesPerPage / this.gridCols)

        this.puzzleItems = []

        const startIndex = this.currentPage * this.puzzlesPerPage
        const endIndex = Math.min(startIndex + this.puzzlesPerPage, this.filteredPuzzles.length)

        for (let i = startIndex; i < endIndex; i++) {
            const puzzle = this.filteredPuzzles[i]
            const localIndex = i - startIndex
            const col = localIndex % this.gridCols
            const row = Math.floor(localIndex / this.gridCols)

            const x = -gridWidth / 2 + col * (cellSize + spacing) + cellSize / 2
            const y = -((gridRows - 1) * (cellSize + spacing)) / 2 + row * (cellSize + spacing)

            const item = this.createPuzzleItem(puzzle, x, y, cellSize, localIndex)
            this.puzzleItems.push(item)
            gridContainer.add(item.container)
        }

        this.updateGridSelection()
    }

    createPuzzleItem(puzzle, x, y, size, index) {
        const container = this.add.container(x, y)

        // Background
        const bg = this.add.graphics()
        const completed = this.saveManager.isPuzzleCompleted(puzzle.id)
        bg.fillStyle(completed ? 0x225522 : 0x333355, 0.9)
        bg.fillRoundedRect(-size / 2, -size / 2, size, size, 6)
        container.add(bg)

        // Puzzle name
        const name = this.add.text(0, -size / 4, puzzle.name, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.small + "px",
            color: "#e0e0ff"
        })
        name.setOrigin(0.5)
        container.add(name)

        // Size indicator
        const sizeText = this.add.text(0, size / 4, `${puzzle.width}x${puzzle.height}`, {
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
        this.puzzleItems.forEach((item, i) => {
            item.indicator.setVisible(i === this.selectedIndex)
        })
    }

    updateDifficultyTabs() {
        this.diffTabs.forEach((tab, i) => {
            const isSelected = i === this.currentDifficulty
            tab.bg.clear()
            tab.bg.fillStyle(isSelected ? 0x4444aa : 0x222244, 1)
            const tabWidth = this.uiScale.percent(25)
            tab.bg.fillRoundedRect(-tabWidth / 2, -this.uiScale.percent(3), tabWidth, this.uiScale.percent(6), 4)
            tab.label.setColor(isSelected ? "#ffffff" : "#888888")
        })
    }

    setupInput() {
        if (this.infiniteMode) {
            this.setupInfiniteInput()
            return
        }

        this.input_manager.on("up", () => {
            const newIndex = this.selectedIndex - this.gridCols
            if (newIndex >= 0) {
                this.selectedIndex = newIndex
                this.updateGridSelection()
                this.playSound("navigate")
            }
        })

        this.input_manager.on("down", () => {
            const newIndex = this.selectedIndex + this.gridCols
            if (newIndex < this.puzzleItems.length) {
                this.selectedIndex = newIndex
                this.updateGridSelection()
                this.playSound("navigate")
            }
        })

        this.input_manager.on("left", () => {
            if (this.selectedIndex % this.gridCols > 0) {
                this.selectedIndex--
                this.updateGridSelection()
                this.playSound("navigate")
            } else if (this.currentDifficulty > 0) {
                // Change difficulty left
                this.currentDifficulty--
                this.currentPage = 0
                this.selectedIndex = 0
                this.filterPuzzles()
                this.refreshUI()
                this.playSound("navigate")
            }
        })

        this.input_manager.on("right", () => {
            if (this.selectedIndex % this.gridCols < this.gridCols - 1 && this.selectedIndex < this.puzzleItems.length - 1) {
                this.selectedIndex++
                this.updateGridSelection()
                this.playSound("navigate")
            } else if (this.currentDifficulty < this.difficulties.length - 1) {
                // Change difficulty right
                this.currentDifficulty++
                this.currentPage = 0
                this.selectedIndex = 0
                this.filterPuzzles()
                this.refreshUI()
                this.playSound("navigate")
            }
        })

        this.input_manager.on("accept", () => {
            if (this.puzzleItems.length > 0 && this.puzzleItems[this.selectedIndex]) {
                const puzzle = this.puzzleItems[this.selectedIndex].puzzle
                this.playSound("select")
                this.scene.start("GameScene", { puzzle })
            }
        })

        this.input_manager.on("back", () => {
            this.playSound("navigate")
            this.scene.start("MainMenuScene")
        })
    }

    setupInfiniteInput() {
        this.input_manager.on("up", () => {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1)
            this.updateInfiniteSelection()
            this.playSound("navigate")
        })

        this.input_manager.on("down", () => {
            this.selectedIndex = Math.min(this.difficulties.length - 1, this.selectedIndex + 1)
            this.updateInfiniteSelection()
            this.playSound("navigate")
        })

        this.input_manager.on("accept", () => {
            this.playSound("select")
            // Generate infinite puzzle based on selected difficulty
            const difficulty = this.difficulties[this.selectedIndex]
            this.scene.start("GameScene", { infinite: true, difficulty })
        })

        this.input_manager.on("back", () => {
            this.playSound("navigate")
            this.scene.start("MainMenuScene")
        })
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
        this.input_manager.destroy()
    }
}
