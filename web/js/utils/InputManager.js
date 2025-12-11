// Unified input manager for gamepad, keyboard, and remote controls
// All input sources are treated as virtual gamepads with continuous indices

// Virtual gamepad types
const GAMEPAD_TYPE = {
    PHYSICAL: "physical",
    KEYBOARD: "keyboard",
    REMOTE: "remote"
}

// Global state that persists across InputManager instances (across scene changes)
// This ensures consistent virtual indices and a single socket listener
const globalState = {
    activeManager: null,
    listenerRegistered: false,
    remoteToVirtual: new Map(), // Persists remote registrations across scenes
    nextVirtualIndex: 0 // Global counter for all virtual gamepad types
}

export class InputManager {
    constructor(scene) {
        this.scene = scene
        this.listeners = new Map() // event -> callbacks
        this.lastInputTime = new Map() // Debounce per virtual gamepad
        this.debounceTime = 150 // ms between inputs

        // Track held button state per virtual gamepad (for drag-to-fill)
        this.heldButtons = new Map() // virtualIndex -> { accept: bool, back: bool }

        // Virtual gamepad registry - maps virtual index to source info
        // Virtual indices are assigned continuously as input sources are discovered
        this.virtualGamepads = new Map() // virtualIndex -> { type, sourceId }

        // Reverse lookups for each source type
        this.physicalToVirtual = new Map() // physical gamepad index -> virtual index
        this.keyboardVirtualIndex = null // virtual index for keyboard (lazy init)

        this.setupKeyboard()
        this.setupGamepad()
        this.setupRemote()
    }

