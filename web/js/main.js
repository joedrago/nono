import { BootScene } from "./scenes/BootScene.js"
import { ProfileSelectScene } from "./scenes/ProfileSelectScene.js"
import { MainMenuScene } from "./scenes/MainMenuScene.js"
import { PuzzleSelectScene } from "./scenes/PuzzleSelectScene.js"
import { GameScene } from "./scenes/GameScene.js"
import { VictoryScene } from "./scenes/VictoryScene.js"
import { AchievementsScene } from "./scenes/AchievementsScene.js"
import { ThemeSelectScene } from "./scenes/ThemeSelectScene.js"
import { OverlayScene } from "./scenes/OverlayScene.js"
import { RemoteControl } from "./utils/RemoteControl.js"
import { InputManager } from "./utils/InputManager.js"
import { AssetGenerator } from "./utils/AssetGenerator.js"

const params = new URLSearchParams(window.location.search)
const offline = params.get("offline") === "true"

// Detect touch devices (iPhone, iPad, Android)
window.nonoTouchDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

let socket = null
let remoteControl = null

if (offline) {
    console.log("Running in offline mode")
} else {
    import("/socket.io/socket.io.esm.min.js").then((module) => {
        socket = module.io()
        window.nonoSocket = socket
        socket.on("connect", () => {
            console.log("Connected to server:", socket.id)
            // Create RemoteControl only after successful connection
            if (!remoteControl) {
                remoteControl = new RemoteControl(socket)
                window.nonoRemoteControl = remoteControl
            }
        })
    })
}

export { socket, remoteControl }

const config = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#1a1a2e",
    pixelArt: true,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: "100%",
        height: "100%",
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        gamepad: true
    },
    scene: [
        BootScene,
        ProfileSelectScene,
        MainMenuScene,
        PuzzleSelectScene,
        GameScene,
        VictoryScene,
        AchievementsScene,
        ThemeSelectScene,
        OverlayScene
    ]
}

const game = new Phaser.Game(config)

// Create the global InputManager singleton after game is ready
game.events.once("ready", () => {
    const inputManager = new InputManager(game)
    window.nonoInputManager = inputManager

    // Global resize handler - call handleResize on the active scene
    game.scale.on("resize", () => {
        const activeScene = game.scene.getScenes(true)[0]
        if (activeScene && typeof activeScene.handleResize === "function") {
            activeScene.handleResize()
        }
    })

    // Audio unlock - browsers require a user gesture to unlock AudioContext
    // Similar to how Gamepad API requires gesture unlock on iOS Safari
    let audioUnlocked = false
    const unlockAudio = () => {
        if (audioUnlocked) return
        const activeScene = game.scene.getScenes(true)[0]
        if (!activeScene) return

        const context = activeScene.sound.context
        if (context && context.state === "suspended") {
            context.resume().then(() => {
                AssetGenerator.generateSounds(activeScene)
                audioUnlocked = true
            })
        } else if (context && context.state === "running") {
            if (!activeScene.cache.audio.exists("navigate")) {
                AssetGenerator.generateSounds(activeScene)
            }
            audioUnlocked = true
        }
    }

    // Gamepad API on iOS Safari HTTPS requires a user gesture to unlock
    const activateGamepad = () => navigator.getGamepads()

    // Combined unlock handler for both audio and gamepad
    const unlockAll = () => {
        unlockAudio()
        activateGamepad()
    }

    document.addEventListener("touchstart", unlockAll)
    document.addEventListener("mousedown", unlockAll)
    document.addEventListener("keydown", unlockAll)
})
