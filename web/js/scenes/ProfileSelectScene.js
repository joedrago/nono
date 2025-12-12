import { InputManager } from "../utils/InputManager.js"
import { UIScale } from "../utils/UIScale.js"
import { SaveManager } from "../utils/SaveManager.js"

export class ProfileSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: "ProfileSelectScene" })
    }

    create() {
        this.uiScale = new UIScale(this)
        this.inputManager = InputManager.getInstance(this.game)
        this.inputManager.setActiveScene(this)
        this.saveManager = new SaveManager()

        this.selectedSlot = 0
        this.confirmingDelete = false
        this.deleteSlot = -1

        this.createUI()
        this.setupInput()

        // Handle resize
        this.scale.on("resize", () => this.handleResize())
    }

    createUI() {
        this.uiContainer = this.add.container(0, 0)

        // Title
        this.title = this.add.text(this.uiScale.centerX, this.uiScale.percent(15), "SELECT PROFILE", {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.title + "px",
            color: "#e0e0ff"
        })
        this.title.setOrigin(0.5)
        this.uiContainer.add(this.title)

        // Slot buttons
        this.slots = []
        this.slotStartY = this.uiScale.percent(35)
        this.slotSpacing = this.uiScale.percent(15)

        for (let i = 0; i < 3; i++) {
            const slot = this.createSlot(i, this.slotStartY + i * this.slotSpacing)
            this.slots.push(slot)
            this.uiContainer.add(slot.container)
        }

        // Instructions (hide on touch devices)
        if (!window.nonoTouchDevice) {
            this.instructions = this.add.text(
                this.uiScale.centerX,
                this.uiScale.percent(88),
                "[A] Select   [Select] Delete Profile",
                {
                    fontFamily: "monospace",
                    fontSize: this.uiScale.fontSize.small + "px",
                    color: "#8888aa"
                }
            )
            this.instructions.setOrigin(0.5)
            this.uiContainer.add(this.instructions)
        }

        this.updateSelection()
    }

    createSlot(index, y) {
        const container = this.add.container(this.uiScale.centerX, y)

        const slotData = this.saveManager.getSlotInfo(index + 1)

        // Background
        const bg = this.add.graphics()
        const width = this.uiScale.percent(50)
        const height = this.uiScale.percent(12)
        bg.fillStyle(0x333355, 0.8)
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
        container.add(bg)

        // Slot number
        const numText = this.add.text(-width / 2 + this.uiScale.percent(3), 0, `${index + 1}`, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.large + "px",
            color: "#6666ff"
        })
        numText.setOrigin(0, 0.5)
        container.add(numText)

        // Slot status text
        let statusText
        if (slotData.isEmpty) {
            statusText = "Empty"
        } else {
            statusText = `${slotData.completionPercent}% Complete`
        }

        const status = this.add.text(0, 0, statusText, {
            fontFamily: "monospace",
            fontSize: this.uiScale.fontSize.medium + "px",
            color: slotData.isEmpty ? "#666688" : "#aaaacc"
        })
        status.setOrigin(0.5)
        container.add(status)

        // Selection indicator
        const indicator = this.add.graphics()
        indicator.lineStyle(3, 0x00ff00, 1)
        indicator.strokeRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 10)
        indicator.setVisible(false)
        container.add(indicator)

        return {
            container,
            bg,
            numText,
            status,
            indicator,
            width,
            height,
            data: slotData
        }
    }

    updateSelection() {
        this.slots.forEach((slot, i) => {
            slot.indicator.setVisible(i === this.selectedSlot)
        })
    }

    setupInput() {
        this.inputManager.on("up", () => {
            if (this.confirmingDelete) return
            this.selectedSlot = (this.selectedSlot - 1 + 3) % 3
            this.updateSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("down", () => {
            if (this.confirmingDelete) return
            this.selectedSlot = (this.selectedSlot + 1) % 3
            this.updateSelection()
            this.playSound("navigate")
        })

        this.inputManager.on("accept", () => {
            if (this.confirmingDelete) {
                // Confirm delete
                this.saveManager.deleteSlot(this.deleteSlot + 1)
                this.hideDeleteConfirm()
                this.refreshSlots()
                this.playSound("select")
            } else {
                // Select profile
                this.saveManager.setCurrentSlot(this.selectedSlot + 1)
                this.playSound("select")
                this.scene.start("MainMenuScene")
            }
        })

        this.inputManager.on("back", () => {
            if (this.confirmingDelete) {
                // Cancel delete
                this.hideDeleteConfirm()
                this.playSound("navigate")
            }
        })

        this.inputManager.on("delete", () => {
            if (this.confirmingDelete) return
            // Show delete confirmation if slot is not empty
            const slotData = this.saveManager.getSlotInfo(this.selectedSlot + 1)
            if (!slotData.isEmpty) {
                this.showDeleteConfirm(this.selectedSlot)
                this.playSound("navigate")
            }
        })

        // Handle tap/mouse move - teleport selection to nearest slot
        this.inputManager.on("tapMove", (_gamepadIndex, x, y) => {
            if (this.confirmingDelete) return

            const nearestSlot = this.findNearestSlot(x, y)
            if (nearestSlot !== -1 && nearestSlot !== this.selectedSlot) {
                this.selectedSlot = nearestSlot
                this.updateSelection()
            }
        })
    }

    // Find the nearest slot to the given screen coordinates
    findNearestSlot(x, y) {
        let nearestIndex = -1
        let nearestDistance = Infinity

        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i]
            const slotY = this.slotStartY + i * this.slotSpacing
            const slotX = this.uiScale.centerX

            // Calculate distance from tap to slot center
            const dx = x - slotX
            const dy = y - slotY
            const distance = Math.sqrt(dx * dx + dy * dy)

            // Check if tap is within reasonable range of the slot
            const maxDistance = Math.max(slot.width, slot.height)
            if (distance < maxDistance && distance < nearestDistance) {
                nearestDistance = distance
                nearestIndex = i
            }
        }

        return nearestIndex
    }

    showDeleteConfirm(slotIndex) {
        this.confirmingDelete = true
        this.deleteSlot = slotIndex

        // Create confirmation overlay
        this.confirmOverlay = this.add.graphics()
        this.confirmOverlay.fillStyle(0x000000, 0.7)
        this.confirmOverlay.fillRect(0, 0, this.uiScale.width, this.uiScale.height)

        const boxWidth = this.uiScale.percent(60)
        const boxHeight = this.uiScale.percent(25)

        this.confirmBox = this.add.graphics()
        this.confirmBox.fillStyle(0x442244, 1)
        this.confirmBox.fillRoundedRect(
            this.uiScale.centerX - boxWidth / 2,
            this.uiScale.centerY - boxHeight / 2,
            boxWidth,
            boxHeight,
            12
        )
        this.confirmBox.lineStyle(3, 0xff4444, 1)
        this.confirmBox.strokeRoundedRect(
            this.uiScale.centerX - boxWidth / 2,
            this.uiScale.centerY - boxHeight / 2,
            boxWidth,
            boxHeight,
            12
        )

        this.confirmText = this.add.text(
            this.uiScale.centerX,
            this.uiScale.centerY - this.uiScale.percent(5),
            "Delete Profile " + (slotIndex + 1) + "?",
            {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.large + "px",
                color: "#ff8888"
            }
        )
        this.confirmText.setOrigin(0.5)

        this.confirmInstructions = this.add.text(
            this.uiScale.centerX,
            this.uiScale.centerY + this.uiScale.percent(5),
            "[A] Confirm   [B] Cancel",
            {
                fontFamily: "monospace",
                fontSize: this.uiScale.fontSize.medium + "px",
                color: "#aaaaaa"
            }
        )
        this.confirmInstructions.setOrigin(0.5)
    }

    hideDeleteConfirm() {
        this.confirmingDelete = false
        this.deleteSlot = -1

        if (this.confirmOverlay) this.confirmOverlay.destroy()
        if (this.confirmBox) this.confirmBox.destroy()
        if (this.confirmText) this.confirmText.destroy()
        if (this.confirmInstructions) this.confirmInstructions.destroy()
    }

    refreshSlots() {
        // Recreate UI with updated data
        this.uiContainer.destroy()
        this.createUI()
    }

    handleResize() {
        this.uiScale.update()
        this.uiContainer.destroy()
        if (this.confirmingDelete) {
            this.hideDeleteConfirm()
        }
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
