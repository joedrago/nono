#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

// Color palette for different game themes (as decimal numbers)
const COLORS = {
    // Mario colors
    mario_red: 0xff0000,
    mario_skin: 0xffcc99,
    mario_brown: 0x8b4513,
    mario_blue: 0x0000ff,
    mario_yellow: 0xffd700,
    mario_green: 0x228b22,
    mario_orange: 0xff8c00,
    mario_white: 0xffffff,
    goomba_brown: 0x8b6914,
    goomba_tan: 0xd2b48c,
    brick_brown: 0xb5651d,
    pipe_green: 0x00aa00,
    coin_gold: 0xffd700,
    fireflower_red: 0xff4500,
    fireflower_orange: 0xff8c00,
    star_yellow: 0xffff00,

    // Zelda colors
    zelda_green: 0x228b22,
    zelda_gold: 0xffd700,
    zelda_brown: 0x8b4513,
    triforce_gold: 0xffd700,
    rupee_green: 0x00ff00,
    rupee_blue: 0x0000ff,
    heart_red: 0xff0000,
    sword_silver: 0xc0c0c0,
    sword_blue: 0x4169e1,
    link_green: 0x228b22,
    link_skin: 0xffcc99,
    link_brown: 0x8b4513,

    // Pac-Man colors
    pacman_yellow: 0xffff00,
    ghost_red: 0xff0000,
    ghost_pink: 0xffb8ff,
    ghost_cyan: 0x00ffff,
    ghost_orange: 0xffa500,
    ghost_blue: 0x0000ff,
    maze_blue: 0x2121de,

    // Tetris colors
    tetris_cyan: 0x00ffff,
    tetris_yellow: 0xffff00,
    tetris_purple: 0xa020f0,
    tetris_green: 0x00ff00,
    tetris_red: 0xff0000,
    tetris_blue: 0x0000ff,
    tetris_orange: 0xffa500,

    // Space Invader colors
    invader_green: 0x00ff00,
    invader_white: 0xffffff,

    // Sonic colors
    sonic_blue: 0x0066ff,
    sonic_skin: 0xffcc99,
    sonic_red: 0xff0000,
    ring_gold: 0xffd700,

    // Pokemon colors
    pokeball_red: 0xff0000,
    pokeball_white: 0xffffff,
    pokeball_black: 0x000000,
    pikachu_yellow: 0xffff00,
    pikachu_red: 0xff0000,
    pikachu_brown: 0x8b4513,
    greatball_blue: 0x0066ff,

    // Kirby colors
    kirby_pink: 0xffb6c1,
    kirby_red: 0xff0000,

    // Donkey Kong colors
    dk_brown: 0x8b4513,
    dk_tan: 0xd2b48c,
    barrel_brown: 0xa0522d,

    // Mega Man colors
    megaman_blue: 0x00bfff,
    megaman_skin: 0xffcc99,
    megaman_darkblue: 0x0066cc,

    // Metroid colors
    samus_orange: 0xff8c00,
    samus_red: 0xff4500,
    samus_green: 0x00ff00,
    energy_pink: 0xff69b4,

    // Minecraft colors
    creeper_green: 0x00aa00,
    creeper_dark: 0x006600,
    sword_gray: 0x808080,
    sword_brown: 0x8b4513,

    // Castlevania colors
    cross_gold: 0xffd700,
    cross_yellow: 0xffff00,
    bat_purple: 0x4b0082,
    simon_brown: 0x8b4513,
    simon_red: 0xb22222,

    // Frogger colors
    frog_green: 0x32cd32,
    frog_yellow: 0xffff00,

    // Galaga colors
    galaga_white: 0xffffff,
    galaga_red: 0xff0000,
    galaga_blue: 0x0000ff,

    // Bomberman colors
    bomberman_white: 0xffffff,
    bomberman_pink: 0xffb6c1,
    bomberman_blue: 0x4169e1,

    // Other retro colors
    centipede_green: 0x00ff00,
    centipede_red: 0xff0000,
    qbert_orange: 0xff8c00,
    qbert_purple: 0x9932cc,
    digdug_blue: 0x0000ff,
    digdug_white: 0xffffff,
    excitebike_red: 0xff0000,
    excitebike_blue: 0x0000ff,
    duckhunt_brown: 0x8b4513,
    duckhunt_orange: 0xff8c00,
    duckhunt_green: 0x228b22,
    contra_blue: 0x0000ff,
    contra_red: 0xff0000,
    bubble_green: 0x00ff00,
    bubble_blue: 0x00bfff,
    gradius_white: 0xffffff,
    gradius_blue: 0x4169e1,
    punchout_green: 0x00ff00,
    punchout_skin: 0xffcc99,
    ninja_blue: 0x0000ff,
    ninja_black: 0x1a1a1a,
    iceclimber_blue: 0x00bfff,
    iceclimber_pink: 0xffb6c1,
    balloon_red: 0xff0000,
    balloon_pink: 0xffb6c1,
    doubledragon_blue: 0x0000ff,
    doubledragon_skin: 0xffcc99,
    kidicarus_white: 0xffffff,
    kidicarus_skin: 0xffcc99,
    rygar_blue: 0x4169e1,
    rygar_silver: 0xc0c0c0,
    adventure_yellow: 0xffff00,
    adventure_gold: 0xffd700,
    pitfall_green: 0x228b22,
    pitfall_brown: 0x8b4513,
    pitfall_skin: 0xffcc99,
    spyhunter_white: 0xffffff,
    spyhunter_red: 0xff0000,
    defender_green: 0x00ff00,
    defender_white: 0xffffff,
    joust_yellow: 0xffd700,
    joust_red: 0xff0000,
    robotron_blue: 0x00ffff,
    robotron_green: 0x00ff00,
    asteroids_white: 0xffffff,
    pong_white: 0xffffff,
    breakout_red: 0xff0000,
    breakout_orange: 0xffa500,
    breakout_yellow: 0xffff00,
    lemmings_blue: 0x0000ff,
    lemmings_green: 0x00ff00,
    arthur_silver: 0xc0c0c0,
    arthur_red: 0xb22222
}

