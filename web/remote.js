;(function () {
    // Prevent default touch behavior to stop double-tap zoom, but allow form elements to work
    const shouldPreventDefault = (e) => {
        const tag = e.target.tagName
        return tag !== "INPUT" && tag !== "BUTTON" && tag !== "TEXTAREA" && tag !== "SELECT"
    }
    document.addEventListener("touchstart", (e) => shouldPreventDefault(e) && e.preventDefault(), { passive: false })
    document.addEventListener("touchend", (e) => shouldPreventDefault(e) && e.preventDefault(), { passive: false })
    document.addEventListener("touchmove", (e) => shouldPreventDefault(e) && e.preventDefault(), { passive: false })

    const contentEl = document.getElementById("content")
    const path = window.location.pathname

    // Check if we have a game ID in the path
    const match = path.match(/^\/remote\/([A-Za-z]+)$/)

    if (match) {
        // Display the game ID and NES controller layout
        const gameId = match[1].toUpperCase()

        contentEl.innerHTML = `
            <div class="game-id" onclick="window.location.href='/remote'">${gameId}</div>
            <div class="controller">
                <div class="controller-left">
                    <div class="dpad">
                        <div class="dpad-up" data-key="up"></div>
                        <div class="dpad-left" data-key="left"></div>
                        <div class="dpad-center"></div>
                        <div class="dpad-right" data-key="right"></div>
                        <div class="dpad-down" data-key="down"></div>
                    </div>
                </div>
                <div class="controller-center">
                    <div class="center-buttons">
                        <div class="small-button select-btn" data-key="select">
                            <span>SELECT</span>
                        </div>
                        <div class="small-button start-btn" data-key="start">
                            <span>START</span>
                        </div>
                    </div>
                </div>
                <div class="controller-right">
                    <div class="action-buttons">
                        <div class="button-labels">
                            <span>B</span>
                            <span>A</span>
                        </div>
                        <div class="button-row">
                            <div class="action-button b-btn" data-key="b"></div>
                            <div class="action-button a-btn" data-key="a"></div>
                        </div>
                    </div>
                </div>
            </div>
        `

        // Connect to socket.io and register as a remote
        import("/socket.io/socket.io.esm.min.js").then((module) => {
            const socket = module.io()

            socket.on("connect", () => {
                console.log("Remote connected, registering with game:", gameId)
                socket.emit("remote", { gameId })
            })

            // Set up button event listeners
            const pressedKeys = new Set()
            const buttons = document.querySelectorAll("[data-key]")
            buttons.forEach((button) => {
                const key = button.dataset.key

                // Mouse events
                button.addEventListener("mousedown", () => {
                    pressedKeys.add(key)
                    socket.emit("action", { key, state: "pressed" })
                })
                button.addEventListener("mouseup", () => {
                    pressedKeys.delete(key)
                    socket.emit("action", { key, state: "released" })
                })
                button.addEventListener("mouseleave", () => {
                    if (pressedKeys.has(key)) {
                        pressedKeys.delete(key)
                        socket.emit("action", { key, state: "released" })
                    }
                })

                // Touch events
                button.addEventListener("touchstart", (e) => {
                    e.preventDefault()
                    pressedKeys.add(key)
                    socket.emit("action", { key, state: "pressed" })
                })
                button.addEventListener("touchend", (e) => {
                    e.preventDefault()
                    pressedKeys.delete(key)
                    socket.emit("action", { key, state: "released" })
                })
                button.addEventListener("touchcancel", (e) => {
                    e.preventDefault()
                    pressedKeys.delete(key)
                    socket.emit("action", { key, state: "released" })
                })
            })

            // Keyboard event handling
            const keyMap = {
                ArrowUp: "up",
                ArrowDown: "down",
                ArrowLeft: "left",
                ArrowRight: "right",
                Enter: "a",
                Backspace: "b",
                KeyX: "x",
                Escape: "start",
                KeyY: "y",
                KeyS: "select"
            }

            document.addEventListener("keydown", (e) => {
                const key = keyMap[e.code]
                if (!key) return
                if (pressedKeys.has(key)) return // Already pressed
                pressedKeys.add(key)
                socket.emit("action", { key, state: "pressed" })
            })

            document.addEventListener("keyup", (e) => {
                const key = keyMap[e.code]
                if (!key) return
                if (!pressedKeys.has(key)) return
                pressedKeys.delete(key)
                socket.emit("action", { key, state: "released" })
            })

            // Gamepad support
            const gamepadHeld = {
                up: false,
                down: false,
                left: false,
                right: false,
                a: false,
                b: false,
                x: false,
                y: false,
                start: false,
                select: false
            }

            function pollGamepads() {
                const gamepads = navigator.getGamepads ? navigator.getGamepads() : []

                for (const pad of gamepads) {
                    if (!pad) continue

                    // D-pad (axes 0 and 1, or buttons 12-15 on standard gamepad)
                    const leftStickX = pad.axes[0] || 0
                    const leftStickY = pad.axes[1] || 0
                    const dpadUp = (pad.buttons[12] && pad.buttons[12].pressed) || leftStickY < -0.5
                    const dpadDown = (pad.buttons[13] && pad.buttons[13].pressed) || leftStickY > 0.5
                    const dpadLeft = (pad.buttons[14] && pad.buttons[14].pressed) || leftStickX < -0.5
                    const dpadRight = (pad.buttons[15] && pad.buttons[15].pressed) || leftStickX > 0.5

                    // D-pad handling
                    if (dpadUp && !gamepadHeld.up) {
                        gamepadHeld.up = true
                        socket.emit("action", { key: "up", state: "pressed" })
                    } else if (!dpadUp && gamepadHeld.up) {
                        gamepadHeld.up = false
                        socket.emit("action", { key: "up", state: "released" })
                    }

                    if (dpadDown && !gamepadHeld.down) {
                        gamepadHeld.down = true
                        socket.emit("action", { key: "down", state: "pressed" })
                    } else if (!dpadDown && gamepadHeld.down) {
                        gamepadHeld.down = false
                        socket.emit("action", { key: "down", state: "released" })
                    }

                    if (dpadLeft && !gamepadHeld.left) {
                        gamepadHeld.left = true
                        socket.emit("action", { key: "left", state: "pressed" })
                    } else if (!dpadLeft && gamepadHeld.left) {
                        gamepadHeld.left = false
                        socket.emit("action", { key: "left", state: "released" })
                    }

                    if (dpadRight && !gamepadHeld.right) {
                        gamepadHeld.right = true
                        socket.emit("action", { key: "right", state: "pressed" })
                    } else if (!dpadRight && gamepadHeld.right) {
                        gamepadHeld.right = false
                        socket.emit("action", { key: "right", state: "released" })
                    }

                    // A button (index 0 on standard gamepads)
                    const aButton = pad.buttons[0] && pad.buttons[0].pressed
                    if (aButton && !gamepadHeld.a) {
                        gamepadHeld.a = true
                        socket.emit("action", { key: "a", state: "pressed" })
                    } else if (!aButton && gamepadHeld.a) {
                        gamepadHeld.a = false
                        socket.emit("action", { key: "a", state: "released" })
                    }

                    // B button (index 1 on standard gamepads)
                    const bButton = pad.buttons[1] && pad.buttons[1].pressed
                    if (bButton && !gamepadHeld.b) {
                        gamepadHeld.b = true
                        socket.emit("action", { key: "b", state: "pressed" })
                    } else if (!bButton && gamepadHeld.b) {
                        gamepadHeld.b = false
                        socket.emit("action", { key: "b", state: "released" })
                    }

                    // X button (index 2 on standard gamepads) - same as B
                    const xButton = pad.buttons[2] && pad.buttons[2].pressed
                    if (xButton && !gamepadHeld.x) {
                        gamepadHeld.x = true
                        socket.emit("action", { key: "x", state: "pressed" })
                    } else if (!xButton && gamepadHeld.x) {
                        gamepadHeld.x = false
                        socket.emit("action", { key: "x", state: "released" })
                    }

                    // Y button (index 3 on standard gamepads) - peek
                    const yButton = pad.buttons[3] && pad.buttons[3].pressed
                    if (yButton && !gamepadHeld.y) {
                        gamepadHeld.y = true
                        socket.emit("action", { key: "y", state: "pressed" })
                    } else if (!yButton && gamepadHeld.y) {
                        gamepadHeld.y = false
                        socket.emit("action", { key: "y", state: "released" })
                    }

                    // Start button (index 9 on standard gamepads)
                    const startButton = pad.buttons[9] && pad.buttons[9].pressed
                    if (startButton && !gamepadHeld.start) {
                        gamepadHeld.start = true
                        socket.emit("action", { key: "start", state: "pressed" })
                    } else if (!startButton && gamepadHeld.start) {
                        gamepadHeld.start = false
                        socket.emit("action", { key: "start", state: "released" })
                    }

                    // Select button (index 8 on standard gamepads)
                    const selectButton = pad.buttons[8] && pad.buttons[8].pressed
                    if (selectButton && !gamepadHeld.select) {
                        gamepadHeld.select = true
                        socket.emit("action", { key: "select", state: "pressed" })
                    } else if (!selectButton && gamepadHeld.select) {
                        gamepadHeld.select = false
                        socket.emit("action", { key: "select", state: "released" })
                    }

                    // Only process first connected gamepad
                    break
                }

                requestAnimationFrame(pollGamepads)
            }

            // Start gamepad polling
            requestAnimationFrame(pollGamepads)
        })
    } else {
        // Show the form
        contentEl.innerHTML = `
            <h1>Enter Game ID</h1>
            <form method="POST" action="/remote">
                <input type="text" name="gameId" maxlength="4" placeholder="XXXX" required autofocus>
                <button type="submit">Connect</button>
            </form>
        `
    }
})()
