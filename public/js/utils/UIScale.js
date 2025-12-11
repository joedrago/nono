// UI scaling utilities based on game height
// All measurements are percentages of game height for responsive design

export class UIScale {
    constructor(scene) {
        this.scene = scene
        this.update()

        // Update on resize
        this.scene.scale.on("resize", () => this.update())
    }

    update() {
        this.width = this.scene.scale.width
        this.height = this.scene.scale.height
        this.baseUnit = this.height / 100 // 1% of height
    }

    // Get a size based on percentage of height
    percent(p) {
        return this.baseUnit * p
    }

    // Common size presets
    get fontSize() {
        return {
            tiny: this.percent(2),
            small: this.percent(3),
            medium: this.percent(4),
            large: this.percent(6),
            xlarge: this.percent(8),
            title: this.percent(10)
        }
    }

    get spacing() {
        return {
            tiny: this.percent(1),
            small: this.percent(2),
            medium: this.percent(4),
            large: this.percent(6),
            xlarge: this.percent(10)
        }
    }

    get button() {
        return {
            width: this.percent(40),
            height: this.percent(8),
            padding: this.percent(2)
        }
    }

    get cell() {
        return {
            // Cell size will be calculated based on puzzle size
            small: this.percent(3), // For 15x15
            medium: this.percent(4), // For 10x10
            large: this.percent(6) // For 5x5
        }
    }

    // Get cell size based on puzzle dimensions
    getCellSize(puzzleWidth, puzzleHeight) {
        // Reserve space for hints (roughly 30% of each dimension)
        const availableWidth = this.width * 0.65
        const availableHeight = this.height * 0.65

        const cellByWidth = availableWidth / puzzleWidth
        const cellByHeight = availableHeight / puzzleHeight

        // Use the smaller to ensure puzzle fits
        return Math.floor(Math.min(cellByWidth, cellByHeight))
    }

    // Center position helpers
    get centerX() {
        return this.width / 2
    }

    get centerY() {
        return this.height / 2
    }

    // Screen bounds
    get bounds() {
        return {
            left: 0,
            right: this.width,
            top: 0,
            bottom: this.height
        }
    }
}
