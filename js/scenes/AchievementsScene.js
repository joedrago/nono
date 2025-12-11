import { InputManager } from "../utils/InputManager.js"
import { UIScale } from "../utils/UIScale.js"
import { SaveManager } from "../utils/SaveManager.js"
import { ThemeManager } from "../utils/ThemeManager.js"
import { AchievementManager } from "../utils/AchievementManager.js"

export class AchievementsScene extends Phaser.Scene {
    constructor() {
        super({ key: "AchievementsScene" })
    }

    create() {
        this.uiScale = new UIScale(this)
        this.inputManager = new InputManager(this)
        this.saveManager = new SaveManager()
        this.themeManager = new ThemeManager(this.saveManager)
        this.achievementManager = new AchievementManager(this.saveManager)

        this.gridCols = 2
        this.selectedIndex = 0

        this.achievements = this.achievementManager.getAllAchievements()

        // Set background color from theme
        this.cameras.main.setBackgroundColor(this.themeManager.graphics.background)

        this.createUI()
        this.setupInput()

        this.scale.on("resize", () => this.handleResize())
    }

    createUI() {
        this.uiContainer = this.add.container(0, 0)
        const theme = this.themeManager.getTheme()

        // Title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(8), "ACHIEVEMENTS", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.large + "px",
            color: theme.text.achievementTitle
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Progress count
        const earned = this.achievementManager.getEarnedCount()
        const total = this.achievementManager.getTotalCount()
        this.progressText = this.add.text(this.uiScale.centerX, this.uiScale.percent(15), `${earned} / ${total} Unlocked`, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.medium + "px",
            color: earned === total ? theme.text.success : theme.text.muted
        })
        this.progressText.setOrigin(0.5)
        this.uiContainer.add(this.progressText)

        // Create achievement grid
        this.createAchievementGrid()

        // Instructions
        this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(90), "[B] Back", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.small + "px",
            color: theme.text.instructions
        })
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)
    }

    createAchievementGrid() {
        this.gridContainer = this.add.container(this.uiScale.centerX, this.uiScale.percent(50))
        this.uiContainer.add(this.gridContainer)

        const cellWidth = this.uiScale.percent(42)
        const cellHeight = this.uiScale.percent(14)
        const spacingX = this.uiScale.percent(4)
        const spacingY = this.uiScale.percent(3)

        const gridWidth = this.gridCols * cellWidth + (this.gridCols - 1) * spacingX
        const gridRows = Math.ceil(this.achievements.length / this.gridCols)
        const gridHeight = gridRows * cellHeight + (gridRows - 1) * spacingY

        this.achievementItems = []

        this.achievements.forEach((achievement, i) => {
            const col = i % this.gridCols
            const row = Math.floor(i / this.gridCols)

            const x = -gridWidth / 2 + col * (cellWidth + spacingX) + cellWidth / 2
            const y = -gridHeight / 2 + row * (cellHeight + spacingY) + cellHeight / 2

            const item = this.createAchievementItem(achievement, x, y, cellWidth, cellHeight, i)
            this.achievementItems.push(item)
            this.gridContainer.add(item.container)
        })

        this.updateSelection()
    }

    createAchievementItem(achievement, x, y, width, height, _index) {
        const container = this.add.container(x, y)
        const theme = this.themeManager.getTheme()

        // Background
        const bg = this.add.graphics()
        bg.fillStyle(achievement.earned ? theme.graphics.panelBg : theme.graphics.achievementLocked, 0.9)
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6)
        container.add(bg)

        // Star
        const starX = -width / 2 + this.uiScale.percent(4)
        const star = this.add.text(starX, 0, "★", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.xlarge + "px",
            color: achievement.earned ? theme.text.achievementTitle : theme.text.achievementLocked
        })
        star.setOrigin(0.5)
        container.add(star)

        // Title
        const titleX = -width / 2 + this.uiScale.percent(9)
        const title = this.add.text(titleX, -this.uiScale.percent(2.5), achievement.title, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.small + "px",
            color: achievement.earned ? theme.text.primary : theme.text.achievementLockedText
        })
        title.setOrigin(0, 0.5)
        container.add(title)

        // Description
        const desc = this.add.text(titleX, this.uiScale.percent(2.5), achievement.description, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.tiny + "px",
            color: achievement.earned ? theme.text.muted : theme.text.achievementLockedDesc,
            wordWrap: { width: width - this.uiScale.percent(12) }
        })
        desc.setOrigin(0, 0.5)
        container.add(desc)

        // Selection indicator
        const indicator = this.add.graphics()
        indicator.lineStyle(3, theme.graphics.achievementIndicator, 1)
        indicator.strokeRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 8)
        indicator.setVisible(false)
        container.add(indicator)

        return { container, indicator, achievement }
    }

    updateSelection() {
        this.achievementItems.forEach((item, i) => {
            item.indicator.setVisible(i === this.selectedIndex)
        })
    }

    setupInput() {
        this.inputManager.on("up", () => {
            const newIndex = this.selectedIndex - this.gridCols
            if (newIndex >= 0) {
                this.selectedIndex = newIndex
                this.updateSelection()
                this.playSound("navigate")
            }
        })

        this.inputManager.on("down", () => {
            const newIndex = this.selectedIndex + this.gridCols
            if (newIndex < this.achievements.length) {
                this.selectedIndex = newIndex
                this.updateSelection()
                this.playSound("navigate")
            }
        })

        this.inputManager.on("left", () => {
            if (this.selectedIndex % this.gridCols > 0) {
                this.selectedIndex--
                this.updateSelection()
                this.playSound("navigate")
            }
        })

        this.inputManager.on("right", () => {
            if (this.selectedIndex % this.gridCols < this.gridCols - 1 && this.selectedIndex < this.achievements.length - 1) {
                this.selectedIndex++
                this.updateSelection()
                this.playSound("navigate")
            }
        })

        this.inputManager.on("back", () => {
            this.playSound("navigate")
            this.scene.start("MainMenuScene")
        })
    }

    refreshUI() {
        this.uiContainer.destroy()
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
        this.inputManager.destroy()
    }
}
