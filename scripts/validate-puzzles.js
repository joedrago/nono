#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

// NonogramValidator class adapted for Node.js
class NonogramValidator {
    constructor() {
        this.UNKNOWN = -1
        this.EMPTY = 0
        this.FILLED = 1
    }

    validate(solution) {
        const height = solution.length
        const width = solution[0].length

        const rowHints = this.calculateRowHints(solution)
        const colHints = this.calculateColHints(solution)

        const result = this.solve(width, height, rowHints, colHints)

        if (!result.complete) {
            return {
                valid: false,
                solvable: false,
                message: "Puzzle requires guessing - not line-solvable"
            }
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (result.grid[y][x] !== solution[y][x]) {
                    return {
                        valid: false,
                        solvable: true,
                        message: "Puzzle has multiple solutions - ambiguous"
                    }
                }
            }
        }

        return {
            valid: true,
            solvable: true,
            message: "Puzzle is valid and has a unique solution"
        }
    }

    solve(width, height, rowHints, colHints) {
        const grid = Array(height)
            .fill(null)
            .map(() => Array(width).fill(this.UNKNOWN))

        let changed = true
        let iterations = 0
        const maxIterations = width * height * 2

        while (changed && iterations < maxIterations) {
            changed = false
            iterations++

            for (let y = 0; y < height; y++) {
                const row = grid[y].slice()
                const newRow = this.solveLine(row, rowHints[y])
                for (let x = 0; x < width; x++) {
                    if (grid[y][x] === this.UNKNOWN && newRow[x] !== this.UNKNOWN) {
                        grid[y][x] = newRow[x]
                        changed = true
                    }
                }
            }

            for (let x = 0; x < width; x++) {
                const col = []
                for (let y = 0; y < height; y++) {
                    col.push(grid[y][x])
                }
                const newCol = this.solveLine(col, colHints[x])
                for (let y = 0; y < height; y++) {
                    if (grid[y][x] === this.UNKNOWN && newCol[y] !== this.UNKNOWN) {
                        grid[y][x] = newCol[y]
                        changed = true
                    }
                }
            }
        }

        let complete = true
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (grid[y][x] === this.UNKNOWN) {
                    complete = false
                    break
                }
            }
            if (!complete) break
        }

        return { complete, grid }
    }

    solveLine(line, hints) {
        const length = line.length
        const result = line.slice()

        if (hints.length === 1 && hints[0] === 0) {
            return result.map((cell) => (cell === this.UNKNOWN ? this.EMPTY : cell))
        }

        const arrangements = this.generateArrangements(line, hints)

        if (arrangements.length === 0) {
            return result
        }

        for (let i = 0; i < length; i++) {
            if (result[i] !== this.UNKNOWN) continue

            const firstVal = arrangements[0][i]
            let allSame = true

            for (let j = 1; j < arrangements.length; j++) {
                if (arrangements[j][i] !== firstVal) {
                    allSame = false
                    break
                }
            }

            if (allSame) {
                result[i] = firstVal
            }
        }

        return result
    }

    generateArrangements(line, hints) {
        const length = line.length
        const arrangements = []

        const minSpace = hints.reduce((sum, h) => sum + h, 0) + hints.length - 1

        if (minSpace > length) {
            return []
        }

        const generate = (hintIndex, position, current) => {
            if (hintIndex === hints.length) {
                const arrangement = current.slice()
                for (let i = position; i < length; i++) {
                    arrangement[i] = this.EMPTY
                }
                if (this.isConsistent(line, arrangement)) {
                    arrangements.push(arrangement)
                }
                return
            }

            const hint = hints[hintIndex]
            const remainingHints = hints.slice(hintIndex + 1)
            const remainingSpace = remainingHints.reduce((sum, h) => sum + h, 0) + remainingHints.length

            for (let start = position; start <= length - hint - remainingSpace; start++) {
                let canPlace = true

                for (let i = start; i < start + hint; i++) {
                    if (line[i] === this.EMPTY) {
                        canPlace = false
                        break
                    }
                }

                if (canPlace && start + hint < length && line[start + hint] === this.FILLED) {
                    canPlace = false
                }

                for (let i = position; i < start; i++) {
                    if (line[i] === this.FILLED) {
                        canPlace = false
                        break
                    }
                }

                if (canPlace) {
                    const newCurrent = current.slice()
                    for (let i = position; i < start; i++) {
                        newCurrent[i] = this.EMPTY
                    }
                    for (let i = start; i < start + hint; i++) {
                        newCurrent[i] = this.FILLED
                    }
                    const nextPos = start + hint + (hintIndex < hints.length - 1 ? 1 : 0)
                    if (hintIndex < hints.length - 1 && start + hint < length) {
                        newCurrent[start + hint] = this.EMPTY
                    }
                    generate(hintIndex + 1, nextPos, newCurrent)
                }
            }
        }

        generate(0, 0, Array(length).fill(this.UNKNOWN))
        return arrangements
    }

    isConsistent(line, arrangement) {
        for (let i = 0; i < line.length; i++) {
            if (line[i] !== this.UNKNOWN && line[i] !== arrangement[i]) {
                return false
            }
        }
        return true
    }

    calculateRowHints(solution) {
        const hints = []
        for (let y = 0; y < solution.length; y++) {
            const rowHints = []
            let count = 0
            for (let x = 0; x < solution[y].length; x++) {
                if (solution[y][x] === 1) {
                    count++
                } else if (count > 0) {
                    rowHints.push(count)
                    count = 0
                }
            }
            if (count > 0) rowHints.push(count)
            hints.push(rowHints.length > 0 ? rowHints : [0])
        }
        return hints
    }

    calculateColHints(solution) {
        const hints = []
        const width = solution[0].length
        const height = solution.length
        for (let x = 0; x < width; x++) {
            const colHints = []
            let count = 0
            for (let y = 0; y < height; y++) {
                if (solution[y][x] === 1) {
                    count++
                } else if (count > 0) {
                    colHints.push(count)
                    count = 0
                }
            }
            if (count > 0) colHints.push(count)
            hints.push(colHints.length > 0 ? colHints : [0])
        }
        return hints
    }
}

