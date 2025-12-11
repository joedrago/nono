(function () {
    // Prevent all default touch behavior on the document to stop double-tap zoom
    document.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false })
    document.addEventListener("touchend", (e) => e.preventDefault(), { passive: false })
    document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false })

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
                Escape: "start",
                KeyY: "select"
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