    // Register a new virtual gamepad and return its index
    registerVirtualGamepad(type, sourceId) {
        const virtualIndex = globalState.nextVirtualIndex++
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
            const virtualIndex = this.registerVirtualGamepad(GAMEPAD_TYPE.PHYSICAL, physicalIndex)
            this.physicalToVirtual.set(physicalIndex, virtualIndex)
        }
        return this.physicalToVirtual.get(physicalIndex)
    }

    // Get virtual index for a remote control (uses global state to persist across scenes)
    getRemoteVirtualIndex(remoteIndex) {
        // Check global state first - remote may already be registered from previous scene
        if (!globalState.remoteToVirtual.has(remoteIndex)) {
            const virtualIndex = globalState.nextVirtualIndex++
            globalState.remoteToVirtual.set(remoteIndex, virtualIndex)
            console.log(`Remote ${remoteIndex} assigned virtual index ${virtualIndex}`)
        }
        const virtualIndex = globalState.remoteToVirtual.get(remoteIndex)

        // Register in this InputManager's local registry if not already
        if (!this.virtualGamepads.has(virtualIndex)) {
            this.virtualGamepads.set(virtualIndex, { type: GAMEPAD_TYPE.REMOTE, sourceId: remoteIndex })
            this.emit("gamepadConnected", virtualIndex)
        }

        return virtualIndex
    }

    setupKeyboard() {
        this.scene.input.keyboard.on("keydown", (event) => {
            const action = this.keyToAction(event.code)
            if (!action) return

            // Lazily initialize keyboard as a virtual gamepad on first input
            const virtualIndex = this.getKeyboardVirtualIndex()

            // Handle hold buttons (accept/back) specially
            if (action === "accept" || action === "back") {
                const held = this.getHeldState(virtualIndex)
                if (!held[action]) {
                    held[action] = true
                    this.emit(action + "Down", virtualIndex)
                    this.emit(action, virtualIndex)
                    this.setInputTime(virtualIndex, action)
                }
            } else if (this.canInput(virtualIndex, action)) {
                this.emit(action, virtualIndex)
                this.setInputTime(virtualIndex, action)
            }
        })

        this.scene.input.keyboard.on("keyup", (event) => {
            const action = this.keyToAction(event.code)
            if (!action) return

            // Only process if keyboard has been initialized
            if (this.keyboardVirtualIndex === null) return

            // Handle hold button release
            if (action === "accept" || action === "back") {
                const held = this.getHeldState(this.keyboardVirtualIndex)
                if (held[action]) {
                    held[action] = false
                    this.emit(action + "Up", this.keyboardVirtualIndex)
                }
            }
        })
    }

    setupGamepad() {
        // Poll gamepads in update loop
        this.scene.events.on("update", () => this.pollGamepads())

        // Handle gamepad connection - register as virtual gamepad
        this.scene.input.gamepad.on("connected", (pad) => {
            console.log(`Physical gamepad ${pad.index} connected: ${pad.id}`)
            this.getPhysicalVirtualIndex(pad.index)
        })

        this.scene.input.gamepad.on("disconnected", (pad) => {
            console.log(`Physical gamepad ${pad.index} disconnected`)
            const virtualIndex = this.physicalToVirtual.get(pad.index)
            if (virtualIndex !== undefined) {
                this.unregisterVirtualGamepad(virtualIndex)
                this.physicalToVirtual.delete(pad.index)
            }
        })

        // Initialize already connected gamepads
        if (this.scene.input.gamepad.total > 0) {
            this.scene.input.gamepad.gamepads.forEach((pad) => {
                if (pad) this.getPhysicalVirtualIndex(pad.index)
            })
        }
    }

    setupRemote() {
        const socket = window.nonoSocket
        if (!socket) return

        // Set this as the active manager to receive remote events
        globalState.activeManager = this

        // Only register the global socket listener once
        if (!globalState.listenerRegistered) {
            globalState.listenerRegistered = true

            socket.on("action", (data) => {
                // Route to whichever InputManager is currently active
                const manager = globalState.activeManager
                if (!manager) return

                manager.handleRemoteAction(data)
            })
        }
    }

    handleRemoteAction(data) {
        const { key, state, remoteIndex } = data
        const action = this.remoteKeyToAction(key)
        if (!action) return

        // Lazily initialize remote as a virtual gamepad on first input
        const virtualIndex = this.getRemoteVirtualIndex(remoteIndex)

        if (state === "pressed") {
            // Handle hold buttons (accept/back) specially
            if (action === "accept" || action === "back") {
                const held = this.getHeldState(virtualIndex)
                if (!held[action]) {
                    held[action] = true
                    this.emit(action + "Down", virtualIndex)
                    this.emit(action, virtualIndex)
                    this.setInputTime(virtualIndex, action)
                }
            } else if (this.canInput(virtualIndex, action)) {
                this.emit(action, virtualIndex)
                this.setInputTime(virtualIndex, action)
            }
        } else if (state === "released") {
            // Handle hold button release
            if (action === "accept" || action === "back") {
                const held = this.getHeldState(virtualIndex)
                if (held[action]) {
                    held[action] = false
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

            // Get virtual index for this physical gamepad
            const virtualIndex = this.getPhysicalVirtualIndex(pad.index)
            const held = this.getHeldState(virtualIndex)

            // D-pad
            if (pad.up && this.canInput(virtualIndex, "up")) {
                this.emit("up", virtualIndex)
                this.setInputTime(virtualIndex, "up")
            }
            if (pad.down && this.canInput(virtualIndex, "down")) {
                this.emit("down", virtualIndex)
                this.setInputTime(virtualIndex, "down")
            }
            if (pad.left && this.canInput(virtualIndex, "left")) {
                this.emit("left", virtualIndex)
                this.setInputTime(virtualIndex, "left")
            }
            if (pad.right && this.canInput(virtualIndex, "right")) {
                this.emit("right", virtualIndex)
                this.setInputTime(virtualIndex, "right")
            }

            // A button (index 0 on most gamepads) - Accept/Fill
            if (pad.A) {
                if (!held.accept) {
                    held.accept = true
                    this.emit("acceptDown", virtualIndex)
                    this.emit("accept", virtualIndex)
                    this.setInputTime(virtualIndex, "accept")
                }
            } else if (held.accept) {
                held.accept = false
                this.emit("acceptUp", virtualIndex)
            }

            // B button (index 1 on most gamepads) - Back/Mark X
            if (pad.B) {
                if (!held.back) {
                    held.back = true
                    this.emit("backDown", virtualIndex)
                    this.emit("back", virtualIndex)
                    this.setInputTime(virtualIndex, "back")
                }
            } else if (held.back) {
                held.back = false
                this.emit("backUp", virtualIndex)
            }

            // Start button (index 9 on standard gamepads) - Menu
            const startButton = pad.buttons[9]
            if (startButton && startButton.pressed && this.canInput(virtualIndex, "start")) {
                this.emit("start", virtualIndex)
                this.setInputTime(virtualIndex, "start")
            }

            // Y button (index 3 on standard gamepads) - Delete
            if (pad.Y && this.canInput(virtualIndex, "delete")) {
                this.emit("delete", virtualIndex)
                this.setInputTime(virtualIndex, "delete")
            }
        })
    }

    canInput(virtualIndex, button = "any") {
        const key = `${virtualIndex}-${button}`
        const lastTime = this.lastInputTime.get(key) || 0
        return Date.now() - lastTime > this.debounceTime
    }

    setInputTime(virtualIndex, button) {
        const key = `${virtualIndex}-${button}`
        this.lastInputTime.set(key, Date.now())
    }

    getHeldState(virtualIndex) {
        if (!this.heldButtons.has(virtualIndex)) {
            this.heldButtons.set(virtualIndex, { accept: false, back: false })
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

    destroy() {
        // Clear active manager if this is the current one
        if (globalState.activeManager === this) {
            globalState.activeManager = null
        }

        this.listeners.clear()
        this.virtualGamepads.clear()
        this.physicalToVirtual.clear()
        this.lastInputTime.clear()
        this.heldButtons.clear()
        this.keyboardVirtualIndex = null
    }
}
