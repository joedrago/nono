#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const puzzleDir = path.join(__dirname, "..", "web", "puzzles")
const difficulties = ["easy", "medium", "hard"]

for (const difficulty of difficulties) {
    const dir = path.join(puzzleDir, difficulty)
    if (!fs.existsSync(dir)) continue

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"))

    for (const file of files) {
        // Extract the number from the filename (e.g., "001" from "001_mario_mushroom.json")
        const match = file.match(/^(\d+)_/)
        if (match) {
            const num = match[1]
            const newName = `${difficulty}_${num}.json`
            const oldPath = path.join(dir, file)
            const newPath = path.join(dir, newName)

            if (oldPath !== newPath) {
                fs.renameSync(oldPath, newPath)
                console.log(`Renamed: ${file} -> ${newName}`)
            }
        }
    }
}

console.log("\nDone!")
