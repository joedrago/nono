import { UIScale } from "../utils/UIScale.js"
import { AssetGenerator } from "../utils/AssetGenerator.js"
import { SaveManager } from "../utils/SaveManager.js"
import { ThemeManager } from "../utils/ThemeManager.js"

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: "BootScene" })
    }

    preload() {
        this.uiScale = new UIScale(this)
        // Use ThemeManager with null saveManager to get default classic theme
        this.themeManager = new ThemeManager(null)
        const theme = this.themeManager.getTheme()

        // Set background color from theme
        this.cameras.main.setBackgroundColor(theme.graphics.background)

        // Create loading bar
        const width = this.scale.width
        const height = this.scale.height
        const barWidth = width * 0.6
        const barHeight = height * 0.03

        const progressBox = this.add.graphics()
        const progressBar = this.add.graphics()

        progressBox.fillStyle(theme.graphics.progressBarBg, 0.8)
        progressBox.fillRect(width / 2 - barWidth / 2 - 10, height / 2 - barHeight / 2 - 10, barWidth + 20, barHeight + 20)

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 - barHeight - 30, "Loading...", {
            fontFamily: theme.font,
            fontSize: this.uiScale.fontSize.medium + "px",
            color: theme.text.primary
        })
        loadingText.setOrigin(0.5)

        // Progress bar update
        this.load.on("progress", (value) => {
            progressBar.clear()
            progressBar.fillStyle(theme.graphics.progressBar, 1)
            progressBar.fillRect(width / 2 - barWidth / 2, height / 2 - barHeight / 2, barWidth * value, barHeight)
        })

        this.load.on("complete", () => {
            progressBar.destroy()
            progressBox.destroy()
            loadingText.destroy()
        })

        // Load puzzles data
        this.load.json("puzzles", "puzzles/puzzles.json")
    }

    create() {
        // Generate all graphical assets programmatically
        AssetGenerator.generateAssets(this)

        // Try to generate sounds - may fail if AudioContext is suspended (iOS Safari)
        // In that case, main.js will generate them on first user gesture
        AssetGenerator.generateSounds(this)

        // Store puzzles in registry for access across scenes
        const puzzlesData = this.cache.json.get("puzzles")
        if (puzzlesData) {
            this.registry.set("puzzles", puzzlesData.puzzles)
            // Set total puzzle count for completion tracking
            SaveManager.setTotalPuzzleCount(puzzlesData.puzzles.length)
        }

        // Launch the overlay scene to persist across all other scenes
        this.scene.launch("OverlayScene")
        this.scene.bringToTop("OverlayScene")

        // Short delay then transition to profile select
        this.time.delayedCall(100, () => {
            this.scene.start("ProfileSelectScene")
        })
    }
}
