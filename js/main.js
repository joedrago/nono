import { BootScene } from "./scenes/BootScene.js"
import { ProfileSelectScene } from "./scenes/ProfileSelectScene.js"
import { MainMenuScene } from "./scenes/MainMenuScene.js"
import { PuzzleSelectScene } from "./scenes/PuzzleSelectScene.js"
import { GameScene } from "./scenes/GameScene.js"
import { VictoryScene } from "./scenes/VictoryScene.js"
import { AchievementsScene } from "./scenes/AchievementsScene.js"
import { ThemeSelectScene } from "./scenes/ThemeSelectScene.js"

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

const game = new Phaser.Game(config)
