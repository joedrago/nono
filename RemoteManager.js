// Consonants only (excluding vowels a, e, i, o, u)
const CONSONANTS = "bcdfghjklmnpqrstvwxyz"

function generateGameId() {
    let id = ""
    for (let i = 0; i < 4; i++) {
        id += CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)]
    }
    return id.toUpperCase()
}

class RemoteManager {
    constructor() {
        // Map of gameId -> { gameSocket, disconnectTimer, remotes }
        this.games = new Map()
        // Map of socket.id -> gameId (for quick lookup on disconnect)
        this.socketToGame = new Map()
        // Map of remote socket.id -> { gameId, index }
        this.remoteToGame = new Map()
        // Disconnect timeout in ms (5 minutes)
        this.disconnectTimeout = 5 * 60 * 1000
    }

    createGame(socket) {
        // Generate a unique game ID
        let gameId
        do {
            gameId = generateGameId()
        } while (this.games.has(gameId))

        // Store the game state
        this.games.set(gameId, {
            gameSocket: socket,
            disconnectTimer: null,
            remotes: []
        })
        this.socketToGame.set(socket.id, gameId)

        console.log(`Game created: ${gameId} for socket ${socket.id}`)
        return gameId
    }

    handleDisconnect(socket) {
        const gameId = this.socketToGame.get(socket.id)
        if (!gameId) return

        const game = this.games.get(gameId)
        if (!game) return

        console.log(`Socket ${socket.id} disconnected, starting 5 minute timer for game ${gameId}`)

        // Start the 5 minute timer
        game.disconnectTimer = setTimeout(() => {
            this.forgetGame(gameId, socket.id)
        }, this.disconnectTimeout)
    }

    handleReconnect(socket, gameId) {
        const game = this.games.get(gameId)
        if (!game) return false

        // Clear the disconnect timer if it exists
        if (game.disconnectTimer) {
            clearTimeout(game.disconnectTimer)
            game.disconnectTimer = null
        }

        // Update the socket reference
        const oldSocketId = this.socketToGame.get(socket.id)
        if (oldSocketId) {
            this.socketToGame.delete(oldSocketId)
        }

        game.gameSocket = socket
        this.socketToGame.set(socket.id, gameId)

        console.log(`Socket ${socket.id} reconnected to game ${gameId}`)
        return true
    }

    forgetGame(gameId, socketId) {
        console.log(`Forgetting game ${gameId}`)
        this.games.delete(gameId)
        if (socketId) {
            this.socketToGame.delete(socketId)
        }
    }

    getGame(gameId) {
        return this.games.get(gameId)
    }

    addRemote(socket, gameId) {
        const game = this.games.get(gameId)
        if (!game) {
            console.log(`Remote tried to join non-existent game: ${gameId}`)
            return false
        }

        // Add the remote socket to the game's remotes array
        const index = game.remotes.length
        game.remotes.push(socket)
        this.remoteToGame.set(socket.id, { gameId, index })

        console.log(`Remote ${socket.id} joined game ${gameId} as index ${index}`)

        // Listen for action events from this remote
        socket.on("action", (data) => {
            this.handleRemoteAction(socket, data)
        })

        return true
    }

    handleRemoteAction(socket, data) {
        const remoteInfo = this.remoteToGame.get(socket.id)
        if (!remoteInfo) return

        const game = this.games.get(remoteInfo.gameId)
        if (!game || !game.gameSocket) return

        // Add the remote index to the payload and relay to the game socket
        const payload = { ...data, remoteIndex: remoteInfo.index }
        game.gameSocket.emit("action", payload)
    }

    removeRemote(socket) {
        const remoteInfo = this.remoteToGame.get(socket.id)
        if (!remoteInfo) return

        const game = this.games.get(remoteInfo.gameId)
        if (game) {
            // Remove the socket from the array
            game.remotes.splice(remoteInfo.index, 1)
            console.log(`Remote ${socket.id} disconnected from game ${remoteInfo.gameId}`)

            // Update indices for all remotes after the removed one
            for (let i = remoteInfo.index; i < game.remotes.length; i++) {
                const remoteSocket = game.remotes[i]
                if (remoteSocket) {
                    const info = this.remoteToGame.get(remoteSocket.id)
                    if (info) {
                        info.index = i
                    }
                }
            }
        }

        this.remoteToGame.delete(socket.id)
    }
}

module.exports = { RemoteManager }
