const express = require("express")
const { createServer } = require("http")
const { Server } = require("socket.io")
const path = require("path")
const { RemoteManager } = require("./RemoteManager")

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)
const remoteManager = new RemoteManager()

const PORT = 3080

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }))

// Remote control routes (must be before static middleware)
app.get("/remote", (req, res) => {
    res.sendFile(path.join(__dirname, "web", "remote.html"))
})

app.get("/remote/:gameId", (req, res) => {
    res.sendFile(path.join(__dirname, "web", "remote.html"))
})

app.post("/remote", (req, res) => {
    const gameId = (req.body.gameId || "").toUpperCase()
    res.redirect(`/remote/${gameId}`)
})

app.use(express.static(path.join(__dirname, "web")))

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id)

    socket.on("game", () => {
        const gameId = remoteManager.createGame(socket)
        socket.emit("gameCreated", { gameId })
    })

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id)
        remoteManager.handleDisconnect(socket)
    })
})

httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
})