// Main validation script
const puzzlesDir = path.join(__dirname, "..", "web", "puzzles")
const difficulties = ["easy", "medium", "hard"]
const validator = new NonogramValidator()

let totalValid = 0
let totalInvalid = 0
const invalidPuzzles = []

console.log("Validating all puzzles...\n")

for (const difficulty of difficulties) {
    const difficultyDir = path.join(puzzlesDir, difficulty)

    if (!fs.existsSync(difficultyDir)) {
        continue
    }

    const files = fs.readdirSync(difficultyDir).filter((f) => f.endsWith(".json")).sort()

    for (const file of files) {
        const filePath = path.join(difficultyDir, file)
        try {
            const content = fs.readFileSync(filePath, "utf8")
            const puzzle = JSON.parse(content)
            const result = validator.validate(puzzle.solution)

            if (result.valid) {
                totalValid++
            } else {
                totalInvalid++
                invalidPuzzles.push({
                    file: `${difficulty}/${file}`,
                    name: puzzle.name,
                    message: result.message
                })
                console.log(`INVALID: ${difficulty}/${file} - ${puzzle.name}`)
                console.log(`         ${result.message}`)
            }
        } catch (err) {
            console.error(`Error reading ${filePath}: ${err.message}`)
        }
    }
}

console.log("\n" + "=".repeat(60))
console.log(`Validation complete!`)
console.log(`  Valid puzzles: ${totalValid}`)
console.log(`  Invalid puzzles: ${totalInvalid}`)

if (invalidPuzzles.length > 0) {
    console.log("\nInvalid puzzle list:")
    for (const p of invalidPuzzles) {
        console.log(`  - ${p.file}: ${p.name} (${p.message})`)
    }
    process.exit(1)
} else {
    console.log("\nAll puzzles are valid!")
    process.exit(0)
}
