import { io } from "./lib/socket.io.esm.min.js"
import { BootScene } from "./scenes/BootScene.js"
import { ProfileSelectScene } from "./scenes/ProfileSelectScene.js"
import { MainMenuScene } from "./scenes/MainMenuScene.js"
import { PuzzleSelectScene } from "./scenes/PuzzleSelectScene.js"
import { GameScene } from "./scenes/GameScene.js"
import { VictoryScene } from "./scenes/VictoryScene.js"
import { AchievementsScene } from "./scenes/AchievementsScene.js"
import { ThemeSelectScene } from "./scenes/ThemeSelectScene.js"

const params = new URLSearchParams(window.location.search)
const offline = params.get("offline") === "true"

let socket = null
if (offline) {
    console.log("Running in offline mode")
} else {
    socket = io()
    socket.on("connect", () => {
        console.log("Connected to server:", socket.id)
    })
}

window.nonoSocket = socket
export { socket }

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
        ThemeSelectScene
    ]
}

const _game = new Phaser.Game(config)
