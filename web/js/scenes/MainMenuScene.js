import { InputManager } from "../utils/InputManager.js"
import { UIScale } from "../utils/UIScale.js"
import { SaveManager } from "../utils/SaveManager.js"
import { ThemeManager } from "../utils/ThemeManager.js"

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: "MainMenuScene" })
    }

    create() {
        this.uiScale = new UIScale(this)
        this.inputManager = InputManager.getInstance(this.game)
        this.inputManager.setActiveScene(this)
        this.saveManager = new SaveManager()
        this.themeManager = new ThemeManager(this.saveManager)

        this.menuItems = ["Play", "Infinite Mode", "Achievements", "Themes", "Change Profile", "Quit"]
        this.selectedIndex = 0

        // Set background color from theme
        this.cameras.main.setBackgroundColor(this.themeManager.graphics.background)

        this.createUI()
        this.setupInput()

        // Handle resize
        this.scale.on("resize", () => this.handleResize())
    }

    createUI() {
        this.uiContainer = this.add.container(0, 0)
        const theme = this.themeManager.getTheme()

        // Title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(12), "NONO", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.title * 1.5 + "px",
            color: theme.text.title
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Subtitle
        this.subtitle = this.add.text(this.uiScale.centerX, this.uiScale.percent(22), "Nonogram Puzzles", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.medium + "px",
            color: theme.text.subtitle
        })
        this.subtitle.setOrigin(0.5)
        this.uiContainer.add(this.subtitle)

        // Completion percentage
        const completion = this.saveManager.getCompletionPercent()
        this.completionText = this.add.text(this.uiScale.centerX, this.uiScale.percent(30), `${completion}% Complete`, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.small + "px",
            color: completion === 100 ? theme.text.success : theme.text.muted
        })
        this.completionText.setOrigin(0.5)
        this.uiContainer.add(this.completionText)

        // Menu items
        this.menuButtons = []
        const menuStartY = this.uiScale.percent(38)
        const menuSpacing = this.uiScale.percent(8)

        this.menuItems.forEach((item, i) => {
            const btn = this.createMenuItem(item, menuStartY + i * menuSpacing)
            this.menuButtons.push(btn)
            this.uiContainer.add(btn.container)
        })

        // Profile indicator
        const slot = this.saveManager.getCurrentSlot()
        this.profileText = this.add.text(this.uiScale.percent(3), this.uiScale.percent(95), `Profile ${slot}`, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.small + "px",
            color: theme.text.muted
        })
        this.profileText.setOrigin(0, 0.5)
        this.uiContainer.add(this.profileText)

        // Instructions
        this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(88), "[A] Select", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.small + "px",
            color: theme.text.instructions
        })
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)

        this.updateSelection()
    }

    createMenuItem(text, y) {
        const container = this.add.container(this.uiScale.centerX, y)
        const theme = this.themeManager.getTheme()

        const width = this.uiScale.percent(40)
        const height = this.uiScale.percent(6)

        // Background
        const bg = this.add.graphics()
        bg.fillStyle(theme.graphics.panelBg, 0.8)
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
        container.add(bg)

        // Text
        const label = this.add.text(0, 0, text, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.medium + "px",
            color: theme.text.primary
        })
        label.setOrigin(0.5)
        container.add(label)

        // Selection indicator
        const indicator = this.add.graphics()
        indicator.lineStyle(3, theme.graphics.selectionIndicator, 1)
        indicator.strokeRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 10)
        indicator.setVisible(false)
        container.add(indicator)

        return { container, bg, label, indicator }
    }

    updateSelection() {
        this.menuButtons.forEach((btn, i) => {
            btn.indicator.setVisible(i === this.selectedIndex)
        })
    }

    setupInput() {
        this.inputManager.on("up", () => {
            this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length
            this.updateSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("down", () => {
            this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length
            this.updateSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("accept", () => {
            this.playSound("select")
            switch (this.selectedIndex) {
                case 0: // Play
                    this.scene.start("PuzzleSelectScene")
                    break
                case 1: // Infinite Mode
                    this.scene.start("PuzzleSelectScene", { infinite: true })
                    break
                case 2: // Achievements
                    this.scene.start("AchievementsScene")
                    break
                case 3: // Themes
                    this.scene.start("ThemeSelectScene")
                    break
                case 4: // Change Profile
                    this.scene.start("ProfileSelectScene")
                    break
                case 5: // Quit
                    window.close()
                    break
            }
        })
    }

    handleResize() {
        this.uiScale.update()
        this.uiContainer.destroy()
        this.createUI()
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
