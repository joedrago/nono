// Unified input manager for gamepad and keyboard
// Supports multiple gamepads with individual cursors

export class InputManager {
    constructor(scene) {
        this.scene = scene
        this.cursors = new Map() // gamepadIndex -> cursor data
        this.listeners = new Map() // event -> callbacks
        this.lastInputTime = new Map() // Debounce per gamepad
        this.debounceTime = 150 // ms between inputs

        // Cursor colors for multi-gamepad support
        this.cursorColors = [0x00ff00, 0xff00ff, 0x00ffff, 0xffff00, 0xff8800, 0x8800ff, 0x00ff88, 0xff0088]

        // Track keyboard state for debouncing
        this.keyStates = {}

        this.setupKeyboard()
        this.setupGamepad()
    }

    setupKeyboard() {
        // Keyboard acts as gamepad index -1 (virtual gamepad)
        this.scene.input.keyboard.on("keydown", (event) => {
            const action = this.keyToAction(event.code)
            if (action && this.canInput(-1)) {
                this.emit(action, -1)
                this.lastInputTime.set(-1, Date.now())
            }
        })
    }

    setupGamepad() {
        // Poll gamepads in update loop
        this.scene.events.on("update", () => this.pollGamepads())

        // Handle gamepad connection
        this.scene.input.gamepad.on("connected", (pad) => {
            console.log(`Gamepad ${pad.index} connected: ${pad.id}`)
            this.initCursor(pad.index)
        })

        this.scene.input.gamepad.on("disconnected", (pad) => {
            console.log(`Gamepad ${pad.index} disconnected`)
            this.removeCursor(pad.index)
        })

        // Initialize already connected gamepads
        if (this.scene.input.gamepad.total > 0) {
            this.scene.input.gamepad.gamepads.forEach((pad) => {
                if (pad) this.initCursor(pad.index)
            })
        }
    }

    keyToAction(code) {
        switch (code) {
            case "ArrowUp":
                return "up"
            case "ArrowDown":
                return "down"
            case "ArrowLeft":
                return "left"
            case "ArrowRight":
                return "right"
            case "Enter":
                return "accept" // A button
            case "Backspace":
                return "back" // B button
            case "Escape":
                return "start" // Start button
            case "KeyY":
                return "delete" // Y button
            default:
                return null
        }
    }

    pollGamepads() {
        const gamepads = this.scene.input.gamepad.gamepads
        if (!gamepads) return

        gamepads.forEach((pad) => {
            if (!pad) return

            const index = pad.index

            // D-pad
            if (pad.up && this.canInput(index, "up")) {
                this.emit("up", index)
                this.setInputTime(index, "up")
            }
            if (pad.down && this.canInput(index, "down")) {
                this.emit("down", index)
                this.setInputTime(index, "down")
            }
            if (pad.left && this.canInput(index, "left")) {
                this.emit("left", index)
                this.setInputTime(index, "left")
            }
            if (pad.right && this.canInput(index, "right")) {
                this.emit("right", index)
                this.setInputTime(index, "right")
            }

            // A button (index 0 on most gamepads) - Accept/Fill
            if (pad.A && this.canInput(index, "A")) {
                this.emit("accept", index)
                this.setInputTime(index, "A")
            }

            // B button (index 1 on most gamepads) - Back/Mark X
            if (pad.B && this.canInput(index, "B")) {
                this.emit("back", index)
                this.setInputTime(index, "B")
            }

            // Start button (index 9 on standard gamepads) - Menu
            const startButton = pad.buttons[9]
            if (startButton && startButton.pressed && this.canInput(index, "start")) {
                this.emit("start", index)
                this.setInputTime(index, "start")
            }

            // Y button (index 3 on standard gamepads) - Delete
            if (pad.Y && this.canInput(index, "Y")) {
                this.emit("delete", index)
                this.setInputTime(index, "Y")
            }
        })
    }

    canInput(gamepadIndex, button = "any") {
        const key = `${gamepadIndex}-${button}`
        const lastTime = this.lastInputTime.get(key) || 0
        return Date.now() - lastTime > this.debounceTime
    }

    setInputTime(gamepadIndex, button) {
        const key = `${gamepadIndex}-${button}`
        this.lastInputTime.set(key, Date.now())
    }

    initCursor(gamepadIndex) {
        if (!this.cursors.has(gamepadIndex)) {
            this.cursors.set(gamepadIndex, {
                index: gamepadIndex,
                color: this.cursorColors[gamepadIndex % this.cursorColors.length],
                x: 0,
                y: 0
            })
        }
    }

    removeCursor(gamepadIndex) {
        this.cursors.delete(gamepadIndex)
    }

    getCursors() {
        return Array.from(this.cursors.values())
    }

    getCursorColor(gamepadIndex) {
        // Keyboard uses first color
        if (gamepadIndex === -1) return this.cursorColors[0]
        const cursor = this.cursors.get(gamepadIndex)
        return cursor ? cursor.color : this.cursorColors[0]
    }

    getConnectedGamepadCount() {
        return this.scene.input.gamepad.total
    }

    // Event emitter methods
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, [])
        }
        this.listeners.get(event).push(callback)
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return
        const callbacks = this.listeners.get(event)
        const index = callbacks.indexOf(callback)
        if (index !== -1) callbacks.splice(index, 1)
    }

    emit(event, gamepadIndex) {
        const callbacks = this.listeners.get(event)
        if (callbacks) {
            callbacks.forEach((cb) => cb(gamepadIndex))
        }

        // Also emit 'any' event for general input handling
        const anyCallbacks = this.listeners.get("any")
        if (anyCallbacks) {
            anyCallbacks.forEach((cb) => cb(event, gamepadIndex))
        }
    }

    destroy() {
        this.listeners.clear()
        this.cursors.clear()
        this.lastInputTime.clear()
    }
}
