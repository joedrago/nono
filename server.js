const express = require("express")
const { createServer } = require("http")
const { Server } = require("socket.io")
const path = require("path")

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)

const PORT = 3080

app.use(express.static(path.join(__dirname, "web")))

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id)

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id)
    })
})

httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
})
