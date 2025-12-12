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
        this.createParticles()

        // Delay input setup by 1 second to prevent accidental button presses
        this.time.delayedCall(1000, () => {
            this.setupInput()
        })

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
        // Instructions (hide on touch devices)
        if (!window.nonoTouchDevice) {
            this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(90), instructionText, {
                fontFamily: theme.font,
                fontSize: this.uiScale.fontSize.small + "px",
                color: theme.text.instructions
            })
            this.instructions.setOrigin(0.5)
            this.uiContainer.add(this.instructions)
        }

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

        // Draw button background (50% transparency)
        const backBg = this.add.graphics()
        backBg.fillStyle(theme.graphics.panelBg, 0.5)
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

    // Called by InputManager to determine which button a tap should trigger
    calcTapButton(x, y) {
        // Check back button
        if (this.backButtonSize) {
            const backHitRadius = this.backButtonSize * 1.5
            const dxBack = x - this.backButtonX
            const dyBack = y - this.backButtonY
            if (Math.sqrt(dxBack * dxBack + dyBack * dyBack) < backHitRadius) {
                return "back"
            }
        }

        // Default to accept
        return "accept"
    }

    drawPuzzleImage() {
        const theme = this.themeManager.getTheme()
        const maxSize = this.uiScale.percent(35)
        this.cellSize = Math.min(maxSize / this.puzzle.width, maxSize / this.puzzle.height)

        const gridWidth = this.puzzle.width * this.cellSize
        const gridHeight = this.puzzle.height * this.cellSize
        this.gridStartX = this.uiScale.centerX - gridWidth / 2
        this.gridStartY = this.uiScale.percent(40)

        // Background and border graphics
        const bgGraphics = this.add.graphics()
        bgGraphics.fillStyle(theme.graphics.cellEmpty, 1)
        bgGraphics.fillRect(this.gridStartX - 4, this.gridStartY - 4, gridWidth + 8, gridHeight + 8)
        bgGraphics.lineStyle(2, theme.graphics.puzzleBorder, 1)
        bgGraphics.strokeRect(this.gridStartX - 4, this.gridStartY - 4, gridWidth + 8, gridHeight + 8)
        this.uiContainer.add(bgGraphics)

        // Create individual cell graphics for animation
        this.cellGraphics = []
        const startColor = theme.graphics.cellFilled

        for (let y = 0; y < this.puzzle.height; y++) {
            this.cellGraphics[y] = []
            for (let x = 0; x < this.puzzle.width; x++) {
                if (this.puzzle.solution[y][x] === 1) {
                    const cellGfx = this.add.graphics()
                    cellGfx.fillStyle(startColor, 1)
                    cellGfx.fillRect(
                        this.gridStartX + x * this.cellSize + 1,
                        this.gridStartY + y * this.cellSize + 1,
                        this.cellSize - 2,
                        this.cellSize - 2
                    )
                    this.cellGraphics[y][x] = cellGfx
                    this.uiContainer.add(cellGfx)
                } else {
                    this.cellGraphics[y][x] = null
                }
            }
        }

        // Start color fade animation if puzzle has a picture property
        if (this.puzzle.picture) {
            this.startColorFadeAnimation()
        }
    }

    startColorFadeAnimation() {
        const theme = this.themeManager.getTheme()
        const startColor = theme.graphics.cellFilled
        const fadeDuration = 3000 // 3 seconds
        let startTime = null

        // Store start colors for each cell
        this.cellStartColors = []
        this.cellTargetColors = []

        for (let y = 0; y < this.puzzle.height; y++) {
            this.cellStartColors[y] = []
            this.cellTargetColors[y] = []
            for (let x = 0; x < this.puzzle.width; x++) {
                if (this.puzzle.solution[y][x] === 1) {
                    this.cellStartColors[y][x] = startColor
                    // Parse the picture color (could be hex number or string)
                    const pictureColor = this.puzzle.picture[y][x]
                    this.cellTargetColors[y][x] = typeof pictureColor === "string" ? parseInt(pictureColor, 16) : pictureColor
                } else {
                    this.cellStartColors[y][x] = null
                    this.cellTargetColors[y][x] = null
                }
            }
        }

        // Create the animation update loop
        this.colorFadeEvent = this.time.addEvent({
            delay: 16, // ~60fps
            callback: () => {
                // Capture start time on first callback to avoid timing issues at scene start
                if (startTime === null) {
                    startTime = this.time.now
                }
                const elapsed = this.time.now - startTime
                const progress = Math.min(elapsed / fadeDuration, 1)

                // Use easeInOut for smooth animation
                const easedProgress = this.easeInOutCubic(progress)

                for (let y = 0; y < this.puzzle.height; y++) {
                    for (let x = 0; x < this.puzzle.width; x++) {
                        if (this.cellGraphics[y][x] && this.cellStartColors[y][x] !== null) {
                            const blendedColor = this.lerpColor(
                                this.cellStartColors[y][x],
                                this.cellTargetColors[y][x],
                                easedProgress
                            )
                            this.cellGraphics[y][x].clear()
                            this.cellGraphics[y][x].fillStyle(blendedColor, 1)
                            this.cellGraphics[y][x].fillRect(
                                this.gridStartX + x * this.cellSize + 1,
                                this.gridStartY + y * this.cellSize + 1,
                                this.cellSize - 2,
                                this.cellSize - 2
                            )
                        }
                    }
                }

                if (progress >= 1) {
                    this.colorFadeEvent.remove()
                }
            },
            loop: true
        })
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    lerpColor(colorA, colorB, t) {
        const rA = (colorA >> 16) & 0xff
        const gA = (colorA >> 8) & 0xff
        const bA = colorA & 0xff

        const rB = (colorB >> 16) & 0xff
        const gB = (colorB >> 8) & 0xff
        const bB = colorB & 0xff

        const r = Math.round(rA + (rB - rA) * t)
        const g = Math.round(gA + (gB - gA) * t)
        const b = Math.round(bA + (bB - bA) * t)

        return (r << 16) | (g << 8) | b
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
        if (this.colorFadeEvent) {
            this.colorFadeEvent.remove()
            this.colorFadeEvent = null
        }
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
        if (this.colorFadeEvent) {
            this.colorFadeEvent.remove()
            this.colorFadeEvent = null
        }
        if (this.achievementToast) {
            this.achievementToast.destroy()
        }
    }
}