// Map puzzle names to color schemes
function getColorScheme(puzzleName, fileName) {
    const name = puzzleName.toLowerCase()
    const file = fileName.toLowerCase()

    // Mario related
    if (name.includes("mushroom")) {
        return { primary: COLORS.mario_red, secondary: COLORS.mario_white, accent: COLORS.mario_skin }
    }
    if (name.includes("mario") && (name.includes("full") || name.includes("face"))) {
        return { primary: COLORS.mario_red, secondary: COLORS.mario_skin, accent: COLORS.mario_blue }
    }
    if (name.includes("coin")) {
        return { primary: COLORS.coin_gold }
    }
    if (name.includes("star") && name.includes("mario")) {
        return { primary: COLORS.star_yellow }
    }
    if (name.includes("pipe")) {
        return { primary: COLORS.pipe_green }
    }
    if (name.includes("brick")) {
        return { primary: COLORS.brick_brown }
    }
    if (name.includes("fireflower")) {
        return { primary: COLORS.fireflower_red, secondary: COLORS.fireflower_orange }
    }
    if (name.includes("goomba")) {
        return { primary: COLORS.goomba_brown, secondary: COLORS.goomba_tan }
    }

    // Zelda related
    if (name.includes("heart") || file.includes("heart")) {
        return { primary: COLORS.heart_red }
    }
    if (name.includes("triforce")) {
        return { primary: COLORS.triforce_gold }
    }
    if (name.includes("rupee")) {
        return { primary: COLORS.rupee_green }
    }
    if (name.includes("sword") && name.includes("zelda")) {
        return { primary: COLORS.sword_silver, secondary: COLORS.sword_blue }
    }
    if (name.includes("link") && (name.includes("shield") || name.includes("full"))) {
        return { primary: COLORS.link_green, secondary: COLORS.link_skin, accent: COLORS.link_brown }
    }

    // Pac-Man related
    if (name.includes("pac") && !name.includes("ghost")) {
        return { primary: COLORS.pacman_yellow }
    }
    if (name.includes("ghost") && !name.includes("goblins")) {
        return { primary: COLORS.ghost_cyan, secondary: COLORS.ghost_blue }
    }
    if (name.includes("maze")) {
        return { primary: COLORS.pacman_yellow, secondary: COLORS.maze_blue }
    }

    // Tetris related
    if (name.includes("tetris") && name.includes("t-block")) {
        return { primary: COLORS.tetris_purple }
    }
    if (name.includes("tetris") && name.includes("l")) {
        return { primary: COLORS.tetris_orange }
    }
    if (name.includes("tetris") && name.includes("s")) {
        return { primary: COLORS.tetris_green }
    }
    if (name.includes("tetris") && name.includes("i")) {
        return { primary: COLORS.tetris_cyan }
    }
    if (name.includes("tetris") && name.includes("o")) {
        return { primary: COLORS.tetris_yellow }
    }
    if (name.includes("tetris")) {
        return { primary: COLORS.tetris_cyan, secondary: COLORS.tetris_purple, accent: COLORS.tetris_orange }
    }

    // Space Invader
    if (name.includes("invader") || name.includes("space invader")) {
        return { primary: COLORS.invader_green }
    }

    // Sonic related
    if (name.includes("sonic")) {
        return { primary: COLORS.sonic_blue, secondary: COLORS.sonic_skin }
    }
    if (name.includes("ring") && name.includes("sonic")) {
        return { primary: COLORS.ring_gold }
    }

    // Pokemon related
    if (name.includes("pokeball") || name.includes("pokemon ball") || file.includes("pokemon_ball")) {
        return { primary: COLORS.pokeball_red, secondary: COLORS.pokeball_white }
    }
    if (name.includes("greatball")) {
        return { primary: COLORS.greatball_blue, secondary: COLORS.pokeball_white }
    }
    if (name.includes("pikachu")) {
        return { primary: COLORS.pikachu_yellow, secondary: COLORS.pikachu_red }
    }

    // Kirby
    if (name.includes("kirby")) {
        return { primary: COLORS.kirby_pink, secondary: COLORS.kirby_red }
    }

    // Donkey Kong
    if (name.includes("donkey kong") || name.includes("dk")) {
        return { primary: COLORS.dk_brown, secondary: COLORS.dk_tan }
    }
    if (name.includes("barrel")) {
        return { primary: COLORS.barrel_brown }
    }

    // Mega Man
    if (name.includes("mega") || name.includes("megaman")) {
        return { primary: COLORS.megaman_blue, secondary: COLORS.megaman_skin }
    }

    // Metroid
    if (name.includes("samus") || (name.includes("metroid") && !name.includes("energy"))) {
        return { primary: COLORS.samus_orange, secondary: COLORS.samus_red }
    }
    if (name.includes("energy") && name.includes("metroid")) {
        return { primary: COLORS.energy_pink }
    }

    // Minecraft
    if (name.includes("creeper")) {
        return { primary: COLORS.creeper_green, secondary: COLORS.creeper_dark }
    }
    if (name.includes("minecraft") && name.includes("sword")) {
        return { primary: COLORS.sword_gray, secondary: COLORS.sword_brown }
    }

    // Castlevania
    if (name.includes("castlevania") && name.includes("cross")) {
        return { primary: COLORS.cross_gold }
    }
    if (name.includes("bat")) {
        return { primary: COLORS.bat_purple }
    }
    if (name.includes("simon")) {
        return { primary: COLORS.simon_brown, secondary: COLORS.simon_red }
    }

    // Frogger
    if (name.includes("frogger") || name.includes("frog")) {
        return { primary: COLORS.frog_green, secondary: COLORS.frog_yellow }
    }

    // Galaga
    if (name.includes("galaga")) {
        return { primary: COLORS.galaga_white, secondary: COLORS.galaga_red }
    }

    // Bomberman
    if (name.includes("bomberman")) {
        return { primary: COLORS.bomberman_white, secondary: COLORS.bomberman_pink }
    }

    // Centipede
    if (name.includes("centipede")) {
        return { primary: COLORS.centipede_green, secondary: COLORS.centipede_red }
    }

    // Q*bert
    if (name.includes("qbert") || name.includes("q*bert")) {
        return { primary: COLORS.qbert_orange, secondary: COLORS.qbert_purple }
    }

    // Dig Dug
    if (name.includes("dig dug") || name.includes("digdug")) {
        return { primary: COLORS.digdug_blue, secondary: COLORS.digdug_white }
    }

    // Excitebike
    if (name.includes("excitebike")) {
        return { primary: COLORS.excitebike_red, secondary: COLORS.excitebike_blue }
    }

    // Duck Hunt
    if (name.includes("duck")) {
        return { primary: COLORS.duckhunt_brown, secondary: COLORS.duckhunt_orange }
    }

    // Contra
    if (name.includes("contra")) {
        return { primary: COLORS.contra_blue, secondary: COLORS.contra_red }
    }

    // Bubble Bobble
    if (name.includes("bubble")) {
        return { primary: COLORS.bubble_green, secondary: COLORS.bubble_blue }
    }

    // Gradius
    if (name.includes("gradius")) {
        return { primary: COLORS.gradius_white, secondary: COLORS.gradius_blue }
    }

    // Punch-Out
    if (name.includes("punch")) {
        return { primary: COLORS.punchout_green, secondary: COLORS.punchout_skin }
    }

    // Ninja Gaiden
    if (name.includes("ninja")) {
        return { primary: COLORS.ninja_blue, secondary: COLORS.ninja_black }
    }

    // Ice Climber
    if (name.includes("ice climber") || name.includes("popo")) {
        return { primary: COLORS.iceclimber_blue, secondary: COLORS.iceclimber_pink }
    }

    // Balloon Fight
    if (name.includes("balloon")) {
        return { primary: COLORS.balloon_red, secondary: COLORS.balloon_pink }
    }

    // Double Dragon
    if (name.includes("double dragon") || name.includes("billy")) {
        return { primary: COLORS.doubledragon_blue, secondary: COLORS.doubledragon_skin }
    }

    // Kid Icarus
    if (name.includes("kid icarus") || name.includes("pit")) {
        return { primary: COLORS.kidicarus_white, secondary: COLORS.kidicarus_skin }
    }

    // Rygar
    if (name.includes("rygar")) {
        return { primary: COLORS.rygar_blue, secondary: COLORS.rygar_silver }
    }

    // Adventure
    if (name.includes("adventure")) {
        return { primary: COLORS.adventure_yellow, secondary: COLORS.adventure_gold }
    }

    // Pitfall
    if (name.includes("pitfall") || name.includes("harry")) {
        return { primary: COLORS.pitfall_green, secondary: COLORS.pitfall_skin }
    }
    if (name.includes("vine")) {
        return { primary: COLORS.pitfall_green }
    }

    // Spy Hunter
    if (name.includes("spy hunter") || name.includes("spyhunter")) {
        return { primary: COLORS.spyhunter_white, secondary: COLORS.spyhunter_red }
    }

    // Defender
    if (name.includes("defender")) {
        return { primary: COLORS.defender_green, secondary: COLORS.defender_white }
    }

    // Joust
    if (name.includes("joust")) {
        return { primary: COLORS.joust_yellow, secondary: COLORS.joust_red }
    }

    // Robotron
    if (name.includes("robotron")) {
        return { primary: COLORS.robotron_blue, secondary: COLORS.robotron_green }
    }

    // Asteroids
    if (name.includes("asteroid")) {
        return { primary: COLORS.asteroids_white }
    }

    // Pong
    if (name.includes("pong") || name.includes("paddle")) {
        return { primary: COLORS.pong_white }
    }

    // Breakout
    if (name.includes("breakout")) {
        return { primary: COLORS.breakout_red, secondary: COLORS.breakout_orange, accent: COLORS.breakout_yellow }
    }

    // Lemmings
    if (name.includes("lemming")) {
        return { primary: COLORS.lemmings_blue, secondary: COLORS.lemmings_green }
    }

    // Ghosts 'n Goblins (Arthur)
    if (name.includes("ghost") && name.includes("goblin")) {
        return { primary: COLORS.arthur_silver, secondary: COLORS.arthur_red }
    }
    if (name.includes("arthur")) {
        return { primary: COLORS.arthur_silver, secondary: COLORS.arthur_red }
    }

    // Default - use a nice blue
    return { primary: 0x4169e1 }
}

