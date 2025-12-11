// Unified input manager for gamepad, keyboard, and remote controls
// All input sources are treated as virtual gamepads with continuous indices
// This is a singleton - only one instance exists and scenes register themselves as active

// Virtual gamepad types
const GAMEPAD_TYPE = {
    PHYSICAL: "physical",
    KEYBOARD: "keyboard",
    REMOTE: "remote"
}

// Singleton instance
let instance = null

export class InputManager {
    constructor(game) {
        if (instance) {
            return instance
        }

        this.game = game
        this.activeScene = null
        this.listeners = new Map() // event -> callbacks (per-scene storage)

        // Track held button state per virtual gamepad (prevents auto-repeat)
        this.heldButtons = new Map() // virtualIndex -> { up, down, left, right, accept, back, start, delete }

        // Virtual gamepad registry - maps virtual index to source info
        // Virtual indices are assigned continuously as input sources are discovered
        this.virtualGamepads = new Map() // virtualIndex -> { type, sourceId }

        // Mappings that persist across scenes
        this.remoteToVirtual = new Map()
        this.physicalToVirtual = new Map()
        this.nextVirtualIndex = 0

        // Keyboard virtual index (lazy init)
        this.keyboardVirtualIndex = null

        // Track if global listeners are registered
        this.keyboardListenerRegistered = false
        this.gamepadListenerRegistered = false
        this.remoteListenerRegistered = false

        // Key repeat configuration
        this.repeatInitialDelay = 600 // ms before first repeat
        this.repeatRate = 150 // ms between repeats
        this.repeatTimerInterval = 50 // ms timer granularity

        // Track when each button was pressed and last repeat time
        // Map: virtualIndex -> { buttonName -> { pressedAt, lastRepeatAt } }
        this.repeatState = new Map()

        // Start the repeat timer
        this.startRepeatTimer()

        instance = this
    }

    // Get the singleton instance (create if needed)
    static getInstance(game) {
        if (!instance) {
            new InputManager(game)
        }
        return instance
    }

    // Set the active scene that receives input events
    setActiveScene(scene) {
        this.activeScene = scene

        // Clear per-scene listeners when scene changes
        this.listeners.clear()

        // Setup input listeners if not already done
        if (!this.keyboardListenerRegistered) {
            this.setupKeyboard()
        }
        if (!this.gamepadListenerRegistered) {
            this.setupGamepad()
        }
        if (!this.remoteListenerRegistered) {
            this.setupRemote()
        }

        // Re-emit gamepadConnected for all known gamepads so scene can track them
        this.virtualGamepads.forEach((_info, virtualIndex) => {
            this.emit("gamepadConnected", virtualIndex)
        })
    }

    // Register a new virtual gamepad and return its index
    registerVirtualGamepad(type, sourceId) {
        const virtualIndex = this.nextVirtualIndex++
        this.virtualGamepads.set(virtualIndex, { type, sourceId })
        console.log(`Virtual gamepad ${virtualIndex} registered: ${type} (source: ${sourceId})`)
        this.emit("gamepadConnected", virtualIndex)
        return virtualIndex
    }

    // Unregister a virtual gamepad
    unregisterVirtualGamepad(virtualIndex) {
        const info = this.virtualGamepads.get(virtualIndex)
        if (info) {
            console.log(`Virtual gamepad ${virtualIndex} unregistered: ${info.type}`)
            this.virtualGamepads.delete(virtualIndex)
            this.heldButtons.delete(virtualIndex)
            this.emit("gamepadDisconnected", virtualIndex)
        }
    }

    // Get virtual index for keyboard (lazy initialization)
    getKeyboardVirtualIndex() {
        if (this.keyboardVirtualIndex === null) {
            this.keyboardVirtualIndex = this.registerVirtualGamepad(GAMEPAD_TYPE.KEYBOARD, "keyboard")
        }
        return this.keyboardVirtualIndex
    }

