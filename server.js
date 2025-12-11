const express = require("express")
const path = require("path")
const fs = require("fs")

const app = express()
const PORT = process.env.PORT || 3000

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")))

// API endpoint to get puzzles
app.get("/api/puzzles", (req, res) => {
    const puzzlesPath = path.join(__dirname, "public", "puzzles", "puzzles.json")
    try {
        const data = fs.readFileSync(puzzlesPath, "utf8")
        res.json(JSON.parse(data))
    } catch (err) {
        res.status(500).json({ error: "Failed to load puzzles" })
    }
})

// API endpoint to generate infinite puzzle
app.get("/api/infinite", (req, res) => {
    const difficulty = req.query.difficulty || "easy"
    const sizes = { easy: 5, medium: 10, hard: 15 }
    const size = sizes[difficulty] || 5

    const puzzle = generateRandomPuzzle(size)
    res.json(puzzle)
})

// Generate a random valid nonogram puzzle
function generateRandomPuzzle(size) {
    // Generate random solution with 30-70% density
    const density = 0.3 + Math.random() * 0.4
    const solution = []

    for (let y = 0; y < size; y++) {
        const row = []
        for (let x = 0; x < size; x++) {
            row.push(Math.random() < density ? 1 : 0)
        }
        solution.push(row)
    }

    return {
        id: "infinite_" + Date.now(),
        name: "Infinite",
        difficulty: size === 5 ? "easy" : size === 10 ? "medium" : "hard",
        width: size,
        height: size,
        solution
    }
}

// Serve index.html for root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.listen(PORT, () => {
    console.log(`Nono server running at http://localhost:${PORT}`)
})
