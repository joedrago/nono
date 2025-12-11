import { InputManager } from "../utils/InputManager.js"
import { UIScale } from "../utils/UIScale.js"
import { SaveManager } from "../utils/SaveManager.js"

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: "MainMenuScene" })
    }

    create() {
        this.uiScale = new UIScale(this)
        this.inputManager = new InputManager(this)
        this.saveManager = new SaveManager()

        this.menuItems = ["Play", "Infinite Mode", "Achievements", "Change Profile"]
        this.selectedIndex = 0

        this.createUI()
        this.setupInput()

        // Handle resize
        this.scale.on("resize", () => this.handleResize())
    }

    createUI() {
        this.uiContainer = this.add.container(0, 0)

        // Title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(12), "NONO", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.title * 1.5 + "px",
            color: "#8888ff"
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Subtitle
        this.subtitle = this.add.text(this.uiScale.centerX, this.uiScale.percent(22), "Nonogram Puzzles", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.medium + "px",
            color: "#aaaacc"
        })
        this.subtitle.setOrigin(0.5)
        this.uiContainer.add(this.subtitle)

        // Completion percentage
        const completion = this.saveManager.getCompletionPercent()
        this.completionText = this.add.text(this.uiScale.centerX, this.uiScale.percent(30), `${completion}% Complete`, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.small + "px",
            color: completion === 100 ? "#00ff00" : "#888888"
        })
        this.completionText.setOrigin(0.5)
        this.uiContainer.add(this.completionText)

        // Menu items
        this.menuButtons = []
        const menuStartY = this.uiScale.percent(45)
        const menuSpacing = this.uiScale.percent(12)

        this.menuItems.forEach((item, i) => {
            const btn = this.createMenuItem(item, menuStartY + i * menuSpacing)
            this.menuButtons.push(btn)
            this.uiContainer.add(btn.container)
        })

        // Profile indicator
        const slot = this.saveManager.getCurrentSlot()
        this.profileText = this.add.text(this.uiScale.percent(3), this.uiScale.percent(95), `Profile ${slot}`, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.small + "px",
            color: "#666688"
        })
        this.profileText.setOrigin(0, 0.5)
        this.uiContainer.add(this.profileText)

        // Instructions
        this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(88), "[A] Select   [B] Back", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.small + "px",
            color: "#8888aa"
        })
        this.instructions.setOrigin(0.5)
        this.uiContainer.add(this.instructions)

        this.updateSelection()
    }

    createMenuItem(text, y) {
        const container = this.add.container(this.uiScale.centerX, y)

        const width = this.uiScale.percent(45)
        const height = this.uiScale.percent(9)

        // Background
        const bg = this.add.graphics()
        bg.fillStyle(0x333355, 0.8)
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
        container.add(bg)

        // Text
        const label = this.add.text(0, 0, text, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.medium + "px",
            color: "#e0e0ff"
        })
        label.setOrigin(0.5)
        container.add(label)

        // Selection indicator
        const indicator = this.add.graphics()
        indicator.lineStyle(3, 0x00ff00, 1)
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
            this.selectedIndex = Math.max(0, this.selectedIndex - 1)
            this.updateSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("down", () => {
            this.selectedIndex = Math.min(this.menuItems.length - 1, this.selectedIndex + 1)
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
                case 3: // Change Profile
                    this.scene.start("ProfileSelectScene")
                    break
            }
        })

        this.inputManager.on("back", () => {
            this.playSound("navigate")
            this.scene.start("ProfileSelectScene")
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
        this.inputManager.destroy()
    }
}