    // Get virtual index for a physical gamepad
    getPhysicalVirtualIndex(physicalIndex) {
        if (!this.physicalToVirtual.has(physicalIndex)) {
            const virtualIndex = this.nextVirtualIndex++
            this.physicalToVirtual.set(physicalIndex, virtualIndex)
            this.virtualGamepads.set(virtualIndex, { type: GAMEPAD_TYPE.PHYSICAL, sourceId: physicalIndex })
            console.log(`Physical gamepad ${physicalIndex} assigned virtual index ${virtualIndex}`)
            this.emit("gamepadConnected", virtualIndex)
        }
        return this.physicalToVirtual.get(physicalIndex)
    }

    // Get virtual index for a remote control
    getRemoteVirtualIndex(remoteIndex) {
        if (!this.remoteToVirtual.has(remoteIndex)) {
            const virtualIndex = this.nextVirtualIndex++
            this.remoteToVirtual.set(remoteIndex, virtualIndex)
            this.virtualGamepads.set(virtualIndex, { type: GAMEPAD_TYPE.REMOTE, sourceId: remoteIndex })
            console.log(`Remote ${remoteIndex} assigned virtual index ${virtualIndex}`)
            this.emit("gamepadConnected", virtualIndex)
        }
        return this.remoteToVirtual.get(remoteIndex)
    }

    setupKeyboard() {
        this.keyboardListenerRegistered = true

        // Use DOM-level keyboard events (persists across scenes)
        window.addEventListener("keydown", (event) => {
            if (!this.activeScene) return

            const action = this.keyToAction(event.code)
            if (!action) return

            // Lazily initialize keyboard as a virtual gamepad on first input
            const virtualIndex = this.getKeyboardVirtualIndex()
            const held = this.getHeldState(virtualIndex)

            // Only emit if not already held (prevents auto-repeat)
            if (!held[action]) {
                held[action] = true
                this.markButtonPressed(virtualIndex, action)
                // Emit down event for accept/back (used for drag-to-fill) and peek (used for temp show errors)
                if (action === "accept" || action === "back" || action === "peek") {
                    this.emit(action + "Down", virtualIndex)
                }
                this.emit(action, virtualIndex)
            }
        })

        window.addEventListener("keyup", (event) => {
            if (!this.activeScene) return

            const action = this.keyToAction(event.code)
            if (!action) return

            // Only process if keyboard has been initialized
            if (this.keyboardVirtualIndex === null) return

            const held = this.getHeldState(this.keyboardVirtualIndex)
            if (held[action]) {
                held[action] = false
                this.markButtonReleased(this.keyboardVirtualIndex, action)
                // Emit up event for accept/back (used for drag-to-fill) and peek (used for temp show errors)
                if (action === "accept" || action === "back" || action === "peek") {
                    this.emit(action + "Up", this.keyboardVirtualIndex)
                }
            }
        })
    }

    setupGamepad() {
        this.gamepadListenerRegistered = true

        // Poll gamepads in game update loop
        this.game.events.on("step", () => this.pollGamepads())

        // Use DOM-level gamepad connection events
        window.addEventListener("gamepadconnected", (event) => {
            console.log(`Physical gamepad ${event.gamepad.index} connected: ${event.gamepad.id}`)
            this.getPhysicalVirtualIndex(event.gamepad.index)
        })

        window.addEventListener("gamepaddisconnected", (event) => {
            console.log(`Physical gamepad ${event.gamepad.index} disconnected`)
            const virtualIndex = this.physicalToVirtual.get(event.gamepad.index)
            if (virtualIndex !== undefined) {
                this.unregisterVirtualGamepad(virtualIndex)
                this.physicalToVirtual.delete(event.gamepad.index)
            }
        })

        // Initialize already connected gamepads via navigator API
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
        for (const pad of gamepads) {
            if (pad) this.getPhysicalVirtualIndex(pad.index)
        }
    }

    setupRemote() {
        const socket = window.nonoSocket
        if (!socket) return

        this.remoteListenerRegistered = true

        socket.on("action", (data) => {
            if (!this.activeScene) return
            this.handleRemoteAction(data)
        })
    }

