// Achievement toast notification display

export class AchievementToast {
    constructor(scene, uiScale) {
        this.scene = scene
        this.uiScale = uiScale
        this.currentToast = null
        this.queue = []
        this.isShowing = false
    }

    // Add achievements to the queue and start showing if not already
    showAchievements(achievements) {
        this.queue.push(...achievements)
        if (!this.isShowing) {
            this.showNext()
        }
    }

    showNext() {
        if (this.queue.length === 0) {
            this.isShowing = false
            return
        }

        this.isShowing = true
        const achievement = this.queue.shift()
        this.displayToast(achievement)
    }

    displayToast(achievement) {
        const width = this.uiScale.percent(50)
        const height = this.uiScale.percent(12)
        const x = this.uiScale.centerX
        const startY = this.uiScale.height + height
        const targetY = this.uiScale.height - this.uiScale.percent(8)

        // Create container
        this.currentToast = this.scene.add.container(x, startY)
        this.currentToast.setDepth(1000) // Always on top

        // Background
        const bg = this.scene.add.graphics()
        bg.fillStyle(0x222244, 0.95)
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
        bg.lineStyle(2, 0xffdd00, 1)
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8)
        this.currentToast.add(bg)

        // Star icon
        const star = this.scene.add.text(-width / 2 + this.uiScale.percent(4), 0, "★", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.large + "px",
            color: "#ffdd00"
        })
        star.setOrigin(0.5)
        this.currentToast.add(star)

        // "Achievement Unlocked" header
        const header = this.scene.add.text(
            -width / 2 + this.uiScale.percent(10),
            -this.uiScale.percent(2),
            "Achievement Unlocked!",
            {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.small + "px",
                color: "#ffdd00"
            }
        )
        header.setOrigin(0, 0.5)
        this.currentToast.add(header)

        // Achievement title
        const title = this.scene.add.text(-width / 2 + this.uiScale.percent(10), this.uiScale.percent(2), achievement.title, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.medium + "px",
            color: "#ffffff"
        })
        title.setOrigin(0, 0.5)
        this.currentToast.add(title)

        // Slide in animation
        this.scene.tweens.add({
            targets: this.currentToast,
            y: targetY,
            duration: 500,
            ease: "Back.easeOut",
            onComplete: () => {
                // Wait, then fade out
                this.scene.time.delayedCall(2500, () => {
                    this.fadeOut()
                })
            }
        })
    }

    fadeOut() {
        if (!this.currentToast) return

        this.scene.tweens.add({
            targets: this.currentToast,
            alpha: 0,
            y: this.currentToast.y + this.uiScale.percent(5),
            duration: 400,
            ease: "Quad.easeIn",
            onComplete: () => {
                if (this.currentToast) {
                    this.currentToast.destroy()
                    this.currentToast = null
                }
                // Show next in queue
                this.showNext()
            }
        })
    }

    // Clean up when scene changes
    destroy() {
        if (this.currentToast) {
            this.currentToast.destroy()
            this.currentToast = null
        }
        this.queue = []
        this.isShowing = false
    }
}
