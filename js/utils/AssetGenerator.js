// Generate placeholder pixel art assets programmatically
// This allows the game to run without external image files

export class AssetGenerator {
    static generateAssets(scene) {
        // Generate cell sprites
        AssetGenerator.generateCellEmpty(scene)
        AssetGenerator.generateCellFilled(scene)
        AssetGenerator.generateCellMarked(scene)
        AssetGenerator.generateCursor(scene)
        AssetGenerator.generateCheckmark(scene)
        AssetGenerator.generatePanel(scene)
        AssetGenerator.generateButton(scene)
        AssetGenerator.generateButtonSelected(scene)
    }

    static generateCellEmpty(scene) {
        const size = 32
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false })
        graphics.fillStyle(0x222244)
        graphics.fillRect(0, 0, size, size)
        graphics.lineStyle(1, 0x444466)
        graphics.strokeRect(0, 0, size, size)
        graphics.generateTexture("cell_empty", size, size)
        graphics.destroy()
    }

    static generateCellFilled(scene) {
        const size = 32
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false })
        graphics.fillStyle(0x4488ff)
        graphics.fillRect(0, 0, size, size)
        graphics.lineStyle(1, 0x6699ff)
        graphics.strokeRect(0, 0, size, size)
        graphics.generateTexture("cell_filled", size, size)
        graphics.destroy()
    }

    static generateCellMarked(scene) {
        const size = 32
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false })
        graphics.fillStyle(0x222244)
        graphics.fillRect(0, 0, size, size)
        graphics.lineStyle(2, 0xff6666)
        graphics.moveTo(6, 6)
        graphics.lineTo(size - 6, size - 6)
        graphics.moveTo(size - 6, 6)
        graphics.lineTo(6, size - 6)
        graphics.strokePath()
        graphics.generateTexture("cell_marked", size, size)
        graphics.destroy()
    }

    static generateCursor(scene) {
        const size = 36
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false })
        graphics.lineStyle(3, 0x00ff00)
        graphics.strokeRect(2, 2, size - 4, size - 4)
        graphics.generateTexture("cursor", size, size)
        graphics.destroy()
    }

    static generateCheckmark(scene) {
        const size = 24
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false })
        graphics.lineStyle(3, 0x00ff00)
        graphics.moveTo(4, 12)
        graphics.lineTo(10, 18)
        graphics.lineTo(20, 6)
        graphics.strokePath()
        graphics.generateTexture("checkmark", size, size)
        graphics.destroy()
    }

    static generatePanel(scene) {
        const width = 200
        const height = 100
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false })
        graphics.fillStyle(0x333355)
        graphics.fillRoundedRect(0, 0, width, height, 8)
        graphics.lineStyle(2, 0x4444aa)
        graphics.strokeRoundedRect(0, 0, width, height, 8)
        graphics.generateTexture("panel", width, height)
        graphics.destroy()
    }

    static generateButton(scene) {
        const width = 180
        const height = 40
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false })
        graphics.fillStyle(0x333355)
        graphics.fillRoundedRect(0, 0, width, height, 6)
        graphics.lineStyle(2, 0x4444aa)
        graphics.strokeRoundedRect(0, 0, width, height, 6)
        graphics.generateTexture("button", width, height)
        graphics.destroy()
    }

    static generateButtonSelected(scene) {
        const width = 180
        const height = 40
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false })
        graphics.fillStyle(0x444477)
        graphics.fillRoundedRect(0, 0, width, height, 6)
        graphics.lineStyle(3, 0x00ff00)
        graphics.strokeRoundedRect(0, 0, width, height, 6)
        graphics.generateTexture("button_selected", width, height)
        graphics.destroy()
    }

    // Generate placeholder sound data (silent audio)
    static generateSounds(scene) {
        // Create AudioContext for generating sounds
        const audioContext = scene.sound.context

        if (!audioContext) {
            console.log("Audio context not available, sounds will be silent")
            return
        }

        // Generate simple beep sounds
        AssetGenerator.generateBeep(scene, "navigate", 440, 0.05)
        AssetGenerator.generateBeep(scene, "fill", 523, 0.08)
        AssetGenerator.generateBeep(scene, "mark", 349, 0.08)
        AssetGenerator.generateBeep(scene, "select", 659, 0.1)
        AssetGenerator.generateBeep(scene, "error", 220, 0.15)
        AssetGenerator.generateVictorySound(scene)
    }

    static generateBeep(scene, key, frequency, duration) {
        try {
            const audioContext = scene.sound.context
            if (!audioContext) return

            const sampleRate = audioContext.sampleRate
            const samples = sampleRate * duration
            const buffer = audioContext.createBuffer(1, samples, sampleRate)
            const data = buffer.getChannelData(0)

            for (let i = 0; i < samples; i++) {
                const t = i / sampleRate
                // Simple sine wave with fade out
                const envelope = 1 - i / samples
                data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3
            }

            scene.cache.audio.add(key, {
                buffer: buffer,
                duration: duration
            })
        } catch (_e) {
            console.log("Could not generate sound:", key)
        }
    }

    static generateVictorySound(scene) {
        try {
            const audioContext = scene.sound.context
            if (!audioContext) return

            const sampleRate = audioContext.sampleRate
            const duration = 0.5
            const samples = sampleRate * duration
            const buffer = audioContext.createBuffer(1, samples, sampleRate)
            const data = buffer.getChannelData(0)

            // Arpeggio-like victory sound
            const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
            const noteLength = samples / notes.length

            for (let i = 0; i < samples; i++) {
                const t = i / sampleRate
                const noteIndex = Math.floor(i / noteLength)
                const freq = notes[Math.min(noteIndex, notes.length - 1)]
                const envelope = 1 - (i % noteLength) / noteLength
                data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3
            }

            scene.cache.audio.add("victory", {
                buffer: buffer,
                duration: duration
            })
        } catch (_e) {
            console.log("Could not generate victory sound")
        }
    }
}
