import { UIScale } from "../utils/UIScale.js"

export class OverlayScene extends Phaser.Scene {
    constructor() {
        super({ key: "OverlayScene" })
        this.gameId = null
    }

    create() {
        this.uiScale = new UIScale(this)

        this.createOverlay()

        this.scale.on("resize", this.handleResize, this)

        // Connect to RemoteControl if available
        this.connectToRemoteControl()
    }

    connectToRemoteControl() {
        const remoteControl = window.nonoRemoteControl
        if (remoteControl) {
            remoteControl.setOnGameIdReceived((gameId) => {
                this.setGameId(gameId)
            })
        } else {
            // RemoteControl might not be ready yet, check again shortly
            this.time.delayedCall(100, () => {
                this.connectToRemoteControl()
            })
        }
    }

    createOverlay() {
        const padding = this.uiScale.percent(2)

        if (this.gameIdText) {
            this.gameIdText.destroy()
        }

        const displayText = this.gameId || ""

        this.gameIdText = this.add
            .text(this.scale.width - padding, this.scale.height - padding, displayText, {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.small + "px",
                color: "#888888"
            })
            .setOrigin(1, 1)
    }

    handleResize() {
        this.uiScale = new UIScale(this)
        this.createOverlay()
    }

    // Public methods to control the overlay from other scenes
    setGameId(gameId) {
        this.gameId = gameId
        if (this.gameIdText) {
            this.gameIdText.setText(gameId)
        }
    }

    setGameIdColor(color) {
        if (this.gameIdText) {
            this.gameIdText.setColor(color)
        }
    }

    showGameId() {
        if (this.gameIdText) {
            this.gameIdText.setVisible(true)
        }
    }

    hideGameId() {
        if (this.gameIdText) {
            this.gameIdText.setVisible(false)
        }
    }
}