    handleRemoteAction(data) {
        const { key, state, remoteIndex } = data
        const action = this.remoteKeyToAction(key)
        if (!action) return

        // Lazily initialize remote as a virtual gamepad on first input
        const virtualIndex = this.getRemoteVirtualIndex(remoteIndex)
        const held = this.getHeldState(virtualIndex)

        if (state === "pressed") {
            // Only emit if not already held (prevents auto-repeat)
            if (!held[action]) {
                held[action] = true
                this.markButtonPressed(virtualIndex, action)
                // Emit down event for accept/back (used for drag-to-fill)
                if (action === "accept" || action === "back") {
                    this.emit(action + "Down", virtualIndex)
                }
                this.emit(action, virtualIndex)
            }
        } else if (state === "released") {
            if (held[action]) {
                held[action] = false
                this.markButtonReleased(virtualIndex, action)
                // Emit up event for accept/back (used for drag-to-fill)
                if (action === "accept" || action === "back") {
                    this.emit(action + "Up", virtualIndex)
                }
            }
        }
    }

    remoteKeyToAction(key) {
        switch (key) {
            case "up":
                return "up"
            case "down":
                return "down"
            case "left":
                return "left"
            case "right":
                return "right"
            case "a":
                return "accept"
            case "b":
            case "x":
                return "back"
            case "start":
                return "start"
            case "select":
                return "delete"
            default:
                return null
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
            case "KeyX":
                return "back" // B button / X button
            case "Escape":
                return "start" // Start button
            case "KeyY":
                return "peek" // Temporarily show errors
            default:
                return null
        }
    }

    pollGamepads() {
        if (!this.activeScene) return

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : []

        for (const pad of gamepads) {
            if (!pad) continue

            // Get virtual index for this physical gamepad
            const virtualIndex = this.getPhysicalVirtualIndex(pad.index)
            const held = this.getHeldState(virtualIndex)

            // D-pad (axes 0 and 1, or buttons 12-15 on standard gamepad)
            const leftStickX = pad.axes[0] || 0
            const leftStickY = pad.axes[1] || 0
            const dpadUp = (pad.buttons[12] && pad.buttons[12].pressed) || leftStickY < -0.5
            const dpadDown = (pad.buttons[13] && pad.buttons[13].pressed) || leftStickY > 0.5
            const dpadLeft = (pad.buttons[14] && pad.buttons[14].pressed) || leftStickX < -0.5
            const dpadRight = (pad.buttons[15] && pad.buttons[15].pressed) || leftStickX > 0.5

            // D-pad up
            if (dpadUp) {
                if (!held.up) {
                    held.up = true
                    this.markButtonPressed(virtualIndex, "up")
                    this.emit("up", virtualIndex)
                }
            } else if (held.up) {
                held.up = false
                this.markButtonReleased(virtualIndex, "up")
            }

            // D-pad down
            if (dpadDown) {
                if (!held.down) {
                    held.down = true
                    this.markButtonPressed(virtualIndex, "down")
                    this.emit("down", virtualIndex)
                }
            } else if (held.down) {
                held.down = false
                this.markButtonReleased(virtualIndex, "down")
            }

            // D-pad left
            if (dpadLeft) {
                if (!held.left) {
                    held.left = true
                    this.markButtonPressed(virtualIndex, "left")
                    this.emit("left", virtualIndex)
                }
            } else if (held.left) {
                held.left = false
                this.markButtonReleased(virtualIndex, "left")
            }

            // D-pad right
            if (dpadRight) {
                if (!held.right) {
                    held.right = true
                    this.markButtonPressed(virtualIndex, "right")
                    this.emit("right", virtualIndex)
                }
            } else if (held.right) {
                held.right = false
                this.markButtonReleased(virtualIndex, "right")
            }

            // A button (index 0 on standard gamepads) - Accept/Fill
            const aButton = pad.buttons[0] && pad.buttons[0].pressed
            if (aButton) {
                if (!held.accept) {
                    held.accept = true
                    this.markButtonPressed(virtualIndex, "accept")
                    this.emit("acceptDown", virtualIndex)
                    this.emit("accept", virtualIndex)
                }
            } else if (held.accept) {
                held.accept = false
                this.markButtonReleased(virtualIndex, "accept")
                this.emit("acceptUp", virtualIndex)
            }

            // B button (index 1) or X button (index 2) on standard gamepads - Back/Mark X
            const bButton = pad.buttons[1] && pad.buttons[1].pressed
            const xButton = pad.buttons[2] && pad.buttons[2].pressed
            const backPressed = bButton || xButton
            if (backPressed) {
                if (!held.back) {
                    held.back = true
                    this.markButtonPressed(virtualIndex, "back")
                    this.emit("backDown", virtualIndex)
                    this.emit("back", virtualIndex)
                }
            } else if (held.back) {
                held.back = false
                this.markButtonReleased(virtualIndex, "back")
                this.emit("backUp", virtualIndex)
            }

            // Start button (index 9 on standard gamepads) - Menu
            const startButton = pad.buttons[9] && pad.buttons[9].pressed
            if (startButton) {
                if (!held.start) {
                    held.start = true
                    this.markButtonPressed(virtualIndex, "start")
                    this.emit("start", virtualIndex)
                }
            } else if (held.start) {
                held.start = false
                this.markButtonReleased(virtualIndex, "start")
            }

            // Y button (index 3 on standard gamepads) - Delete
            const yButton = pad.buttons[3] && pad.buttons[3].pressed
            if (yButton) {
                if (!held.delete) {
                    held.delete = true
                    this.markButtonPressed(virtualIndex, "delete")
                    this.emit("delete", virtualIndex)
                }
            } else if (held.delete) {
                held.delete = false
                this.markButtonReleased(virtualIndex, "delete")
            }
        }
    }

