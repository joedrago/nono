(function () {
    const contentEl = document.getElementById("content")
    const path = window.location.pathname

    // Check if we have a game ID in the path
    const match = path.match(/^\/remote\/([A-Za-z]+)$/)

    if (match) {
        // Display the game ID
        const gameId = match[1].toUpperCase()
        contentEl.innerHTML = `<div class="game-id">${gameId}</div>`
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
