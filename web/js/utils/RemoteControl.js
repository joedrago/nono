export class RemoteControl {
    constructor(socket) {
        this.socket = socket
        this.gameId = null
        this.onGameIdReceived = null

        if (this.socket) {
            this.setupListeners()
            this.requestGameId()
        }
    }

    setupListeners() {
        this.socket.on("gameCreated", (data) => {
            this.gameId = data.gameId
            console.log("Game ID received:", this.gameId)
            if (this.onGameIdReceived) {
                this.onGameIdReceived(this.gameId)
            }
        })
    }

    requestGameId() {
        this.socket.emit("game")
    }

    getGameId() {
        return this.gameId
    }

    setOnGameIdReceived(callback) {
        this.onGameIdReceived = callback
        // If we already have a game ID, call the callback immediately
        if (this.gameId) {
            callback(this.gameId)
        }
    }
}
