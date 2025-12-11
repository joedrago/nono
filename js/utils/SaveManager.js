// Save data manager using localStorage
// Supports 3 save slots with progress tracking

export class SaveManager {
    constructor() {
        this.storageKey = "nono_saves"
        this.currentSlotKey = "nono_current_slot"
    }

    // Get all save data
    getAllData() {
        const data = localStorage.getItem(this.storageKey)
        if (data) {
            return JSON.parse(data)
        }
        return {
            slots: {
                1: null,
                2: null,
                3: null
            }
        }
    }

    // Save all data
    saveAllData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data))
    }

    // Get current slot number
    getCurrentSlot() {
        return parseInt(localStorage.getItem(this.currentSlotKey)) || 1
    }

    // Set current slot number
    setCurrentSlot(slot) {
        localStorage.setItem(this.currentSlotKey, slot.toString())

        // Initialize slot if empty
        const data = this.getAllData()
        if (!data.slots[slot]) {
            data.slots[slot] = this.createEmptySlot(slot)
            this.saveAllData(data)
        }
    }

    // Create empty slot data
    createEmptySlot(slot) {
        return {
            slot,
            completedPuzzles: [],
            puzzleProgress: {},
            infiniteSolved: {
                easy: 0,
                medium: 0,
                hard: 0
            }
        }
    }

    // Migrate old infiniteSolved format (number) to new format (object by difficulty)
    migrateInfiniteSolved(slotData) {
        if (typeof slotData.infiniteSolved === "number") {
            // Old format - convert to new format, put all in easy as default
            slotData.infiniteSolved = {
                easy: slotData.infiniteSolved,
                medium: 0,
                hard: 0
            }
        } else if (!slotData.infiniteSolved) {
            slotData.infiniteSolved = {
                easy: 0,
                medium: 0,
                hard: 0
            }
        }
        return slotData
    }

    // Get slot info for UI display
    getSlotInfo(slot) {
        const data = this.getAllData()
        const slotData = data.slots[slot]

        if (!slotData) {
            return {
                isEmpty: true,
                completionPercent: 0
            }
        }

        return {
            isEmpty: false,
            completionPercent: this.calculateCompletionPercent(slotData.completedPuzzles)
        }
    }

    // Get current slot data
    getCurrentSlotData() {
        const slot = this.getCurrentSlot()
        const data = this.getAllData()
        let slotData = data.slots[slot] || this.createEmptySlot(slot)
        // Migrate old format if needed
        slotData = this.migrateInfiniteSolved(slotData)
        return slotData
    }

    // Save current slot data
    saveCurrentSlotData(slotData) {
        const slot = this.getCurrentSlot()
        const data = this.getAllData()
        data.slots[slot] = slotData
        this.saveAllData(data)
    }

    // Delete a slot
    deleteSlot(slot) {
        const data = this.getAllData()
        data.slots[slot] = null
        this.saveAllData(data)
    }

    // Check if puzzle is completed
    isPuzzleCompleted(puzzleId) {
        const slotData = this.getCurrentSlotData()
        return slotData.completedPuzzles.includes(puzzleId)
    }

    // Mark puzzle as completed
    markPuzzleCompleted(puzzleId) {
        const slotData = this.getCurrentSlotData()

        if (!slotData.completedPuzzles.includes(puzzleId)) {
            slotData.completedPuzzles.push(puzzleId)
        }

        // Clear progress for completed puzzle
        delete slotData.puzzleProgress[puzzleId]

        this.saveCurrentSlotData(slotData)
    }

    // Get puzzle progress
    getPuzzleProgress(puzzleId) {
        const slotData = this.getCurrentSlotData()
        return slotData.puzzleProgress[puzzleId] || null
    }

    // Save puzzle progress
    savePuzzleProgress(puzzleId, progress) {
        const slotData = this.getCurrentSlotData()
        slotData.puzzleProgress[puzzleId] = progress
        this.saveCurrentSlotData(slotData)
    }

    // Get infinite puzzles solved count (total or by difficulty)
    getInfiniteSolved(difficulty = null) {
        const slotData = this.getCurrentSlotData()
        const solved = slotData.infiniteSolved

        if (difficulty) {
            return solved[difficulty] || 0
        }

        // Return total
        return (solved.easy || 0) + (solved.medium || 0) + (solved.hard || 0)
    }

    // Get infinite solved counts by difficulty
    getInfiniteSolvedByDifficulty() {
        const slotData = this.getCurrentSlotData()
        return {
            easy: slotData.infiniteSolved.easy || 0,
            medium: slotData.infiniteSolved.medium || 0,
            hard: slotData.infiniteSolved.hard || 0
        }
    }

    // Increment infinite puzzles solved for a specific difficulty
    incrementInfiniteSolved(difficulty) {
        const slotData = this.getCurrentSlotData()
        slotData.infiniteSolved[difficulty] = (slotData.infiniteSolved[difficulty] || 0) + 1
        this.saveCurrentSlotData(slotData)
    }

    // Calculate completion percentage
    calculateCompletionPercent(completedPuzzles) {
        // This will be updated when we know total puzzles
        // For now, we'll calculate based on what we have
        const totalPuzzles = this.getTotalPuzzleCount()
        if (totalPuzzles === 0) return 0
        return Math.round((completedPuzzles.length / totalPuzzles) * 100)
    }

    // Get total puzzle count from registry (if available)
    getTotalPuzzleCount() {
        // This needs to be set from the game
        return window._nonoTotalPuzzles || 9 // Default to 9 (3 per difficulty)
    }

    // Set total puzzle count
    static setTotalPuzzleCount(count) {
        window._nonoTotalPuzzles = count
    }

    // Get overall completion percent for current slot
    getCompletionPercent() {
        const slotData = this.getCurrentSlotData()
        return this.calculateCompletionPercent(slotData.completedPuzzles)
    }
}
