// Theme definitions and management
// Controls all colors and fonts for the game

export const THEMES = {
    classic: {
        id: "classic",
        name: "Classic",
        description: "The original color scheme",

        // Font
        font: "monospace",

        // Text colors (hex strings for Phaser text)
        text: {
            title: "#8888ff",
            subtitle: "#aaaacc",
            primary: "#e0e0ff",
            secondary: "#aaaacc",
            muted: "#888888",
            instructions: "#8888aa",
            success: "#00ff00",
            victory: "#00ff88",
            warning: "#ff4444",
            accent: "#ff88ff",
            highlight: "#aaaaff",
            stat: "#aaaaff",
            achievementTitle: "#ffdd00",
            achievementLocked: "#444444",
            achievementLockedText: "#888888",
            achievementLockedDesc: "#666666",
            hintNormal: "#ccccff",
            hintComplete: "#666688"
        },

        // Graphics colors (hex numbers for Phaser graphics)
        graphics: {
            // Backgrounds
            background: 0x1a1a2e,
            panelBg: 0x333355,
            cellEmpty: 0x222244,
            overlayBg: 0x000000,
            confirmBg: 0x442244,
            progressBarBg: 0x222244,

            // Cell states
            cellFilled: 0x4488ff,
            cellError: 0xff4444,
            cellMarker: 0xff6666,

            // Grid
            gridLine: 0x666688,
            gridLineMajor: 0x8888aa,
            puzzleBorder: 0x6666ff,

            // UI elements
            selectionIndicator: 0x00ff00,
            achievementIndicator: 0xffdd00,
            confirmBorder: 0xff4444,
            progressBar: 0x6666ff,

            // Particles
            particles: [0x00ff88, 0x4488ff, 0xff88ff, 0xffff00, 0x00ffff]
        },

        // Cursor colors for multiplayer
        cursorColors: [0x00ff00, 0xff6600, 0x00ffff, 0xff00ff]
    }
}

export class ThemeManager {
    constructor(saveManager) {
        this.saveManager = saveManager
        this.currentTheme = null
        this.loadTheme()
    }

    // Load theme from save data
    loadTheme() {
        const themeId = this.saveManager ? this.saveManager.getTheme() : "classic"
        this.currentTheme = THEMES[themeId] || THEMES.classic
    }

    // Get current theme
    getTheme() {
        if (!this.currentTheme) {
            this.loadTheme()
        }
        return this.currentTheme
    }

    // Set theme by ID
    setTheme(themeId) {
        if (THEMES[themeId]) {
            this.currentTheme = THEMES[themeId]
            if (this.saveManager) {
                this.saveManager.setTheme(themeId)
            }
            return true
        }
        return false
    }

    // Get list of all available themes
    getAllThemes() {
        return Object.values(THEMES)
    }

    // Get current theme ID
    getCurrentThemeId() {
        return this.currentTheme ? this.currentTheme.id : "classic"
    }

    // Convenience getters for common theme values
    get font() {
        return this.getTheme().font
    }

    get text() {
        return this.getTheme().text
    }

    get graphics() {
        return this.getTheme().graphics
    }

    get cursorColors() {
        return this.getTheme().cursorColors
    }

    // Get cursor color by gamepad index
    getCursorColor(gamepadIndex) {
        const colors = this.cursorColors
        if (gamepadIndex < 0) {
            return colors[0] // Keyboard gets first color
        }
        return colors[gamepadIndex % colors.length]
    }
}
