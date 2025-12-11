#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const puzzlesDir = path.join(__dirname, "..", "web", "puzzles")
const outputFile = path.join(puzzlesDir, "puzzles.json")

const difficulties = ["easy", "medium", "hard"]
const puzzles = []
let ordinal = 1

for (const difficulty of difficulties) {
    const difficultyDir = path.join(puzzlesDir, difficulty)

    if (!fs.existsSync(difficultyDir)) {
        console.log(`Warning: Directory ${difficultyDir} does not exist`)
        continue
    }

    const files = fs.readdirSync(difficultyDir).filter((f) => f.endsWith(".json")).sort()

    for (const file of files) {
        const filePath = path.join(difficultyDir, file)
        try {
            const content = fs.readFileSync(filePath, "utf8")
            const puzzle = JSON.parse(content)
            puzzle.ordinal = ordinal++
            puzzles.push(puzzle)
            console.log(`  Added: #${String(puzzle.ordinal).padStart(3, "0")} ${puzzle.name} (${puzzle.difficulty})`)
        } catch (err) {
            console.error(`Error reading ${filePath}: ${err.message}`)
        }
    }
}

const output = {
    puzzles: puzzles
}

fs.writeFileSync(outputFile, JSON.stringify(output, null, 4))

console.log(`\nBuild complete! Created ${outputFile}`)
console.log(`Total puzzles: ${puzzles.length}`)
console.log(`  Easy: ${puzzles.filter((p) => p.difficulty === "easy").length}`)
console.log(`  Medium: ${puzzles.filter((p) => p.difficulty === "medium").length}`)
console.log(`  Hard: ${puzzles.filter((p) => p.difficulty === "hard").length}`)
