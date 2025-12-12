import { InputManager } from "../utils/InputManager.js"
import { UIScale } from "../utils/UIScale.js"
import { SaveManager } from "../utils/SaveManager.js"
import { ThemeManager } from "../utils/ThemeManager.js"

export class ThemeSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: "ThemeSelectScene" })
    }

    create() {
        this.uiScale = new UIScale(this)
        this.inputManager = InputManager.getInstance(this.game)
        this.inputManager.setActiveScene(this)
        this.saveManager = new SaveManager()
        this.themeManager = new ThemeManager(this.saveManager)

        this.themes = this.themeManager.getAllThemes()
        this.selectedIndex = this.themes.findIndex((t) => t.id === this.themeManager.getCurrentThemeId())
        if (this.selectedIndex < 0) this.selectedIndex = 0

        this.createUI()
        this.setupInput()

        this.scale.on("resize", () => this.handleResize())
    }

    createUI() {
        this.uiContainer = this.add.container(0, 0)

        const theme = this.themeManager.getTheme()

        // Title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(10), "THEMES", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.large + "px",
            color: theme.text.title
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Current theme indicator
        const currentTheme = this.themeManager.getTheme()
        this.currentText = this.add.text(this.uiScale.centerX, this.uiScale.percent(18), `Current: ${currentTheme.name}`, {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.medium + "px",
            color: theme.text.success
        })
        this.currentText.setOrigin(0.5)
        this.uiContainer.add(this.currentText)

        // Create theme list
        this.createThemeList()

        // Instructions (hide on touch devices)
        if (!window.nonoTouchDevice) {
            this.instructions = this.add.text(this.uiScale.centerX, this.uiScale.percent(90), "[A] Select   [B] Back", {
                fontFamily: theme.font,
                fontSize: this.uiScale.fontSize.small + "px",
                color: theme.text.instructions
            })
            this.instructions.setOrigin(0.5)
            this.uiContainer.add(this.instructions)
        }
    }

    createThemeList() {
        this.listContainer = this.add.container(this.uiScale.centerX, this.uiScale.percent(50))
        this.uiContainer.add(this.listContainer)

        this.itemWidth = this.uiScale.percent(60)
        this.itemHeight = this.uiScale.percent(14)
        this.itemSpacing = this.uiScale.percent(4)
        this.listCenterY = this.uiScale.percent(50)

        const totalHeight = this.themes.length * this.itemHeight + (this.themes.length - 1) * this.itemSpacing

        this.themeItems = []

        this.themes.forEach((themeData, i) => {
            const y = -totalHeight / 2 + i * (this.itemHeight + this.itemSpacing) + this.itemHeight / 2
            const item = this.createThemeItem(themeData, 0, y, this.itemWidth, this.itemHeight, i)
            this.themeItems.push(item)
            this.listContainer.add(item.container)
        })

        this.updateSelection()
    }

    createThemeItem(themeData, x, y, width, height, index) {
        const container = this.add.container(x, y)
        const currentTheme = this.themeManager.getTheme()
        const isActive = themeData.id === this.themeManager.getCurrentThemeId()

        // Background
        const bg = this.add.graphics()
        bg.fillStyle(currentTheme.graphics.panelBg, 0.9)
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
        container.add(bg)

        // Theme name
        const name = this.add.text(-width / 2 + this.uiScale.percent(4), -this.uiScale.percent(2), themeData.name, {
            fontFamily: currentTheme.font,
            fontSize: this.uiScale.fontSize.medium + "px",
            color: isActive ? currentTheme.text.success : currentTheme.text.primary
        })
        name.setOrigin(0, 0.5)
        container.add(name)

        // Theme description
        const desc = this.add.text(-width / 2 + this.uiScale.percent(4), this.uiScale.percent(2.5), themeData.description, {
            fontFamily: currentTheme.font,
            fontSize: this.uiScale.fontSize.tiny + "px",
            color: currentTheme.text.muted,
            wordWrap: { width: width - this.uiScale.percent(8) }
        })
        desc.setOrigin(0, 0.5)
        container.add(desc)

        // Active indicator (checkmark)
        if (isActive) {
            const check = this.add.text(width / 2 - this.uiScale.percent(4), 0, "✓", {
                fontFamily: currentTheme.font,
                fontSize: this.uiScale.fontSize.large + "px",
                color: currentTheme.text.success
            })
            check.setOrigin(0.5)
            container.add(check)
        }

        // Selection indicator
        const indicator = this.add.graphics()
        indicator.lineStyle(3, currentTheme.graphics.selectionIndicator, 1)
        indicator.strokeRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 10)
        indicator.setVisible(false)
        container.add(indicator)

        return { container, indicator, themeData, index, nameText: name }
    }

    updateSelection() {
        this.themeItems.forEach((item, i) => {
            item.indicator.setVisible(i === this.selectedIndex)
        })
    }

    setupInput() {
        this.inputManager.on("up", () => {
            this.selectedIndex = (this.selectedIndex - 1 + this.themes.length) % this.themes.length
            this.updateSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("down", () => {
            this.selectedIndex = (this.selectedIndex + 1) % this.themes.length
            this.updateSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("accept", () => {
            const selectedTheme = this.themes[this.selectedIndex]
            if (selectedTheme.id !== this.themeManager.getCurrentThemeId()) {
                this.themeManager.setTheme(selectedTheme.id)
                this.playSound("select")
                // Refresh UI to show new theme
                this.refreshUI()
            } else {
                // Already selected theme, go back
                this.playSound("navigate")
                this.scene.start("MainMenuScene")
            }
        })

        this.inputManager.on("back", () => {
            this.playSound("navigate")
            this.scene.start("MainMenuScene")
        })

        // Handle tap/mouse move - teleport selection to nearest theme item
        this.inputManager.on("tapMove", (_gamepadIndex, x, y) => {
            const nearestItem = this.findNearestThemeItem(x, y)
            if (nearestItem !== -1 && nearestItem !== this.selectedIndex) {
                this.selectedIndex = nearestItem
                this.updateSelection()
            }
        })
    }

    // Find the nearest theme item to the given screen coordinates
    findNearestThemeItem(x, y) {
        let nearestIndex = -1
        let nearestDistance = Infinity

        // List container is centered at (centerX, listCenterY)
        const listCenterX = this.uiScale.centerX

        for (const item of this.themeItems) {
            // Convert item's local position to screen position
            const itemScreenX = listCenterX + item.container.x
            const itemScreenY = this.listCenterY + item.container.y

            // Calculate distance from tap to item center
            const dx = x - itemScreenX
            const dy = y - itemScreenY
            const distance = Math.sqrt(dx * dx + dy * dy)

            // Check if tap is within reasonable range of the item
            const maxDistance = Math.max(this.itemWidth, this.itemHeight)
            if (distance < maxDistance && distance < nearestDistance) {
                nearestDistance = distance
                nearestIndex = item.index
            }
        }

        return nearestIndex
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
        this.inputManager.clearSceneListeners()
    }
}