    getHeldState(virtualIndex) {
        if (!this.heldButtons.has(virtualIndex)) {
            this.heldButtons.set(virtualIndex, {
                up: false,
                down: false,
                left: false,
                right: false,
                accept: false,
                back: false,
                start: false,
                delete: false,
                peek: false
            })
        }
        return this.heldButtons.get(virtualIndex)
    }

    isHeld(virtualIndex, button) {
        const held = this.getHeldState(virtualIndex)
        return held[button] || false
    }

    // Get all active virtual gamepad indices
    getActiveGamepads() {
        return Array.from(this.virtualGamepads.keys())
    }

    // Get info about a virtual gamepad
    getGamepadInfo(virtualIndex) {
        return this.virtualGamepads.get(virtualIndex)
    }

    // Get count of active virtual gamepads
    getConnectedGamepadCount() {
        return this.virtualGamepads.size
    }

    // Key repeat methods
    startRepeatTimer() {
        setInterval(() => this.processRepeats(), this.repeatTimerInterval)
    }

    getRepeatState(virtualIndex) {
        if (!this.repeatState.has(virtualIndex)) {
            this.repeatState.set(virtualIndex, {})
        }
        return this.repeatState.get(virtualIndex)
    }

    markButtonPressed(virtualIndex, button) {
        const state = this.getRepeatState(virtualIndex)
        const now = Date.now()
        state[button] = { pressedAt: now, lastRepeatAt: now }
    }

    markButtonReleased(virtualIndex, button) {
        const state = this.getRepeatState(virtualIndex)
        delete state[button]
    }

    processRepeats() {
        if (!this.activeScene) return

        const now = Date.now()
        // Buttons that should repeat (directional only)
        const repeatableButtons = ["up", "down", "left", "right"]

        this.repeatState.forEach((buttons, virtualIndex) => {
            for (const button of repeatableButtons) {
                const timing = buttons[button]
                if (!timing) continue

                const timeSincePressed = now - timing.pressedAt
                const timeSinceLastRepeat = now - timing.lastRepeatAt

                // Check if we've passed the initial delay
                if (timeSincePressed >= this.repeatInitialDelay) {
                    // Check if enough time has passed since last repeat
                    if (timeSinceLastRepeat >= this.repeatRate) {
                        timing.lastRepeatAt = now
                        this.emit(button, virtualIndex)
                    }
                }
            }
        })
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

    emit(event, virtualIndex) {
        const callbacks = this.listeners.get(event)
        if (callbacks) {
            callbacks.forEach((cb) => cb(virtualIndex))
        }

        // Also emit 'any' event for general input handling
        const anyCallbacks = this.listeners.get("any")
        if (anyCallbacks) {
            anyCallbacks.forEach((cb) => cb(event, virtualIndex))
        }
    }

    // Called when a scene shuts down - clears listeners but keeps singleton alive
    clearSceneListeners() {
        this.listeners.clear()
    }
}
