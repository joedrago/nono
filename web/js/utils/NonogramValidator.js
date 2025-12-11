// Nonogram validator - checks if a puzzle is line-solvable with a unique solution
// Uses logical deduction only (no guessing/backtracking)

export class NonogramValidator {
    constructor() {
        // Cell states during solving
        this.UNKNOWN = -1
        this.EMPTY = 0
        this.FILLED = 1
    }

    /**
     * Validate a puzzle solution
     * @param {number[][]} solution - 2D array where 1 = filled, 0 = empty
     * @returns {{ valid: boolean, solvable: boolean, message: string }}
     */
    validate(solution) {
        const height = solution.length
        const width = solution[0].length

        // Calculate hints from solution
        const rowHints = this.calculateRowHints(solution)
        const colHints = this.calculateColHints(solution)

        // Try to solve using only line logic
        const result = this.solve(width, height, rowHints, colHints)

        if (!result.complete) {
            return {
                valid: false,
                solvable: false,
                message: "Puzzle requires guessing - not line-solvable"
            }
        }

        // Verify the solved grid matches the original solution
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

    /**
     * Attempt to solve a puzzle using line logic only
     * @returns {{ complete: boolean, grid: number[][] }}
     */
    solve(width, height, rowHints, colHints) {
        // Initialize grid with unknowns
        const grid = Array(height)
            .fill(null)
            .map(() => Array(width).fill(this.UNKNOWN))

        let changed = true
        let iterations = 0
        const maxIterations = width * height * 2 // Safety limit

        while (changed && iterations < maxIterations) {
            changed = false
            iterations++

            // Process each row
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

            // Process each column
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

        // Check if complete
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

    /**
     * Solve a single line (row or column) using logical deduction
     * Returns the line with any newly determined cells filled in
     */
    solveLine(line, hints) {
        const length = line.length
        const result = line.slice()

        // Handle empty hints (all cells must be empty)
        if (hints.length === 1 && hints[0] === 0) {
            return result.map((cell) => (cell === this.UNKNOWN ? this.EMPTY : cell))
        }

        // Generate all possible arrangements that fit the current constraints
        const arrangements = this.generateArrangements(line, hints)

        if (arrangements.length === 0) {
            // No valid arrangements - puzzle is invalid, but return unchanged
            return result
        }

        // Find cells that are the same in ALL arrangements
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

    /**
     * Generate all possible arrangements of hints in a line
     * that are consistent with the current known cells
     */
    generateArrangements(line, hints) {
        const length = line.length
        const arrangements = []

        // Calculate minimum space needed for all hints
        const minSpace = hints.reduce((sum, h) => sum + h, 0) + hints.length - 1

        if (minSpace > length) {
            return [] // Impossible
        }

        // Recursive helper to generate arrangements
        const generate = (hintIndex, position, current) => {
            if (hintIndex === hints.length) {
                // Fill remaining with empty and check validity
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

            // Try placing current hint at each valid position
            for (let start = position; start <= length - hint - remainingSpace; start++) {
                // Check if we can place hint here
                let canPlace = true

                // All cells in hint range must be fillable
                for (let i = start; i < start + hint; i++) {
                    if (line[i] === this.EMPTY) {
                        canPlace = false
                        break
                    }
                }

                // Cell after hint (if exists) must be emptyable
                if (canPlace && start + hint < length && line[start + hint] === this.FILLED) {
                    canPlace = false
                }

                // Cells before hint position must be emptyable
                for (let i = position; i < start; i++) {
                    if (line[i] === this.FILLED) {
                        canPlace = false
                        break
                    }
                }

                if (canPlace) {
                    const newCurrent = current.slice()
                    // Fill empty before hint
                    for (let i = position; i < start; i++) {
                        newCurrent[i] = this.EMPTY
                    }
                    // Fill hint
                    for (let i = start; i < start + hint; i++) {
                        newCurrent[i] = this.FILLED
                    }
                    // Add gap after hint if not last
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

    /**
     * Check if an arrangement is consistent with known cells
     */
    isConsistent(line, arrangement) {
        for (let i = 0; i < line.length; i++) {
            if (line[i] !== this.UNKNOWN && line[i] !== arrangement[i]) {
                return false
            }
        }
        return true
    }

    /**
     * Calculate row hints from a solution grid
     */
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

    /**
     * Calculate column hints from a solution grid
     */
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

    /**
     * Generate a valid, solvable puzzle of given size
     * Uses rejection sampling - generates random solutions until one is valid
     * @param {number} width
     * @param {number} height
     * @param {number} maxAttempts - Maximum generation attempts
     * @returns {{ solution: number[][], valid: boolean } | null}
     */
    generateValidPuzzle(width, height, maxAttempts = 100) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const solution = this.generateRandomSolution(width, height)

            // Check hint counts before expensive validation
            if (!this.checkHintCounts(solution)) {
                continue
            }

            const result = this.validate(solution)

            if (result.valid) {
                return { solution, valid: true }
            }
        }
        return null
    }

    /**
     * Check if solution has reasonable hint counts (max 3 per line, rare exceptions)
     */
    checkHintCounts(solution) {
        const rowHints = this.calculateRowHints(solution)
        const colHints = this.calculateColHints(solution)

        let overLimitCount = 0
        const maxOverLimit = 2 // Allow rare exceptions

        for (const hints of rowHints) {
            if (hints.length > 3) {
                overLimitCount++
                if (hints.length > 4 || overLimitCount > maxOverLimit) {
                    return false
                }
            }
        }

        for (const hints of colHints) {
            if (hints.length > 3) {
                overLimitCount++
                if (hints.length > 4 || overLimitCount > maxOverLimit) {
                    return false
                }
            }
        }

        return true
    }

    /**
     * Generate a random solution grid with contiguous blocks (less swiss cheese)
     */
    generateRandomSolution(width, height) {
        // Start with empty grid
        const solution = Array(height)
            .fill(null)
            .map(() => Array(width).fill(0))

        // Generate using random rectangular blocks
        const numBlocks = Math.floor((width * height) / 8) + Math.floor(Math.random() * (width * height) / 8)

        for (let i = 0; i < numBlocks; i++) {
            // Random block dimensions - prefer wider/taller blocks
            const blockWidth = 1 + Math.floor(Math.random() * Math.min(4, width))
            const blockHeight = 1 + Math.floor(Math.random() * Math.min(4, height))

            // Random position
            const startX = Math.floor(Math.random() * (width - blockWidth + 1))
            const startY = Math.floor(Math.random() * (height - blockHeight + 1))

            // Fill the block
            for (let y = startY; y < startY + blockHeight; y++) {
                for (let x = startX; x < startX + blockWidth; x++) {
                    solution[y][x] = 1
                }
            }
        }

        // Optionally add some horizontal or vertical lines
        if (Math.random() < 0.5) {
            const numLines = 1 + Math.floor(Math.random() * 2)
            for (let i = 0; i < numLines; i++) {
                if (Math.random() < 0.5) {
                    // Horizontal line segment
                    const y = Math.floor(Math.random() * height)
                    const startX = Math.floor(Math.random() * (width - 2))
                    const len = 2 + Math.floor(Math.random() * (width - startX - 1))
                    for (let x = startX; x < startX + len; x++) {
                        solution[y][x] = 1
                    }
                } else {
                    // Vertical line segment
                    const x = Math.floor(Math.random() * width)
                    const startY = Math.floor(Math.random() * (height - 2))
                    const len = 2 + Math.floor(Math.random() * (height - startY - 1))
                    for (let y = startY; y < startY + len; y++) {
                        solution[y][x] = 1
                    }
                }
            }
        }

        // Clear some random cells to create gaps (but not too many)
        const clearCount = Math.floor((width * height) * 0.1 * Math.random())
        for (let i = 0; i < clearCount; i++) {
            const x = Math.floor(Math.random() * width)
            const y = Math.floor(Math.random() * height)
            solution[y][x] = 0
        }

        return solution
    }
}
