import { InputManager } from "../utils/InputManager.js"
import { UIScale } from "../utils/UIScale.js"
import { SaveManager } from "../utils/SaveManager.js"
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
        this.inputManager = new InputManager(this)
        this.saveManager = new SaveManager()
        this.achievementManager = new AchievementManager(this.saveManager)
        this.achievementToast = new AchievementToast(this, this.uiScale)

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

        // Victory title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(15), "COMPLETE!", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.title * 1.2 + "px",
            color: "#00ff88"
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Puzzle name
        this.puzzleName = this.add.text(this.uiScale.centerX, this.uiScale.percent(28), this.puzzle.name, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.large + "px",
            color: "#e0e0ff"
        })
        this.puzzleName.setOrigin(0.5)
        this.uiContainer.add(this.puzzleName)

        // Draw completed puzzle image
        this.drawPuzzleImage()

        // Completion stats
        if (this.infiniteMode) {
            const solved = this.saveManager.getInfiniteSolved()
            this.statsText = this.add.text(this.uiScale.centerX, this.uiScale.percent(78), `Infinite Puzzles Solved: ${solved}`, {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.medium + "px",
                color: "#aaaaff"
            })
        } else {
            const completion = this.saveManager.getCompletionPercent()
            this.statsText = this.add.text(this.uiScale.centerX, this.uiScale.percent(78), `Overall Progress: ${completion}%`, {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.medium + "px",
                color: completion === 100 ? "#00ff00" : "#aaaaff"
            })
        }
        this.statsText.setOrigin(0.5)
        this.uiContainer.add(this.statsText)

        // Instructions
        this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(90), "[A] or [B] Continue", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.small + "px",
            color: "#8888aa"
        })
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)
    }

    drawPuzzleImage() {
        const maxSize = this.uiScale.percent(35)
        const cellSize = Math.min(maxSize / this.puzzle.width, maxSize / this.puzzle.height)

        const gridWidth = this.puzzle.width * cellSize
        const gridHeight = this.puzzle.height * cellSize
        const startX = this.uiScale.centerX - gridWidth / 2
        const startY = this.uiScale.percent(40)

        const graphics = this.add.graphics()

        // Background
        graphics.fillStyle(0x222244, 1)
        graphics.fillRect(startX - 4, startY - 4, gridWidth + 8, gridHeight + 8)

        // Draw filled cells
        for (let y = 0; y < this.puzzle.height; y++) {
            for (let x = 0; x < this.puzzle.width; x++) {
                if (this.puzzle.solution[y][x] === 1) {
                    graphics.fillStyle(0x4488ff, 1)
                    graphics.fillRect(startX + x * cellSize + 1, startY + y * cellSize + 1, cellSize - 2, cellSize - 2)
                }
            }
        }

        // Border
        graphics.lineStyle(2, 0x6666ff, 1)
        graphics.strokeRect(startX - 4, startY - 4, gridWidth + 8, gridHeight + 8)

        this.uiContainer.add(graphics)
    }

    createParticles() {
        // Simple particle-like effect using graphics
        this.particles = []
        const colors = [0x00ff88, 0x4488ff, 0xff88ff, 0xffff00, 0x00ffff]

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

        this.inputManager.on("accept", goBack)
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
        this.inputManager.destroy()
        if (this.achievementToast) {
            this.achievementToast.destroy()
        }
    }
}
