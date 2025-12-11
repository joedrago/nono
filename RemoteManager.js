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
        // Map of gameId -> { gameSocket, disconnectTimer }
        this.games = new Map()
        // Map of socket.id -> gameId (for quick lookup on disconnect)
        this.socketToGame = new Map()
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
            disconnectTimer: null
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
}

module.exports = { RemoteManager }
