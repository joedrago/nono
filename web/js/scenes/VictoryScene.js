import { InputManager } from "../utils/InputManager.js"
import { UIScale } from "../utils/UIScale.js"
import { SaveManager } from "../utils/SaveManager.js"
import { ThemeManager } from "../utils/ThemeManager.js"
import { AchievementManager } from "../utils/AchievementManager.js"
import { AchievementToast } from "../utils/AchievementToast.js"

export class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: "VictoryScene" })
    }

    init(data) {
        this.puzzle = data.puzzle
        this.infiniteMode = data.infinite
    }

    create() {
        this.uiScale = new UIScale(this)
        this.inputManager = InputManager.getInstance(this.game)
        this.inputManager.setActiveScene(this)
        this.saveManager = new SaveManager()
        this.themeManager = new ThemeManager(this.saveManager)
        this.achievementManager = new AchievementManager(this.saveManager)
        this.achievementToast = new AchievementToast(this, this.uiScale)

        // Set background color from theme
        this.cameras.main.setBackgroundColor(this.themeManager.graphics.background)

        // Check for achievements
        this.achievementManager.checkFirstSolve()

        // Check for difficulty completion achievements (only for curated puzzles)
        if (!this.infiniteMode) {
            const allPuzzles = this.registry.get("puzzles") || []
            this.achievementManager.checkDifficultyCompletion(allPuzzles)
        }

        this.createUI()
        this.setupInput()
        this.createParticles()

        // Show any earned achievement toasts
        const pendingToasts = this.achievementManager.getPendingToasts()
        if (pendingToasts.length > 0) {
            this.achievementToast.showAchievements(pendingToasts)
        }

        this.scale.on("resize", () => this.handleResize())
    }

    createUI() {
        this.uiContainer = this.add.container(0, 0)
        const theme = this.themeManager.getTheme()

        // Victory title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(15), "COMPLETE!", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.title * 1.2 + "px",
            color: theme.text.victory
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Puzzle name
        this.puzzleName = this.add.text(this.uiScale.centerX, this.uiScale.percent(28), this.puzzle.name, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.large + "px",
            color: theme.text.primary
        })
        this.puzzleName.setOrigin(0.5)
        this.uiContainer.add(this.puzzleName)

        // Draw completed puzzle image
        this.drawPuzzleImage()

        // Completion stats
        if (this.infiniteMode) {
            const solved = this.saveManager.getInfiniteSolved()
            this.statsText = this.add.text(this.uiScale.centerX, this.uiScale.percent(78), `Infinite Puzzles Solved: ${solved}`, {
                fontFamily: theme.font,
                fontSize: this.uiScale.fontSize.medium + "px",
                color: theme.text.stat
            })
        } else {
            const completion = this.saveManager.getCompletionPercent()
            this.statsText = this.add.text(this.uiScale.centerX, this.uiScale.percent(78), `Overall Progress: ${completion}%`, {
                fontFamily: theme.font,
                fontSize: this.uiScale.fontSize.medium + "px",
                color: completion === 100 ? theme.text.success : theme.text.stat
            })
        }
        this.statsText.setOrigin(0.5)
        this.uiContainer.add(this.statsText)

        // Instructions
        let instructionText = "[A] Next Puzzle   [B] Puzzle Select"
        if (this.infiniteMode) {
            instructionText = "[A] New Puzzle   [B] Puzzle Select"
        } else {
            // Check if this is the last puzzle
            const allPuzzles = this.registry.get("puzzles") || []
            const sortedPuzzles = [...allPuzzles].sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0))
            const currentOrdinal = this.puzzle.ordinal || 0
            const nextPuzzle = sortedPuzzles.find((p) => (p.ordinal || 0) > currentOrdinal)
            if (!nextPuzzle) {
                instructionText = "[A] or [B] Puzzle Select"
            }
        }
        this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(90), instructionText, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.small + "px",
            color: theme.text.instructions
        })
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)
    }

    drawPuzzleImage() {
        const theme = this.themeManager.getTheme()
        const maxSize = this.uiScale.percent(35)
        const cellSize = Math.min(maxSize / this.puzzle.width, maxSize / this.puzzle.height)

        const gridWidth = this.puzzle.width * cellSize
        const gridHeight = this.puzzle.height * cellSize
        const startX = this.uiScale.centerX - gridWidth / 2
        const startY = this.uiScale.percent(40)

        const graphics = this.add.graphics()

        // Background
        graphics.fillStyle(theme.graphics.cellEmpty, 1)
        graphics.fillRect(startX - 4, startY - 4, gridWidth + 8, gridHeight + 8)

        // Draw filled cells
        for (let y = 0; y < this.puzzle.height; y++) {
            for (let x = 0; x < this.puzzle.width; x++) {
                if (this.puzzle.solution[y][x] === 1) {
                    graphics.fillStyle(theme.graphics.cellFilled, 1)
                    graphics.fillRect(startX + x * cellSize + 1, startY + y * cellSize + 1, cellSize - 2, cellSize - 2)
                }
            }
        }

        // Border
        graphics.lineStyle(2, theme.graphics.puzzleBorder, 1)
        graphics.strokeRect(startX - 4, startY - 4, gridWidth + 8, gridHeight + 8)

        this.uiContainer.add(graphics)
    }

    createParticles() {
        // Simple particle-like effect using graphics
        this.particles = []
        const theme = this.themeManager.getTheme()
        const colors = theme.graphics.particles

        for (let i = 0; i < 30; i++) {
            const particle = this.add.graphics()
            const color = colors[Math.floor(Math.random() * colors.length)]
            particle.fillStyle(color, 0.8)
            particle.fillCircle(0, 0, 4 + Math.random() * 4)

            particle.x = Math.random() * this.uiScale.width
            particle.y = -20 - Math.random() * 100
            particle.velocityY = 1 + Math.random() * 2
            particle.velocityX = (Math.random() - 0.5) * 2

            this.particles.push(particle)
        }

        // Animate particles
        this.events.on("update", () => this.updateParticles())
    }

    updateParticles() {
        this.particles.forEach((p) => {
            p.y += p.velocityY
            p.x += p.velocityX

            if (p.y > this.uiScale.height + 20) {
                p.y = -20
                p.x = Math.random() * this.uiScale.width
            }
        })
    }

    setupInput() {
        const goBack = () => {
            this.playSound("select")
            if (this.infiniteMode) {
                this.scene.start("PuzzleSelectScene", { infinite: true })
            } else {
                this.scene.start("PuzzleSelectScene")
            }
        }

        const goNext = () => {
            if (this.infiniteMode) {
                // In infinite mode, start a new puzzle of the same difficulty
                this.playSound("select")
                this.scene.start("GameScene", { infinite: true, difficulty: this.puzzle.difficulty })
                return
            }

            // Find next puzzle by ordinal
            const allPuzzles = this.registry.get("puzzles") || []
            const sortedPuzzles = [...allPuzzles].sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0))
            const currentOrdinal = this.puzzle.ordinal || 0
            const nextPuzzle = sortedPuzzles.find((p) => (p.ordinal || 0) > currentOrdinal)

            if (nextPuzzle) {
                this.playSound("select")
                this.scene.start("GameScene", { puzzle: nextPuzzle })
            } else {
                // Last puzzle, go back to selection
                goBack()
            }
        }

        this.inputManager.on("accept", goNext)
        this.inputManager.on("back", goBack)
    }

    handleResize() {
        this.uiScale.update()
        this.particles.forEach((p) => p.destroy())
        this.particles = []
        this.uiContainer.destroy()
        this.createUI()
        this.createParticles()
    }

    playSound(key) {
        if (this.sound.get(key)) {
            this.sound.play(key, { volume: 0.5 })
        }
    }

    shutdown() {
        this.inputManager.clearSceneListeners()
        if (this.achievementToast) {
            this.achievementToast.destroy()
        }
    }
}