// Generate picture array from solution and color scheme
function generatePicture(solution, colorScheme) {
    const picture = []
    const { primary, secondary, accent } = colorScheme
    const colors = [primary]
    if (secondary) colors.push(secondary)
    if (accent) colors.push(accent)

    for (let y = 0; y < solution.length; y++) {
        picture[y] = []
        for (let x = 0; x < solution[y].length; x++) {
            if (solution[y][x] === 1) {
                // For multi-color schemes, use a pattern based on position
                if (colors.length === 1) {
                    picture[y][x] = colors[0]
                } else if (colors.length === 2) {
                    // Alternate by position or use primary mostly
                    const useSecondary = (x + y) % 5 === 0
                    picture[y][x] = useSecondary ? colors[1] : colors[0]
                } else {
                    // Three colors - create a gradient effect
                    const third = Math.floor(solution.length / 3)
                    if (y < third) {
                        picture[y][x] = colors[0]
                    } else if (y < third * 2) {
                        picture[y][x] = colors[1]
                    } else {
                        picture[y][x] = colors[2] || colors[1]
                    }
                }
            } else {
                picture[y][x] = 0
            }
        }
    }
    return picture
}

// Process a single puzzle file
function processPuzzle(filePath) {
    const content = fs.readFileSync(filePath, "utf8")
    const puzzle = JSON.parse(content)

    // Skip if already has picture
    if (puzzle.picture) {
        console.log(`Skipping ${path.basename(filePath)} - already has picture`)
        return false
    }

    const colorScheme = getColorScheme(puzzle.name, path.basename(filePath))
    puzzle.picture = generatePicture(puzzle.solution, colorScheme)

    // Write back with pretty formatting
    fs.writeFileSync(filePath, JSON.stringify(puzzle, null, 4) + "\n")
    console.log(`Updated ${path.basename(filePath)} with colors: ${Object.keys(colorScheme).map((k) => `${k}=${colorScheme[k].toString(16)}`).join(", ")}`)
    return true
}

// Main
const puzzleDir = path.join(__dirname, "..", "web", "puzzles")
const difficulties = ["easy", "medium", "hard"]
let updated = 0
let skipped = 0

for (const difficulty of difficulties) {
    const dir = path.join(puzzleDir, difficulty)
    if (!fs.existsSync(dir)) continue

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
    for (const file of files) {
        const filePath = path.join(dir, file)
        if (processPuzzle(filePath)) {
            updated++
        } else {
            skipped++
        }
    }
}

console.log(`\nDone! Updated ${updated} puzzles, skipped ${skipped}`)
