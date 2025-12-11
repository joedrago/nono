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

// Copy a 2D array
function copySolution(solution) {
    return solution.map((row) => [...row])
}

// Try to fix a puzzle by making minimal changes
function tryFixPuzzle(solution, validator, maxAttempts = 1000) {
    const height = solution.length
    const width = solution[0].length

    // Strategy 1: Try single cell flips
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const modified = copySolution(solution)
            modified[y][x] = modified[y][x] === 1 ? 0 : 1
            if (validator.validate(modified).valid) {
                return modified
            }
        }
    }

    // Strategy 2: Try flipping two cells
    for (let y1 = 0; y1 < height; y1++) {
        for (let x1 = 0; x1 < width; x1++) {
            for (let y2 = y1; y2 < height; y2++) {
                for (let x2 = y2 === y1 ? x1 + 1 : 0; x2 < width; x2++) {
                    const modified = copySolution(solution)
                    modified[y1][x1] = modified[y1][x1] === 1 ? 0 : 1
                    modified[y2][x2] = modified[y2][x2] === 1 ? 0 : 1
                    if (validator.validate(modified).valid) {
                        return modified
                    }
                }
            }
        }
    }

    // Strategy 3: Try adding a single filled cell in empty areas (common fix for symmetry)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (solution[y][x] === 0) {
                const modified = copySolution(solution)
                modified[y][x] = 1
                if (validator.validate(modified).valid) {
                    return modified
                }
            }
        }
    }

    // Strategy 4: Try removing a single filled cell
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (solution[y][x] === 1) {
                const modified = copySolution(solution)
                modified[y][x] = 0
                if (validator.validate(modified).valid) {
                    return modified
                }
            }
        }
    }

    // Strategy 5: Try flipping three cells
    let attempts = 0
    for (let y1 = 0; y1 < height && attempts < maxAttempts; y1++) {
        for (let x1 = 0; x1 < width && attempts < maxAttempts; x1++) {
            for (let y2 = 0; y2 < height && attempts < maxAttempts; y2++) {
                for (let x2 = 0; x2 < width && attempts < maxAttempts; x2++) {
                    if (y2 < y1 || (y2 === y1 && x2 <= x1)) continue
                    for (let y3 = 0; y3 < height && attempts < maxAttempts; y3++) {
                        for (let x3 = 0; x3 < width && attempts < maxAttempts; x3++) {
                            if (y3 < y2 || (y3 === y2 && x3 <= x2)) continue
                            attempts++
                            const modified = copySolution(solution)
                            modified[y1][x1] = modified[y1][x1] === 1 ? 0 : 1
                            modified[y2][x2] = modified[y2][x2] === 1 ? 0 : 1
                            modified[y3][x3] = modified[y3][x3] === 1 ? 0 : 1
                            if (validator.validate(modified).valid) {
                                return modified
                            }
                        }
                    }
                }
            }
        }
    }

    return null
}

// Main script
const puzzlesDir = path.join(__dirname, "..", "web", "puzzles")
const validator = new NonogramValidator()

const invalidPuzzles = [
    "easy/002_pac_man.json",
    "easy/012_tetris_s.json",
    "easy/019_minecraft_sword.json",
    "easy/033_duck_hunt.json",
    "easy/046_pitfall_vine.json",
    "easy/049_joust_bird.json",
    "medium/003_sonic_face.json",
    "medium/009_mushroom_big.json",
    "medium/011_kirby_full.json",
    "medium/012_megaman_face.json",
    "medium/031_kid_icarus_pit.json",
    "medium/035_robotron_man.json",
    "medium/041_centipede_full.json",
    "medium/043_pong_full.json",
    "hard/002_link_full.json",
    "hard/003_sonic_full.json",
    "hard/007_pikachu_full.json",
    "hard/010_space_invader_big.json",
    "hard/013_ghost_full.json",
    "hard/014_mushroom_xl.json",
    "hard/017_contra_spread.json",
    "hard/020_metroid_full.json",
    "hard/027_duck_hunt_scene.json",
    "hard/031_balloon_fight_xl.json",
    "hard/033_kid_icarus_xl.json",
    "hard/037_robotron_xl.json",
    "hard/040_qbert_xl.json",
    "hard/043_centipede_xl.json",
    "hard/045_pong_xl.json"
]

let fixed = 0
let failed = 0

console.log("Attempting to fix invalid puzzles...\n")

for (const puzzlePath of invalidPuzzles) {
    const filePath = path.join(puzzlesDir, puzzlePath)
    try {
        const content = fs.readFileSync(filePath, "utf8")
        const puzzle = JSON.parse(content)

        console.log(`Processing: ${puzzlePath} - ${puzzle.name}`)

        const fixedSolution = tryFixPuzzle(puzzle.solution, validator)

        if (fixedSolution) {
            puzzle.solution = fixedSolution
            fs.writeFileSync(filePath, JSON.stringify(puzzle, null, 4) + "\n")
            console.log(`  FIXED!`)
            fixed++
        } else {
            console.log(`  Could not fix automatically`)
            failed++
        }
    } catch (err) {
        console.error(`Error processing ${filePath}: ${err.message}`)
        failed++
    }
}

console.log("\n" + "=".repeat(60))
console.log(`Fix complete!`)
console.log(`  Fixed: ${fixed}`)
console.log(`  Failed: ${failed}`)

if (failed > 0) {
    process.exit(1)
}
