import { InputManager } from "../utils/InputManager.js"
import { UIScale } from "../utils/UIScale.js"
import { SaveManager } from "../utils/SaveManager.js"
import { ThemeManager } from "../utils/ThemeManager.js"

export class PuzzleSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: "PuzzleSelectScene" })
    }

    init(data) {
        this.infiniteMode = data && data.infinite
    }

    create() {
        this.uiScale = new UIScale(this)
        this.inputManager = InputManager.getInstance(this.game)
        this.inputManager.setActiveScene(this)
        this.saveManager = new SaveManager()
        this.themeManager = new ThemeManager(this.saveManager)

        this.difficulties = ["easy", "medium", "hard"]
        this.difficultyLabels = { easy: "Easy (5x5)", medium: "Medium (10x10)", hard: "Hard (15x15)" }

        this.gridRows = 6
        this.selectedIndex = 0
        this.scrollOffset = 0 // How many columns scrolled to the right

        // Set background color from theme
        this.cameras.main.setBackgroundColor(this.themeManager.graphics.background)

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
        // Sort by ordinal
        this.sortedPuzzles = [...this.allPuzzles].sort((a, b) => {
            return (a.ordinal || 0) - (b.ordinal || 0)
        })
    }

    createUI() {
        this.uiContainer = this.add.container(0, 0)
        const theme = this.themeManager.getTheme()

        // Title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(8), "SELECT PUZZLE", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.large + "px",
            color: theme.text.primary
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Calculate grid dimensions
        this.cellHeight = this.uiScale.percent(9)
        this.cellWidth = this.cellHeight * 2
        this.cellSpacing = this.uiScale.percent(1.5)
        this.visibleCols = Math.floor((this.uiScale.width * 0.85) / (this.cellWidth + this.cellSpacing))
        this.totalCols = Math.ceil(this.sortedPuzzles.length / this.gridRows)

        // Create puzzle grid
        this.createPuzzleGrid()

        // Scroll indicator
        this.updateScrollIndicator()

        // Instructions
        this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(90), "[A] Select   [B] Back", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.small + "px",
            color: theme.text.instructions
        })
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)

        // Draw back button for tap mode
        this.drawBackButton()
    }

    createInfiniteUI() {
        this.uiContainer = this.add.container(0, 0)
        const theme = this.themeManager.getTheme()

        // Title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(10), "INFINITE MODE", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.title + "px",
            color: theme.text.accent
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Infinite puzzles solved counts by difficulty
        const solvedCounts = this.saveManager.getInfiniteSolvedByDifficulty()
        const total = solvedCounts.easy + solvedCounts.medium + solvedCounts.hard

        this.solvedText = this.add.text(this.uiScale.centerX, this.uiScale.percent(22), `Total Solved: ${total}`, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.medium + "px",
            color: theme.text.highlight
        })
        this.solvedText.setOrigin(0.5)
        this.uiContainer.add(this.solvedText)

        // Difficulty selection with solved counts
        this.diffButtons = []
        this.diffStartY = this.uiScale.percent(38)
        this.diffSpacing = this.uiScale.percent(14)
        this.diffWidth = this.uiScale.percent(45)
        this.diffHeight = this.uiScale.percent(11)

        this.difficulties.forEach((diff, i) => {
            const count = solvedCounts[diff]
            const btn = this.createDiffButton(this.difficultyLabels[diff], count, this.diffStartY + i * this.diffSpacing, i)
            this.diffButtons.push(btn)
            this.uiContainer.add(btn.container)
        })

        this.selectedIndex = 0
        this.updateInfiniteSelection()

        // Instructions
        this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(88), "[A] Start   [B] Back", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.small + "px",
            color: theme.text.instructions
        })
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)

        // Draw back button for tap mode
        this.drawBackButton()
    }

    drawBackButton() {
        // Only draw if tap is active
        if (!this.inputManager.tapActive()) return

        const theme = this.themeManager.getTheme()

        // Button sizing similar to arrows
        this.backButtonSize = this.uiScale.fontSize.title * 1.5

        // Position in top right corner
        this.backButtonX = this.uiScale.width - this.uiScale.percent(3) - this.backButtonSize / 2
        this.backButtonY = this.uiScale.percent(3) + this.backButtonSize / 2

        // Draw button background
        const backBg = this.add.graphics()
        backBg.fillStyle(theme.graphics.panelBg, 1)
        backBg.fillRoundedRect(
            this.backButtonX - this.backButtonSize / 2,
            this.backButtonY - this.backButtonSize / 2,
            this.backButtonSize,
            this.backButtonSize,
            8
        )

        // Draw back arrow
        const arrowInset = this.backButtonSize * 0.25
        backBg.lineStyle(4, theme.text.primary, 1)
        // Arrow pointing left: <
        const arrowLeft = this.backButtonX - this.backButtonSize / 2 + arrowInset
        const arrowRight = this.backButtonX + this.backButtonSize / 2 - arrowInset
        const arrowMid = this.backButtonX
        const arrowTop = this.backButtonY - this.backButtonSize / 2 + arrowInset
        const arrowBottom = this.backButtonY + this.backButtonSize / 2 - arrowInset
        backBg.moveTo(arrowMid, arrowTop)
        backBg.lineTo(arrowLeft, this.backButtonY)
        backBg.lineTo(arrowMid, arrowBottom)
        // Horizontal line from arrow point
        backBg.moveTo(arrowLeft, this.backButtonY)
        backBg.lineTo(arrowRight, this.backButtonY)
        backBg.strokePath()

        this.uiContainer.add(backBg)
    }

    createDiffButton(text, solvedCount, y, _index) {
        const container = this.add.container(this.uiScale.centerX, y)
        const theme = this.themeManager.getTheme()

        const width = this.uiScale.percent(45)
        const height = this.uiScale.percent(11)

        const bg = this.add.graphics()
        bg.fillStyle(theme.graphics.panelBg, 0.8)
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
        container.add(bg)

        // Difficulty label
        const label = this.add.text(0, -this.uiScale.percent(1.5), text, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.medium + "px",
            color: theme.text.primary
        })
        label.setOrigin(0.5)
        container.add(label)

        // Solved count
        const countText = this.add.text(0, this.uiScale.percent(2.5), `Solved: ${solvedCount}`, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.small + "px",
            color: solvedCount > 0 ? theme.text.success : theme.text.muted
        })
        countText.setOrigin(0.5)
        container.add(countText)

        const indicator = this.add.graphics()
        indicator.lineStyle(3, theme.graphics.selectionIndicator, 1)
        indicator.strokeRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 10)
        indicator.setVisible(false)
        container.add(indicator)

        return { container, indicator }
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

        const gridWidth = this.visibleCols * (this.cellWidth + this.cellSpacing) - this.cellSpacing
        const gridHeight = this.gridRows * (this.cellHeight + this.cellSpacing) - this.cellSpacing

        for (let col = startCol; col < endCol; col++) {
            for (let row = 0; row < this.gridRows; row++) {
                const puzzleIndex = col * this.gridRows + row
                if (puzzleIndex >= this.sortedPuzzles.length) continue

                const puzzle = this.sortedPuzzles[puzzleIndex]
                const visualCol = col - startCol

                const x = -gridWidth / 2 + visualCol * (this.cellWidth + this.cellSpacing) + this.cellWidth / 2
                const y = -gridHeight / 2 + row * (this.cellHeight + this.cellSpacing) + this.cellHeight / 2

                const item = this.createPuzzleItem(puzzle, x, y, this.cellWidth, this.cellHeight, puzzleIndex)
                this.puzzleItems.push(item)
                this.gridContainer.add(item.container)
            }
        }

        this.updateGridSelection()
    }

    createPuzzleItem(puzzle, x, y, width, height, index) {
        const container = this.add.container(x, y)
        const theme = this.themeManager.getTheme()

        // Background - color based on difficulty
        const bg = this.add.graphics()
        const completed = this.saveManager.isPuzzleCompleted(puzzle.id)
        let bgColor = theme.graphics.panelBg
        if (completed) {
            bgColor = theme.graphics.puzzleCompleted
        } else if (puzzle.difficulty === "easy") {
            bgColor = theme.graphics.puzzleEasy
        } else if (puzzle.difficulty === "medium") {
            bgColor = theme.graphics.puzzleMedium
        } else if (puzzle.difficulty === "hard") {
            bgColor = theme.graphics.puzzleHard
        }
        bg.fillStyle(bgColor, 0.9)
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6)
        container.add(bg)

        // Ordinal number
        const ordinalStr = String(puzzle.ordinal || 0).padStart(3, "0")
        const ordinalText = this.add.text(0, -height / 3, `#${ordinalStr}`, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.tiny + "px",
            color: theme.text.muted
        })
        ordinalText.setOrigin(0.5)
        container.add(ordinalText)

        // Puzzle name (hidden if not completed)
        const displayName = completed ? puzzle.name : "???"
        const name = this.add.text(0, 0, displayName, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.small + "px",
            color: theme.text.primary
        })
        name.setOrigin(0.5)
        container.add(name)

        // Size indicator
        const sizeText = this.add.text(0, height / 3, `${puzzle.width}x${puzzle.height}`, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.tiny + "px",
            color: theme.text.muted
        })
        sizeText.setOrigin(0.5)
        container.add(sizeText)

        // Checkmark if completed
        if (completed) {
            const check = this.add.text(width / 2 - this.uiScale.percent(2), -height / 2 + this.uiScale.percent(2), "✓", {
                fontFamily: theme.font,
                fontSize: this.uiScale.fontSize.medium + "px",
                color: theme.text.success
            })
            check.setOrigin(0.5)
            container.add(check)
        }

        // Selection indicator
        const indicator = this.add.graphics()
        indicator.lineStyle(3, theme.graphics.selectionIndicator, 1)
        indicator.strokeRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 8)
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
        const theme = this.themeManager.getTheme()

        // Remove old indicators
        if (this.leftArrow) this.leftArrow.destroy()
        if (this.rightArrow) this.rightArrow.destroy()

        this.arrowY = this.uiScale.percent(50)
        this.arrowSize = this.uiScale.fontSize.title * 1.5
        this.leftArrowX = this.uiScale.percent(5)
        this.rightArrowX = this.uiScale.width - this.uiScale.percent(5)

        // Left arrow
        this.leftArrow = this.add.text(this.leftArrowX, this.arrowY, "◀", {
            fontFamily: theme.font,
            fontSize: this.arrowSize + "px",
            color: theme.text.instructions
        })
        this.leftArrow.setOrigin(0.5)
        this.uiContainer.add(this.leftArrow)

        // Right arrow
        this.rightArrow = this.add.text(this.rightArrowX, this.arrowY, "▶", {
            fontFamily: theme.font,
            fontSize: this.arrowSize + "px",
            color: theme.text.instructions
        })
        this.rightArrow.setOrigin(0.5)
        this.uiContainer.add(this.rightArrow)
    }

    setupInput() {
        if (this.infiniteMode) {
            this.setupInfiniteInput()
            return
        }

        this.inputManager.on("up", () => {
            const currentCol = Math.floor(this.selectedIndex / this.gridRows)
            const currentRow = this.selectedIndex % this.gridRows

            // Wrap within the current column
            let newRow = (currentRow - 1 + this.gridRows) % this.gridRows
            let newIndex = currentCol * this.gridRows + newRow

            // If wrapping would go past the end of puzzles, stay at top of column
            if (newIndex >= this.sortedPuzzles.length) {
                newRow = 0
                newIndex = currentCol * this.gridRows + newRow
            }

            this.selectedIndex = newIndex
            this.updateGridSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("down", () => {
            const currentCol = Math.floor(this.selectedIndex / this.gridRows)
            const currentRow = this.selectedIndex % this.gridRows

            // Wrap within the current column
            let newRow = (currentRow + 1) % this.gridRows
            let newIndex = currentCol * this.gridRows + newRow

            // If wrapping would go past the end of puzzles, wrap to top of column
            if (newIndex >= this.sortedPuzzles.length) {
                newRow = 0
                newIndex = currentCol * this.gridRows + newRow
            }

            this.selectedIndex = newIndex
            this.updateGridSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("left", () => {
            const currentCol = Math.floor(this.selectedIndex / this.gridRows)
            const currentRow = this.selectedIndex % this.gridRows

            // Wrap horizontally
            let newCol = (currentCol - 1 + this.totalCols) % this.totalCols
            let newIndex = newCol * this.gridRows + currentRow

            // If the new position doesn't exist, find the last valid column for this row
            while (newIndex >= this.sortedPuzzles.length && newCol > 0) {
                newCol--
                newIndex = newCol * this.gridRows + currentRow
            }

            if (newIndex < this.sortedPuzzles.length) {
                this.selectedIndex = newIndex
                // Adjust scroll if needed
                if (newCol < this.scrollOffset) {
                    this.scrollOffset = newCol
                    this.refreshGrid()
                } else if (newCol >= this.scrollOffset + this.visibleCols) {
                    this.scrollOffset = Math.max(0, newCol - this.visibleCols + 1)
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

            // Wrap horizontally
            let newCol = (currentCol + 1) % this.totalCols
            let newIndex = newCol * this.gridRows + currentRow

            // If the new position doesn't exist, wrap to first column
            if (newIndex >= this.sortedPuzzles.length) {
                newCol = 0
                newIndex = newCol * this.gridRows + currentRow
            }

            if (newIndex < this.sortedPuzzles.length) {
                this.selectedIndex = newIndex
                // Adjust scroll if needed
                if (newCol < this.scrollOffset) {
                    this.scrollOffset = newCol
                    this.refreshGrid()
                } else if (newCol >= this.scrollOffset + this.visibleCols) {
                    this.scrollOffset = Math.max(0, newCol - this.visibleCols + 1)
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

        // Handle tap/mouse move - teleport selection to nearest puzzle item
        this.inputManager.on("tapMove", (_gamepadIndex, x, y) => {
            const nearestItem = this.findNearestPuzzleItem(x, y)
            if (nearestItem !== -1 && nearestItem !== this.selectedIndex) {
                this.selectedIndex = nearestItem

                // Adjust scroll if the selected item is not visible
                const selectedCol = Math.floor(this.selectedIndex / this.gridRows)
                if (selectedCol < this.scrollOffset) {
                    this.scrollOffset = selectedCol
                    this.refreshGrid()
                } else if (selectedCol >= this.scrollOffset + this.visibleCols) {
                    this.scrollOffset = Math.max(0, selectedCol - this.visibleCols + 1)
                    this.refreshGrid()
                } else {
                    this.updateGridSelection()
                }
            }
        })
    }

    // Find the nearest puzzle item to the given screen coordinates
    findNearestPuzzleItem(x, y) {
        let nearestIndex = -1
        let nearestDistance = Infinity

        // Grid container is centered at (centerX, 50%)
        const gridCenterX = this.uiScale.centerX
        const gridCenterY = this.uiScale.percent(50)

        for (const item of this.puzzleItems) {
            // Convert item's local position to screen position
            const itemScreenX = gridCenterX + item.container.x
            const itemScreenY = gridCenterY + item.container.y

            // Calculate distance from tap to item center
            const dx = x - itemScreenX
            const dy = y - itemScreenY
            const distance = Math.sqrt(dx * dx + dy * dy)

            // Check if tap is within reasonable range of the item
            const maxDistance = Math.max(this.cellWidth, this.cellHeight)
            if (distance < maxDistance && distance < nearestDistance) {
                nearestDistance = distance
                nearestIndex = item.index
            }
        }

        return nearestIndex
    }

    setupInfiniteInput() {
        this.inputManager.on("up", () => {
            this.selectedIndex = (this.selectedIndex - 1 + this.difficulties.length) % this.difficulties.length
            this.updateInfiniteSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("down", () => {
            this.selectedIndex = (this.selectedIndex + 1) % this.difficulties.length
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

        // Handle tap/mouse move - teleport selection to nearest difficulty button
        this.inputManager.on("tapMove", (_gamepadIndex, x, y) => {
            const nearestItem = this.findNearestDiffButton(x, y)
            if (nearestItem !== -1 && nearestItem !== this.selectedIndex) {
                this.selectedIndex = nearestItem
                this.updateInfiniteSelection()
            }
        })
    }

    // Find the nearest difficulty button to the given screen coordinates
    findNearestDiffButton(x, y) {
        let nearestIndex = -1
        let nearestDistance = Infinity

        for (let i = 0; i < this.difficulties.length; i++) {
            const itemY = this.diffStartY + i * this.diffSpacing
            const itemX = this.uiScale.centerX

            // Calculate distance from tap to item center
            const dx = x - itemX
            const dy = y - itemY
            const distance = Math.sqrt(dx * dx + dy * dy)

            // Check if tap is within reasonable range of the item
            const maxDistance = Math.max(this.diffWidth, this.diffHeight)
            if (distance < maxDistance && distance < nearestDistance) {
                nearestDistance = distance
                nearestIndex = i
            }
        }

        return nearestIndex
    }

    // Called by InputManager to determine which button a tap should trigger
    calcTapButton(x, y) {
        // Check back button first (available in both modes)
        // Use tight bounding box check
        if (this.backButtonSize) {
            const halfSize = this.backButtonSize / 2
            if (
                x >= this.backButtonX - halfSize &&
                x <= this.backButtonX + halfSize &&
                y >= this.backButtonY - halfSize &&
                y <= this.backButtonY + halfSize
            ) {
                return "back"
            }
        }

        // Only check arrows in regular mode (not infinite mode)
        if (this.infiniteMode) return "accept"

        // Check if tap is within arrow bounding box (tight hit detection)
        const halfSize = this.arrowSize / 2

        // Check left arrow
        if (
            x >= this.leftArrowX - halfSize &&
            x <= this.leftArrowX + halfSize &&
            y >= this.arrowY - halfSize &&
            y <= this.arrowY + halfSize
        ) {
            return "left"
        }

        // Check right arrow
        if (
            x >= this.rightArrowX - halfSize &&
            x <= this.rightArrowX + halfSize &&
            y >= this.arrowY - halfSize &&
            y <= this.arrowY + halfSize
        ) {
            return "right"
        }

        // Default to accept for puzzle items
        return "accept"
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
        this.inputManager.clearSceneListeners()
    }
}
