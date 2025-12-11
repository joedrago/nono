(function () {
    const contentEl = document.getElementById("content")
    const path = window.location.pathname

    // Check if we have a game ID in the path
    const match = path.match(/^\/remote\/([A-Za-z]+)$/)

    if (match) {
        // Display the game ID and NES controller layout
        const gameId = match[1].toUpperCase()

        // Connect to socket.io and register as a remote
        import("/socket.io/socket.io.esm.min.js").then((module) => {
            const socket = module.io()

            socket.on("connect", () => {
                console.log("Remote connected, registering with game:", gameId)
                socket.emit("remote", { gameId })
            })
        })

        contentEl.innerHTML = `
            <div class="game-id" onclick="window.location.href='/remote'">${gameId}</div>
            <div class="controller">
                <div class="controller-left">
                    <div class="dpad">
                        <div class="dpad-up"></div>
                        <div class="dpad-left"></div>
                        <div class="dpad-center"></div>
                        <div class="dpad-right"></div>
                        <div class="dpad-down"></div>
                    </div>
                </div>
                <div class="controller-center">
                    <div class="center-buttons">
                        <div class="small-button select-btn">
                            <span>SELECT</span>
                        </div>
                        <div class="small-button start-btn">
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
                            <div class="action-button b-btn"></div>
                            <div class="action-button a-btn"></div>
                        </div>
                    </div>
                </div>
            </div>
        `
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
