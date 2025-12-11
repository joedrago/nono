// Achievement definitions and tracking

export const ACHIEVEMENTS = [
    {
        id: "first_solve",
        title: "Baby Steps",
        description: "Complete your first puzzle"
    }
]

export class AchievementManager {
    constructor(saveManager) {
        this.saveManager = saveManager
        this.pendingToasts = [] // Queue of achievements to show as toasts
    }

    // Get all achievements with their unlock status for current profile
    getAllAchievements() {
        const earned = this.getEarnedAchievements()
        return ACHIEVEMENTS.map((achievement) => ({
            ...achievement,
            earned: earned.includes(achievement.id)
        }))
    }

    // Get list of earned achievement IDs for current profile
    getEarnedAchievements() {
        const slotData = this.saveManager.getCurrentSlotData()
        return slotData.achievements || []
    }

    // Check if a specific achievement is earned
    isEarned(achievementId) {
        return this.getEarnedAchievements().includes(achievementId)
    }

    // Grant an achievement to current profile (returns true if newly earned)
    grantAchievement(achievementId) {
        if (this.isEarned(achievementId)) {
            return false // Already earned
        }

        const slotData = this.saveManager.getCurrentSlotData()
        if (!slotData.achievements) {
            slotData.achievements = []
        }
        slotData.achievements.push(achievementId)
        this.saveManager.saveCurrentSlotData(slotData)

        // Queue toast notification
        const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId)
        if (achievement) {
            this.pendingToasts.push(achievement)
        }

        return true
    }

    // Get and clear pending toast notifications
    getPendingToasts() {
        const toasts = [...this.pendingToasts]
        this.pendingToasts = []
        return toasts
    }

    // Check achievements based on game events
    checkFirstSolve() {
        return this.grantAchievement("first_solve")
    }

    // Get count of earned achievements
    getEarnedCount() {
        return this.getEarnedAchievements().length
    }

    // Get total achievement count
    getTotalCount() {
        return ACHIEVEMENTS.length
    }
}
